import { useState } from 'react';
import { PLACEHOLDER_RE } from '@/ai/quality';
import { ChevronDown, ChevronUp, PlusIcon, TrashIcon } from '@/components/icons';
import { SECTION_TITLES } from '@/data/company';
import { wordCount } from '@/lib/format';
import type { Proposal, SectionKey } from '@/lib/types';

export function Outline({
  p,
  activeId,
  onJump,
  onMove,
  onRemove,
  onAdd,
}: {
  p: Proposal;
  activeId: string | null;
  onJump: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onAdd: (key: SectionKey) => void;
}) {
  const [adding, setAdding] = useState(false);
  const missing = (Object.keys(SECTION_TITLES) as SectionKey[]).filter((k) => !p.sections.some((s) => s.key === k));

  return (
    <nav aria-label="Proposal outline" className="flex h-full flex-col">
      <p className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Outline</p>
      <ol className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2">
        <li>
          <button onClick={() => document.querySelector('.sheet')?.scrollIntoView({ behavior: 'smooth' })} className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-[13px] text-ink-tertiary hover:bg-paper-sunk">
            <span className="w-5 text-right text-[11px] font-semibold">—</span> Cover page
          </button>
        </li>
        {p.sections.map((s, i) => {
          const open = (s.body.match(PLACEHOLDER_RE) ?? []).length;
          const on = s.id === activeId;
          return (
            <li key={s.id} className="group relative">
              <button
                onClick={() => onJump(s.id)}
                className={`flex w-full items-center gap-2 rounded-control py-1.5 pl-2 pr-14 text-left text-[13px] transition-colors ${on ? 'bg-paper-sunk font-semibold text-ink' : 'text-ink-secondary hover:bg-paper-sunk/70 hover:text-ink'}`}
              >
                <span className={`tabular w-5 shrink-0 text-right text-[11px] font-semibold ${on ? 'text-beacon' : 'text-ink-muted'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                {open > 0 && (
                  <span title={`${open} item(s) need input`} className="tabular rounded-full bg-[#fff1c2] px-1.5 text-[10.5px] font-bold text-[#7a4b00]">
                    {open}
                  </span>
                )}
              </button>
              <span className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center group-hover:flex">
                <button aria-label="Move up" disabled={i === 0} onClick={() => onMove(s.id, -1)} className="grid h-6 w-5 place-items-center rounded text-ink-tertiary hover:bg-paper-raised hover:text-ink disabled:opacity-30">
                  <ChevronUp size={13} />
                </button>
                <button aria-label="Move down" disabled={i === p.sections.length - 1} onClick={() => onMove(s.id, 1)} className="grid h-6 w-5 place-items-center rounded text-ink-tertiary hover:bg-paper-raised hover:text-ink disabled:opacity-30">
                  <ChevronDown size={13} />
                </button>
                <button aria-label="Remove section" onClick={() => onRemove(s.id)} className="grid h-6 w-5 place-items-center rounded text-ink-tertiary hover:bg-bad-wash hover:text-bad">
                  <TrashIcon size={12} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="relative border-t border-rule p-2">
        {adding && missing.length > 0 && (
          <div className="pop-in absolute bottom-full left-2 right-2 mb-1 max-h-72 overflow-y-auto rounded-record border border-rule-strong bg-paper-raised py-1 shadow-xl">
            {missing.map((k) => (
              <button
                key={k}
                onClick={() => {
                  onAdd(k);
                  setAdding(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-[13px] text-ink-secondary hover:bg-paper-inset hover:text-ink"
              >
                {SECTION_TITLES[k]}
              </button>
            ))}
          </div>
        )}
        <button
          disabled={!missing.length}
          onClick={() => setAdding((a) => !a)}
          className="flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-rule-strong py-2 text-[12.5px] font-semibold text-ink-secondary hover:border-ink-muted hover:text-ink disabled:opacity-40"
        >
          <PlusIcon size={15} /> Add section
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-muted">{p.sections.reduce((a, s) => a + wordCount(s.body), 0).toLocaleString()} words</p>
      </div>
    </nav>
  );
}
