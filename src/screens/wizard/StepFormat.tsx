import { CheckIcon } from '@/components/icons';
import { SECTION_TITLES, TEMPLATES, TONES } from '@/data/company';
import type { ProposalDraft } from '@/lib/types';
import { templateFor } from './Wizard';

export function StepFormat({ draft, patch }: { draft: ProposalDraft; patch: (p: Partial<ProposalDraft>) => void }) {
  const recommended = templateFor(draft.workType);
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-beacon">Step 4</p>
      <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Pick the format and voice</h2>
      <p className="mt-1.5 text-[15px] text-ink-secondary">You can add, remove or reorder sections later in the editor.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((t) => {
          const on = draft.template === t.id;
          return (
            <button
              key={t.id}
              onClick={() => patch({ template: t.id })}
              aria-pressed={on}
              className={`group relative flex gap-4 rounded-panel border p-4 text-left transition-all ${on ? 'border-rampart bg-rampart-wash/50 ring-1 ring-rampart' : 'border-rule bg-paper-raised hover:border-rule-strong'}`}
            >
              {/* mini document thumbnail */}
              <span className="sheet relative block h-[92px] w-[70px] shrink-0 overflow-hidden rounded-[3px] p-1.5">
                <span className="block h-2 w-8 rounded-sm bg-[#0e4a52]" />
                <span className="mt-1 block h-[2px] w-10 bg-[#c2410c]" />
                {t.sections.slice(0, 7).map((_, i) => (
                  <span key={i} className="mt-[5px] block h-[3px] rounded-sm bg-[#d5d8e0]" style={{ width: `${55 + ((i * 37) % 40)}%` }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink">{t.name}</span>
                  {t.id === recommended && <span className="stamp text-ok">Recommended</span>}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-secondary">{t.description}</span>
                <span className="mt-2 block text-[12px] text-ink-tertiary">
                  {t.sections.length} section{t.sections.length > 1 ? 's' : ''} · {t.pages}
                </span>
              </span>
              {on && (
                <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-rampart text-white [:root[data-theme=dark]_&]:text-[#0e1116]">
                  <CheckIcon size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <h3 className="mb-2 mt-8 text-[15.5px] font-semibold text-ink">Tone</h3>
      <div className="inline-flex flex-wrap gap-1 rounded-record border border-rule bg-paper-inset p-1">
        {TONES.map((t) => {
          const on = draft.tone === t.id;
          return (
            <button
              key={t.id}
              onClick={() => patch({ tone: t.id })}
              aria-pressed={on}
              className={`rounded-control px-4 py-2 text-left transition-all ${on ? 'bg-paper-raised shadow-sm ring-1 ring-rule-strong' : 'hover:bg-paper-sunk'}`}
            >
              <span className={`block text-[13.5px] font-semibold ${on ? 'text-ink' : 'text-ink-secondary'}`}>{t.id}</span>
              <span className="block text-[11.5px] text-ink-tertiary">{t.hint}</span>
            </button>
          );
        })}
      </div>

      <h3 className="mb-2 mt-8 text-[15.5px] font-semibold text-ink">Sections Bastion Assist will write</h3>
      <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {TEMPLATES.find((t) => t.id === draft.template)!.sections.map((k, i) => (
          <li key={k} className="flex items-center gap-2.5 text-[13.5px] text-ink-secondary">
            <span className="tabular w-5 text-right text-[12px] font-semibold text-ink-muted">{i + 1}</span>
            {SECTION_TITLES[k]}
          </li>
        ))}
      </ol>
    </div>
  );
}
