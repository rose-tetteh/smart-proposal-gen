/**
 * Which engine is running, which model does each job, and the one call the
 * live engine makes.
 *
 * The browser only ever talks to the local proxy (/api/ai/*, see
 * server/amaliai.ts), which holds the AmaliAI key and the job-to-model
 * routing from .env. State here drives the engine badge and the per-job
 * model picker; a pick in the picker overrides .env in this
 * browser only, for testing.
 */
import { useSyncExternalStore } from 'react';

export type Job = 'write' | 'extract' | 'assist' | 'factcheck';
export type Routing = Record<Job, { model: string; backups: string[] }>;

export const JOBS: { id: Job; label: string; hint: string }[] = [
  { id: 'write', label: 'Writing sections', hint: 'Client-facing drafts' },
  { id: 'extract', label: 'Reading the RFP', hint: 'Details and requirements' },
  { id: 'assist', label: 'Chat and rewrites', hint: 'Also win themes' },
  { id: 'factcheck', label: 'Fact check', hint: 'Second pair of eyes before export' },
];

export const jobLabel = (job: Job) => JOBS.find((j) => j.id === job)!.label;

export interface EngineState {
  mode: 'checking' | 'live' | 'offline';
  host: string | null;
  routing: Routing | null;
  /** Per-job model picks that override .env in this browser. */
  overrides: Partial<Record<Job, string>>;
  models: string[];
  /** Why we are offline, e.g. "No AmaliAI key in .env". */
  reason?: string;
  /** Set when the last live request needed a backup model or the offline engine. */
  lastFallback?: string;
}

const OVERRIDE_KEY = 'bpg.ai.overrides';
const MAX_PARALLEL = 4;

let state: EngineState = { mode: 'checking', host: null, routing: null, overrides: {}, models: [] };
const listeners = new Set<() => void>();

function set(patch: Partial<EngineState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getEngine = () => state;

export function useEngine() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getEngine,
  );
}

/** The model that will be asked first for a job. */
export function modelFor(job: Job, e: EngineState = state) {
  return e.overrides[job] ?? e.routing?.[job].model ?? null;
}

function loadOverrides(): Partial<Record<Job, string>> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Pick a model for one job, or pass null to go back to .env. */
export function chooseModel(job: Job, model: string | null) {
  const overrides = { ...state.overrides };
  if (model && model !== state.routing?.[job].model) overrides[job] = model;
  else delete overrides[job];
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
  } catch {
    /* private mode: the choice just won't survive a reload */
  }
  set({ overrides, lastFallback: undefined });
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j as T;
}

export async function checkEngine() {
  set({ mode: 'checking', reason: undefined, lastFallback: undefined });
  let s: { configured: boolean; host: string | null; routing: Routing };
  try {
    s = await getJson('/api/ai/status');
  } catch {
    return set({ mode: 'offline', routing: null, reason: 'AI proxy not reachable (static build?)' });
  }
  if (!s.configured) return set({ mode: 'offline', host: null, routing: s.routing, reason: 'No AmaliAI URL or key in .env' });
  const models = await getJson<{ models: string[] }>('/api/ai/models')
    .then((m) => m.models)
    .catch(() => [] as string[]);
  // Drop picks for models this key can no longer use.
  const overrides = Object.fromEntries(Object.entries(loadOverrides()).filter(([, m]) => !models.length || models.includes(m)));
  set({ mode: 'live', host: s.host, routing: s.routing, models, overrides });
}

// ─── Live calls ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class EngineError extends Error {
  constructor(
    message: string,
    /** True when retrying won't help (bad key, spending cap, missing config). */
    readonly fatal: boolean,
  ) {
    super(message);
  }
}

let running = 0;
const queue: (() => void)[] = [];

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => queue.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

/** Sends one request for a job; the proxy picks the model and tries backups. Resolves with the reply and the model that wrote it. */
export function chat(job: Job, messages: ChatMessage[], opts: { temperature?: number } = {}): Promise<{ content: string; model: string }> {
  return slot(async () => {
    const r = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, model: state.overrides[job], messages, temperature: opts.temperature }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new EngineError(j.error ?? `AmaliAI request failed (${r.status})`, [400, 401, 403, 429, 503].includes(r.status));
    const tried = (j.tried ?? []) as { model: string; error: string }[];
    if (tried.length) {
      const why = tried.map((t) => `${t.model} failed (${t.error})`).join('; ');
      console.warn(`[AI] ${job}: used backup ${j.model}. ${why}`);
      set({ lastFallback: `${jobLabel(job)} used backup ${j.model}: ${why}` });
    } else if (state.lastFallback) set({ lastFallback: undefined });
    return { content: j.content as string, model: j.model as string };
  });
}

/** Records a failed live call. Fatal errors switch the whole app to the offline engine. */
export function reportFailure(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.warn('[AI] live request failed, using offline engine:', msg);
  if (e instanceof EngineError && e.fatal) set({ mode: 'offline', reason: msg });
  else set({ lastFallback: `Used the offline engine: ${msg}` });
}
