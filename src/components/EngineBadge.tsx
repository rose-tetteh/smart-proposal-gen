/** Shows which AI engine is answering (live AmaliAI or offline) and which model does each job, with a per-job picker for approvers. */
import { useState } from 'react';
import { checkEngine, chooseModel, JOBS, modelFor, useEngine, type EngineState } from '@/ai/engine';
import { useStore } from '@/lib/store';
import { ChevronDown, RefreshIcon, SparkIcon } from './icons';

function dot(e: EngineState) {
  if (e.mode === 'checking') return 'bg-ink-muted animate-pulse';
  if (e.mode === 'offline') return 'bg-ink-muted';
  return e.lastFallback ? 'bg-amber' : 'bg-ok';
}

/** Names the writing model: it produces everything the client reads. */
export function engineLabel(e: EngineState) {
  if (e.mode === 'checking') return 'Checking AI…';
  if (e.mode === 'offline') return 'Offline engine';
  return `Live AI · ${modelFor('write', e)}`;
}

function tooltip(e: EngineState) {
  if (e.mode === 'offline') return e.reason;
  if (e.lastFallback) return e.lastFallback;
  if (e.mode === 'live') return JOBS.map((j) => `${j.label}: ${modelFor(j.id, e)}`).join('\n');
  return undefined;
}

/** Compact pill for headers. */
export function EngineChip({ className = '' }: { className?: string }) {
  const e = useEngine();
  return (
    <span
      title={tooltip(e)}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full bg-paper-raised px-2 py-0.5 text-[11px] font-semibold text-ink-secondary ring-1 ring-rule ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot(e)}`} />
      <span className="truncate">{engineLabel(e)}</span>
    </span>
  );
}

/** Short status for the "AI models" control: the writing model, or why there is none. */
function shortStatus(e: EngineState) {
  if (e.mode === 'checking') return 'Checking…';
  if (e.mode === 'offline') return 'Offline';
  return modelFor('write', e);
}

/**
 * The "AI models" control: status, which model does each job, and a re-check button.
 * `sidebar` and `rail` open upward from the bottom of the nav; `header` opens downward from the top bar.
 */
export function EngineBadge({ variant = 'sidebar' }: { variant?: 'sidebar' | 'rail' | 'header' }) {
  const e = useEngine();
  const { user } = useStore();
  // Model choice affects every proposal written in this browser, so only approvers can change it.
  const canEdit = !!user?.canApprove;
  const [open, setOpen] = useState(false);
  const note = e.mode === 'offline' ? e.reason : e.lastFallback;

  return (
    <div className="relative">
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className={`pop-in absolute z-40 w-[290px] max-w-[calc(100vw-24px)] overflow-hidden ${variant === 'header' ? 'right-0 top-full mt-2' : 'bottom-full left-0 mb-2'}`}>
          <div className="overflow-hidden rounded-record border border-rule-strong bg-paper-raised shadow-xl">
            <div className="flex items-baseline justify-between px-3 pb-1 pt-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">AI models</p>
              <span className="text-[11.5px] text-ink-tertiary">{e.mode === 'live' ? `AmaliAI at ${e.host}` : engineLabel(e)}</span>
            </div>
            {note && <p className="px-3 pb-2 text-[12px] leading-snug text-warn">{note}</p>}
            {e.mode === 'offline' && canEdit && (
              <p className="px-3 pb-2 text-[12px] leading-snug text-ink-tertiary">The pickers unlock once AMALIAI_BASE_URL and AMALIAI_API_KEY are set in .env. Until then the offline engine writes everything.</p>
            )}
            {e.routing && (
              <div className="space-y-2 border-t border-rule px-3 py-2.5">
                {JOBS.map((j) => {
                  const configured = e.routing![j.id].model;
                  const current = modelFor(j.id, e)!;
                  const options = [...new Set([configured, ...e.models])];
                  if (!canEdit)
                    return (
                      <div key={j.id} className="flex items-baseline justify-between gap-3">
                        <span className="text-[12.5px] font-medium text-ink">{j.label}</span>
                        <span className="truncate text-[12.5px] text-ink-secondary" title={e.overrides[j.id] ? 'Changed by an approver for testing' : undefined}>
                          {current}
                          {e.overrides[j.id] ? ' *' : ''}
                        </span>
                      </div>
                    );
                  return (
                    <label key={j.id} className="block">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[12.5px] font-medium text-ink">{j.label}</span>
                        {e.overrides[j.id] && (
                          <button onClick={() => chooseModel(j.id, null)} className="text-[11px] font-semibold text-rampart hover:underline">
                            Reset
                          </button>
                        )}
                      </span>
                      <select
                        value={current}
                        disabled={e.mode !== 'live'}
                        onChange={(ev) => chooseModel(j.id, ev.target.value)}
                        className="mt-1 w-full rounded-control border border-rule-strong bg-paper-raised px-2 py-1 text-[12.5px] text-ink focus:border-rampart focus:outline-none disabled:opacity-60"
                      >
                        {options.map((m) => (
                          <option key={m} value={m}>
                            {m}
                            {m === configured ? ' (default)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
                <p className="text-[11px] leading-snug text-ink-tertiary">
                  {canEdit
                    ? 'Defaults and backups come from .env. A pick here applies in this browser only.'
                    : `Set in .env. Only approvers can change models.${Object.keys(e.overrides).length ? ' * Changed by an approver for testing.' : ''}`}
                </p>
              </div>
            )}
            <div className="border-t border-rule py-1">
              <button onClick={() => checkEngine()} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-secondary hover:bg-paper-inset hover:text-ink">
                <RefreshIcon size={15} /> Re-check connection
              </button>
            </div>
          </div>
          </div>
        </>
      )}
      {variant === 'rail' ? (
        <button
          onClick={() => setOpen((o) => !o)}
          title={`AI models: ${shortStatus(e)}`}
          aria-label={`AI models: ${shortStatus(e)}`}
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-control text-ink-tertiary hover:bg-paper-sunk hover:text-ink"
        >
          <span className="relative">
            <SparkIcon size={18} />
            <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-sidebar ${dot(e)}`} />
          </span>
        </button>
      ) : variant === 'header' ? (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-[12px] font-medium text-ink-secondary hover:bg-paper-sunk hover:text-ink"
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot(e)}`} />
          AI models
          <ChevronDown size={13} className="text-ink-muted" />
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-paper-sunk"
        >
          <SparkIcon size={16} className="shrink-0 text-ink-tertiary" />
          <span className="font-medium text-ink">AI models</span>
          <span className="ml-auto flex min-w-0 items-center gap-1.5 text-ink-tertiary">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot(e)}`} />
            <span className="truncate">{shortStatus(e)}</span>
          </span>
          <ChevronDown size={14} className="shrink-0 text-ink-muted" />
        </button>
      )}
    </div>
  );
}
