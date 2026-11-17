/**
 * The app's small backend: the AmaliAI proxy and the team passcode.
 *
 * It runs in two places with the same code:
 *  - locally, inside the Vite dev/preview server (server/amaliai.ts), reading .env
 *  - on Vercel, as serverless functions (api/*.ts), reading Vercel's
 *    Environment Variables
 *
 * The browser never sees the API key: it calls /api/ai/*, and this code adds
 * the key and forwards the request to AmaliAI's OpenAI-compatible API.
 *
 * Task routing: each request names a job (write, extract, assist, factcheck)
 * and AMALIAI_MODEL_<JOB> says which model does it, plus backups to try if it
 * fails: AMALIAI_MODEL_WRITE=main-model,backup-1,backup-2.
 *
 * Passcode: when APP_PASSCODE is set, every /api/ai/* call needs the signed
 * cookie that POST /api/auth hands out for the right passcode. With no
 * APP_PASSCODE (the usual local setup) the app is open.
 *
 *   GET  /api/auth       → { required, ok }
 *   POST /api/auth       → body { passcode } → sets the cookie, or 401
 *   GET  /api/ai/status  → { configured, host, routing }
 *   GET  /api/ai/models  → { models: string[] }
 *   POST /api/ai/chat    → body { job, messages, model?, temperature? }
 *                          returns { content, model, tried: [{ model, error }] }
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type Env = Record<string, string | undefined>;

const TIMEOUT_MS = 90_000;
/** How long one model gets per request. Fact checking reads several sections against all the facts, so it gets longer. */
const JOB_TIMEOUT_MS: Record<string, number> = { factcheck: 150_000 };
/** Stop trying backups after this long, so a request finishes inside Vercel's 300-second limit. */
const TOTAL_BUDGET_MS = 270_000;
/** Models that can't write text (embeddings, moderation, audio, images), hidden from the picker. */
const NOT_CHAT = /embedding|moderation|whisper|tts|transcribe|dall-e|image/i;
const JOBS = ['write', 'extract', 'assist', 'factcheck'] as const;
type Job = (typeof JOBS)[number];
type Routing = Record<Job, { model: string; backups: string[] }>;

const COOKIE = 'bpg_access';
const SESSION_DAYS = 14;

/** Used for any job whose AMALIAI_MODEL_<JOB> setting is missing: main model first, then backups. */
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
  passcode: string;
  secret: string;
}

function readConfig(env: Env): Config {
  const routing = {} as Routing;
  for (const job of JOBS) {
    const list = (env[`AMALIAI_MODEL_${job.toUpperCase()}`]?.trim() || DEFAULT_MODELS[job])
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    routing[job] = { model: list[0], backups: list.slice(1) };
  }
  const passcode = (env.APP_PASSCODE ?? '').trim();
  return {
    baseUrl: (env.AMALIAI_BASE_URL ?? '').trim().replace(/\/+$/, ''),
    apiKey: (env.AMALIAI_API_KEY ?? '').trim(),
    routing,
    passcode,
    // A separate AUTH_SECRET lets you change the passcode without logging everyone out, and vice versa.
    secret: (env.AUTH_SECRET ?? '').trim() || passcode,
  };
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  // Vercel may have parsed the body already; the Vite server hands over the raw stream.
  const pre = (req as IncomingMessage & { body?: unknown }).body;
  if (pre && typeof pre === 'object' && !Buffer.isBuffer(pre)) return pre as Record<string, unknown>;
  if (typeof pre === 'string') return pre ? JSON.parse(pre) : {};
  if (Buffer.isBuffer(pre)) return pre.length ? JSON.parse(pre.toString('utf8')) : {};
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

// ─── Passcode ──────────────────────────────────────────────────────────────

const sign = (secret: string, value: string) => createHmac('sha256', secret).update(value).digest('base64url');

function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function readCookie(req: IncomingMessage, name: string) {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

function hasAccess(req: IncomingMessage, cfg: Config) {
  if (!cfg.passcode) return true;
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const [exp, mac] = token.split('.');
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return sameText(mac, sign(cfg.secret, exp));
}

function accessCookie(req: IncomingMessage, cfg: Config) {
  const exp = String(Date.now() + SESSION_DAYS * 86_400_000);
  const https = req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE}=${exp}.${sign(cfg.secret, exp)}; Path=/; Max-Age=${SESSION_DAYS * 86_400}; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`;
}

// ─── AmaliAI ───────────────────────────────────────────────────────────────

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
      return await upstream(
        cfg,
        '/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify({ model, messages, ...(withTemp && typeof temperature === 'number' ? { temperature } : {}) }),
        },
        timeoutMs,
      );
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

// ─── Router ────────────────────────────────────────────────────────────────

/** Handles /api/auth and /api/ai/*. Returns false for any other path, so the caller can pass it on. */
export async function handleApi(req: IncomingMessage, res: ServerResponse, env: Env): Promise<boolean> {
  const url = req.url?.split('?')[0] ?? '';
  if (url !== '/api/auth' && !url.startsWith('/api/ai/')) return false;
  const cfg = readConfig(env);

  try {
    if (url === '/api/auth') {
      if (req.method === 'GET') {
        send(res, 200, { required: Boolean(cfg.passcode), ok: hasAccess(req, cfg) });
        return true;
      }
      if (req.method === 'POST') {
        if (!cfg.passcode) {
          send(res, 200, { required: false, ok: true });
          return true;
        }
        const body = await readJson(req);
        const given = typeof body.passcode === 'string' ? body.passcode.trim() : '';
        if (!given || !sameText(sign(cfg.secret, given), sign(cfg.secret, cfg.passcode))) {
          // A short pause makes guessing slow.
          await new Promise((r) => setTimeout(r, 700));
          send(res, 401, { error: 'That passcode is not right.' });
          return true;
        }
        send(res, 200, { required: true, ok: true }, { 'Set-Cookie': accessCookie(req, cfg) });
        return true;
      }
      send(res, 405, { error: 'Method not allowed' });
      return true;
    }

    if (!hasAccess(req, cfg)) {
      send(res, 401, { error: 'Enter the team passcode to use the AI.' });
      return true;
    }

    if (url === '/api/ai/status' && req.method === 'GET') {
      send(res, 200, {
        configured: Boolean(cfg.baseUrl && cfg.apiKey),
        host: cfg.baseUrl ? new URL(cfg.baseUrl).host : null,
        routing: cfg.routing,
      });
      return true;
    }

    if (!cfg.baseUrl) {
      send(res, 503, { error: 'AMALIAI_BASE_URL is not set' });
      return true;
    }

    if (url === '/api/ai/models' && req.method === 'GET') {
      const r = await upstream(cfg, '/models');
      const text = await r.text();
      if (!r.ok) {
        send(res, r.status, { error: upstreamError(r.status, text) });
        return true;
      }
      const ids = ((JSON.parse(text)?.data ?? []) as { id: string }[])
        .map((m) => m.id)
        .filter((id) => !NOT_CHAT.test(id))
        .sort();
      send(res, 200, { models: ids });
      return true;
    }

    if (url === '/api/ai/chat' && req.method === 'POST') {
      if (!cfg.apiKey) {
        send(res, 503, { error: 'AMALIAI_API_KEY is not set' });
        return true;
      }
      const body = await readJson(req);
      const job = JOBS.find((j) => j === body.job);
      if (!job) {
        send(res, 400, { error: `Unknown job "${String(body.job)}"` });
        return true;
      }
      const route = cfg.routing[job];
      const first = typeof body.model === 'string' && body.model ? body.model : route.model;
      const chain = [...new Set([first, route.model, ...route.backups])];
      const started = Date.now();
      const perModel = JOB_TIMEOUT_MS[job] ?? TIMEOUT_MS;

      const tried: { model: string; error: string }[] = [];
      for (const model of chain) {
        const left = TOTAL_BUDGET_MS - (Date.now() - started);
        if (tried.length && left < 20_000) {
          tried.push({ model, error: 'skipped: out of time' });
          break;
        }
        try {
          const content = await complete(cfg, model, body.messages, body.temperature, Math.min(perModel, left));
          send(res, 200, { content, model, tried });
          return true;
        } catch (e) {
          if (e instanceof StopError) {
            send(res, e.status, { error: e.message, tried });
            return true;
          }
          tried.push({ model, error: e instanceof Error ? e.message : String(e) });
        }
      }
      send(res, 502, { error: `Every model for "${job}" failed: ${tried.map((t) => `${t.model} (${t.error})`).join('; ')}`, tried });
      return true;
    }

    send(res, 404, { error: 'Unknown API endpoint' });
    return true;
  } catch (e) {
    send(res, 502, { error: networkMessage(e, cfg) });
    return true;
  }
}
