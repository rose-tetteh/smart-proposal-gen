/** "Is it ready to send?" Score, checklist with fixes, placeholders to fill and RFP coverage. */
import { useState, type ReactNode } from 'react';
import { CONFIRM_PREFIX } from '@/ai/factcheck';
import type { Readiness } from '@/ai/quality';
import { AlertIcon, CheckIcon, ChevronRight } from '@/components/icons';
import { ProgressRing } from '@/components/ui';
import { SECTION_TITLES } from '@/data/company';
import type { Proposal } from '@/lib/types';

export interface PlaceholderRef {
  sectionId: string;
  sectionTitle: string;
  text: string;
  nth: number;
}

export function collectPlaceholders(p: Proposal): PlaceholderRef[] {
  const out: PlaceholderRef[] = [];
  for (const s of p.sections) {
    const counts = new Map<string, number>();
    for (const m of s.body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const n = counts.get(m[1]) ?? 0;
      counts.set(m[1], n + 1);
      out.push({ sectionId: s.id, sectionTitle: s.title, text: m[1], nth: n });
    }
  }
  return out;
}

export function fillPlaceholder(body: string, text: string, nth: number, value: string) {
  let i = -1;
  return body.replace(new RegExp(`\\[\\[${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'g'), (m) => (++i === nth ? value : m));
}

function FillRow({ ph, onFill, onJump }: { ph: PlaceholderRef; onFill: (v: string) => void; onJump: () => void }) {
  const [v, setV] = useState('');
  // A claim the fact check marked: the writer keeps or removes it rather than typing a value.
  const confirm = ph.text.startsWith(CONFIRM_PREFIX);
  const long = ph.text.length > 48 || confirm;
  return (
    <li className="rounded-record border border-[#f0c552]/60 bg-[#fffaeb] p-2.5 [:root[data-theme=dark]_&]:bg-warn-wash">
      <button onClick={onJump} className="block w-full text-left">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-tertiary">{ph.sectionTitle}</span>
        <span className="mt-0.5 block text-[12.5px] font-medium text-[#7a4b00] [:root[data-theme=dark]_&]:text-warn">{ph.text}</span>
      </button>
      {!long && (
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (v.trim()) onFill(v.trim());
          }}
        >
          <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="Type the value…"
            className="min-w-0 flex-1 rounded-control border border-rule-strong bg-paper-raised px-2 py-1 text-[12.5px] text-ink focus:border-rampart focus:outline-none"
            aria-label={`Value for ${ph.text}`}
          />
          <button disabled={!v.trim()} className="rounded-control bg-rampart px-2.5 text-[12px] font-semibold text-white disabled:opacity-40 [:root[data-theme=dark]_&]:text-[#0e1116]">
            Fill
          </button>
        </form>
      )}
      {confirm && (
        <div className="mt-2 flex gap-1.5">
          <button onClick={() => onFill(ph.text.slice(CONFIRM_PREFIX.length))} className="rounded-control bg-rampart px-2.5 py-1 text-[12px] font-semibold text-white [:root[data-theme=dark]_&]:text-[#0e1116]">
            Keep it (confirmed)
          </button>
          <button onClick={() => onFill('')} className="rounded-control border border-rule-strong bg-paper-raised px-2.5 py-1 text-[12px] font-semibold text-ink-secondary hover:text-ink">
            Remove it
          </button>
        </div>
      )}
      {long && !confirm && (
        <div className="mt-2 flex gap-1.5">
          <button onClick={() => onFill('')} className="rounded-control border border-rule-strong bg-paper-raised px-2.5 py-1 text-[12px] font-semibold text-ink-secondary hover:text-ink">
            Mark done (remove note)
          </button>
        </div>
      )}
    </li>
  );
}

export function ChecklistPanel({
  p,
  r,
  onJumpSection,
  onFill,
  onFix,
  factCheck,
}: {
  p: Proposal;
  r: Readiness;
  onJumpSection: (key: string) => void;
  onFill: (ph: PlaceholderRef, value: string) => void;
  onFix: (fix: NonNullable<Readiness['checks'][number]['fix']>) => void;
  /** The fact check card, shown under the score. */
  factCheck?: ReactNode;
}) {
  const phs = collectPlaceholders(p);
  const verdict = r.score >= 85 ? 'Ready for review' : r.score >= 60 ? 'Nearly there' : 'Needs work';

  return (
    <div className="scroll-quiet h-full space-y-5 overflow-y-auto px-3 py-4">
      <div className="flex items-center gap-3.5 rounded-panel border border-rule bg-paper-inset p-3.5">
        <ProgressRing value={r.score} size={60} stroke={5.5} />
        <div>
          <p className="text-[15px] font-semibold text-ink">{verdict}</p>
          <p className="text-[12px] text-ink-tertiary">
            ~{r.pages} pages · {r.words.toLocaleString()} words · {r.proofPoints} proof points
          </p>
        </div>
      </div>

      {factCheck}

      <section>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Checklist</p>
        <ul className="space-y-1">
          {r.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5 rounded-control px-1.5 py-1.5">
              <span className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ${c.ok ? 'bg-ok text-white [:root[data-theme=dark]_&]:text-[#0e1116]' : 'bg-warn-wash text-warn ring-1 ring-warn/50'}`}>
                {c.ok ? <CheckIcon size={11} strokeWidth={3} /> : <AlertIcon size={11} strokeWidth={2.4} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{c.label}</span>
                <span className="block text-[12px] text-ink-tertiary">{c.detail}</span>
              </span>
              {!c.ok && c.fix && (
                <button onClick={() => onFix(c.fix!)} className="shrink-0 rounded-control px-2 py-0.5 text-[12px] font-semibold text-rampart hover:bg-rampart-wash">
                  Fix
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {phs.length > 0 && (
        <section id="fill-in">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Needs your input ({phs.length})</p>
          <ul className="space-y-2">
            {phs.map((ph) => (
              <FillRow key={`${ph.sectionId}-${ph.text}-${ph.nth}`} ph={ph} onFill={(v) => onFill(ph, v)} onJump={() => onJumpSection(ph.sectionId)} />
            ))}
          </ul>
        </section>
      )}

      {r.coverage.length > 0 && (
        <section id="coverage">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
            RFP requirements ({r.coverage.filter((c) => c.covered).length}/{r.coverage.length})
          </p>
          <ul className="space-y-1">
            {r.coverage.map(({ req, covered }) => {
              const sec = p.sections.find((s) => s.key === req.section);
              return (
                <li key={req.id}>
                  <button
                    onClick={() => sec && onJumpSection(sec.id)}
                    className="flex w-full items-start gap-2 rounded-control px-1.5 py-1.5 text-left hover:bg-paper-sunk"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${covered ? 'bg-ok' : 'bg-amber'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[12.5px] text-ink-secondary">{req.text}</span>
                      <span className="block text-[11px] text-ink-tertiary">
                        {covered ? 'Answered in' : sec ? 'Strengthen' : 'Add section:'} {SECTION_TITLES[req.section]}
                      </span>
                    </span>
                    <ChevronRight size={14} className="mt-1 shrink-0 text-ink-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
