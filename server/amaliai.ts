/**
 * AmaliAI proxy, mounted inside the Vite dev and preview servers.
 *
 * The browser never sees the API key: it calls /api/ai/*, and this middleware
 * adds the key from .env and forwards the request to AmaliAI's
 * OpenAI-compatible API.
 *
 * Task routing: each request names a job (write, extract, assist, factcheck)
 * and .env says which model does that job, plus backups to try if it fails:
 * AMALIAI_MODEL_WRITE=main-model,backup-1,backup-2. .env is re-read on every
 * request, so editing it takes effect without restarting the server.
 *
 *   GET  /api/ai/status  → { configured, host, routing }
 *   GET  /api/ai/models  → { models: string[] }
 *   POST /api/ai/chat    → body { job, messages, model?, temperature? }
 *                          returns { content, model, tried: [{ model, error }] }
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Connect, type Plugin } from 'vite';

const TIMEOUT_MS = 90_000;
/** How long one model gets per request. Fact checking reads several sections against all of Bastion's facts, so it gets longer. */
const JOB_TIMEOUT_MS: Record<string, number> = { factcheck: 150_000 };
/** Models that can't write text (embeddings, moderation, audio, images), hidden from the picker. */
const NOT_CHAT = /embedding|moderation|whisper|tts|transcribe|dall-e|image/i;
const JOBS = ['write', 'extract', 'assist', 'factcheck'] as const;
type Job = (typeof JOBS)[number];
type Routing = Record<Job, { model: string; backups: string[] }>;

/** Used for any job whose AMALIAI_MODEL_<JOB> line is missing from .env: main model first, then backups. */
const DEFAULT_MODELS: Record<Job, string> = {
  write: 'gpt-5.6-terra,gpt-5.6-luna,qwen3p8-max',
  extract: 'gpt-5.6-terra,qwen3p8-max',
  assist: 'gpt-5.6-luna,gpt-5.6-terra,deepseek-v4p1-flash',
  factcheck: 'glm-5p3-flash,qwen3p8-max',
};

interface Config {
  baseUrl: string;
  apiKey: string;
  routing: Routing;
}

function readConfig(envDir: string, mode: string): Config {
  const env = loadEnv(mode, envDir, 'AMALIAI_');
  const routing = {} as Routing;
  for (const job of JOBS) {
    const list = (env[`AMALIAI_MODEL_${job.toUpperCase()}`]?.trim() || DEFAULT_MODELS[job])
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    routing[job] = { model: list[0], backups: list.slice(1) };
  }
  return {
    baseUrl: (env.AMALIAI_BASE_URL ?? '').trim().replace(/\/+$/, ''),
    apiKey: (env.AMALIAI_API_KEY ?? '').trim(),
    routing,
  };
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

/** Pulls the human-readable message out of an OpenAI-style error body. */
function upstreamError(status: number, text: string) {
  try {
    const j = JSON.parse(text);
    return j?.error?.message ?? j?.message ?? `AmaliAI returned ${status}`;
  } catch {
    return `AmaliAI returned ${status}`;
  }
}

async function upstream(cfg: Config, urlPath: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS) {
  return fetch(`${cfg.baseUrl}${urlPath}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function networkMessage(e: unknown, cfg: Config) {
  const err = e instanceof Error ? e : new Error(String(e));
  if (err.name === 'TimeoutError') return 'AmaliAI did not answer in time';
  if (err.message === 'fetch failed') return `Could not reach AmaliAI at ${cfg.baseUrl}`;
  return err.message;
}

/** A failure that no other model can fix: bad key, spending cap, AmaliAI unreachable. */
class StopError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** One model, one attempt. Retries once without sampling settings if the model rejects them. */
async function complete(cfg: Config, model: string, messages: unknown, temperature: unknown, timeoutMs: number): Promise<string> {
  const call = async (withTemp: boolean) => {
    try {
      return await upstream(cfg, '/chat/completions', {
        method: 'POST',
        body: JSON.stringify({ model, messages, ...(withTemp && typeof temperature === 'number' ? { temperature } : {}) }),
      }, timeoutMs);
    } catch (e) {
      const msg = networkMessage(e, cfg);
      // A timeout may be one slow model; an unreachable host affects every model.
      if (msg.startsWith('Could not reach')) throw new StopError(msg, 502);
      throw new Error(msg);
    }
  };
  let r = await call(true);
  let text = await r.text();
  // Some reasoning models only accept their default temperature.
  if (r.status === 400 && /temperature|unsupported (parameter|value)/i.test(text)) {
    r = await call(false);
    text = await r.text();
  }
  if ([401, 403, 429].includes(r.status)) throw new StopError(upstreamError(r.status, text), r.status);
  if (!r.ok) throw new Error(upstreamError(r.status, text));
  const content = JSON.parse(text)?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('returned an empty answer');
  return content;
}

function middleware(envDir: string, mode: string): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url?.split('?')[0];
    if (!url?.startsWith('/api/ai/')) return next();
    const cfg = readConfig(envDir, mode);

    try {
      if (url === '/api/ai/status' && req.method === 'GET') {
        return send(res, 200, {
          configured: Boolean(cfg.baseUrl && cfg.apiKey),
          host: cfg.baseUrl ? new URL(cfg.baseUrl).host : null,
          routing: cfg.routing,
        });
      }

      if (!cfg.baseUrl) return send(res, 503, { error: 'AMALIAI_BASE_URL is not set in .env' });

      if (url === '/api/ai/models' && req.method === 'GET') {
        const r = await upstream(cfg, '/models');
        const text = await r.text();
        if (!r.ok) return send(res, r.status, { error: upstreamError(r.status, text) });
        const ids = ((JSON.parse(text)?.data ?? []) as { id: string }[])
          .map((m) => m.id)
          .filter((id) => !NOT_CHAT.test(id))
          .sort();
        return send(res, 200, { models: ids });
      }

      if (url === '/api/ai/chat' && req.method === 'POST') {
        if (!cfg.apiKey) return send(res, 503, { error: 'AMALIAI_API_KEY is not set in .env' });
        const body = await readJson(req);
        const job = JOBS.find((j) => j === body.job);
        if (!job) return send(res, 400, { error: `Unknown job "${String(body.job)}"` });
        const route = cfg.routing[job];
        const first = typeof body.model === 'string' && body.model ? body.model : route.model;
        const chain = [...new Set([first, route.model, ...route.backups])];

        const tried: { model: string; error: string }[] = [];
        for (const model of chain) {
          try {
            const content = await complete(cfg, model, body.messages, body.temperature, JOB_TIMEOUT_MS[job] ?? TIMEOUT_MS);
            return send(res, 200, { content, model, tried });
          } catch (e) {
            if (e instanceof StopError) return send(res, e.status, { error: e.message, tried });
            tried.push({ model, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return send(res, 502, { error: `Every model for "${job}" failed: ${tried.map((t) => `${t.model} (${t.error})`).join('; ')}`, tried });
      }

      return send(res, 404, { error: 'Unknown AI endpoint' });
    } catch (e) {
      return send(res, 502, { error: networkMessage(e, cfg) });
    }
  };
}

export function amaliaiProxy(): Plugin {
  let envDir = process.cwd();
  let mode = 'development';
  return {
    name: 'amaliai-proxy',
    configResolved(c) {
      envDir = c.envDir || c.root;
      mode = c.mode;
    },
    configureServer(server) {
      server.middlewares.use(middleware(envDir, mode));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(envDir, mode));
    },
  };
}
