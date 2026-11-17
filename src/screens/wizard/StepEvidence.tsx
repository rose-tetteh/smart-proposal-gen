import { useEffect, useState } from 'react';
import { ai } from '@/ai/provider';
import type { ProjectMatch } from '@/ai/match';
import { CheckIcon, MapPinIcon, PlusIcon, RefreshIcon, ShieldIcon, SparkIcon, TrashIcon } from '@/components/icons';
import { Button, inputCls, SourceTag, Spinner } from '@/components/ui';
import { LIVE_STATS, serviceById } from '@/data/company';
import { fmtNum } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { ProposalDraft } from '@/lib/types';

export function EvidencePicker({
  draft,
  patch,
  compact = false,
}: {
  draft: ProposalDraft;
  patch: (p: Partial<ProposalDraft>) => void;
  compact?: boolean;
}) {
  const { projects } = useStore();
  const [matches, setMatches] = useState<ProjectMatch[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let live = true;
    ai.rank(draft, projects).then((m) => live && setMatches(m));
    return () => {
      live = false;
    };
  }, [draft.services, draft.industry, draft.workType, draft.region, draft.peakHeadcount, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleProject = (id: string) =>
    patch({
      selectedProjectIds: draft.selectedProjectIds.includes(id) ? draft.selectedProjectIds.filter((x) => x !== id) : [...draft.selectedProjectIds, id],
    });
  const toggleStat = (id: string) =>
    patch({ selectedStatIds: draft.selectedStatIds.includes(id) ? draft.selectedStatIds.filter((x) => x !== id) : [...draft.selectedStatIds, id] });

  const list = matches ? (showAll ? matches : matches.slice(0, compact ? 5 : 6)) : [];

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-[15.5px] font-semibold text-ink">
            Past projects to cite <span className="font-normal text-ink-tertiary">({draft.selectedProjectIds.length} selected, aim for 3+)</span>
          </h3>
          {matches && matches.length > list.length && (
            <button className="text-[13px] font-semibold text-rampart hover:underline" onClick={() => setShowAll(true)}>
              Show all {matches.length}
            </button>
          )}
        </div>
        {!matches && (
          <div className="flex items-center gap-2 rounded-panel border border-rule p-5 text-[13px] text-ink-tertiary">
            <Spinner /> Matching Bastion’s experience to this job…
          </div>
        )}
        <ul className="space-y-2">
          {list.map(({ project: p, score, reasons }) => {
            const on = draft.selectedProjectIds.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  onClick={() => toggleProject(p.id)}
                  aria-pressed={on}
                  className={`flex w-full gap-3.5 rounded-panel border p-3.5 text-left transition-all ${on ? 'border-rampart bg-rampart-wash/50 ring-1 ring-rampart' : 'border-rule bg-paper-raised hover:border-rule-strong'}`}
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border-2 ${on ? 'border-rampart bg-rampart text-white [:root[data-theme=dark]_&]:text-[#0e1116]' : 'border-rule-strong'}`}
                  >
                    {on && <CheckIcon size={12} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink">{p.name}</span>
                      <SourceTag source={p.source} />
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-tertiary">
                      <span className="inline-flex items-center gap-1">
                        <MapPinIcon size={13} /> {p.location}
                      </span>
                      <span>
                        {p.workType} · {p.year}
                      </span>
                      <span>{fmtNum(p.peakHeadcount)} peak</span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldIcon size={13} /> {p.recordables} recordables
                      </span>
                    </span>
                    {!compact && (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {reasons.slice(0, 4).map((r) => (
                          <span key={r} className="rounded-full bg-paper-sunk px-2 py-0.5 text-[11.5px] text-ink-secondary">
                            {r}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="w-16 shrink-0 text-right">
                    <span className={`tabular block text-[18px] font-bold ${score >= 70 ? 'text-ok' : score >= 45 ? 'text-warn' : 'text-ink-tertiary'}`}>{score}%</span>
                    <span className="block text-[10.5px] font-medium uppercase tracking-wide text-ink-muted">match</span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-paper-sunk">
                      <span className="block h-full rounded-full bg-rampart" style={{ width: `${score}%` }} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 text-[15.5px] font-semibold text-ink">
          Live performance proof <span className="font-normal text-ink-tertiary">({draft.selectedStatIds.length} selected)</span>
        </h3>
        <p className="mb-3 text-[13px] text-ink-secondary">Show clients how Bastion performs today. Pick the numbers that matter for this job.</p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {LIVE_STATS.map((s) => {
            const on = draft.selectedStatIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleStat(s.id)}
                aria-pressed={on}
                className={`rounded-record border p-3 text-left transition-all ${on ? 'border-rampart bg-rampart-wash/50 ring-1 ring-rampart' : 'border-rule bg-paper-raised hover:border-rule-strong'}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="tabular text-[20px] font-semibold tracking-tight text-ink">{s.value}</span>
                  <SourceTag source={s.source} />
                </span>
                <span className="block text-[12.5px] font-medium text-ink-secondary">{s.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function WinThemes({ draft, patch }: { draft: ProposalDraft; patch: (p: Partial<ProposalDraft>) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="rounded-panel border border-rule bg-paper-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15.5px] font-semibold text-ink">
            <SparkIcon size={16} className="text-beacon" /> Win themes
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-secondary">The 3–4 messages you want the client to remember. Bastion Assist weaves them into the cover letter and summary.</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={busy ? <Spinner size={14} /> : <RefreshIcon size={15} />}
          onClick={async () => {
            setBusy(true);
            patch({ winThemes: await ai.winThemes(draft) });
            setBusy(false);
          }}
        >
          Suggest
        </Button>
      </div>
      <ul className="mt-3 space-y-2">
        {draft.winThemes.map((w, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="tabular w-5 text-center text-[12px] font-bold text-beacon">{i + 1}</span>
            <input
              className={inputCls}
              value={w}
              onChange={(e) => patch({ winThemes: draft.winThemes.map((x, j) => (j === i ? e.target.value : x)) })}
              aria-label={`Win theme ${i + 1}`}
            />
            <button aria-label="Remove theme" className="grid h-8 w-8 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-bad-wash hover:text-bad" onClick={() => patch({ winThemes: draft.winThemes.filter((_, j) => j !== i) })}>
              <TrashIcon size={16} />
            </button>
          </li>
        ))}
      </ul>
      {draft.winThemes.length < 5 && (
        <button className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-rampart hover:underline" onClick={() => patch({ winThemes: [...draft.winThemes, ''] })}>
          <PlusIcon size={15} /> Add theme
        </button>
      )}
    </section>
  );
}

export function StepEvidence({ draft, patch }: { draft: ProposalDraft; patch: (p: Partial<ProposalDraft>) => void }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-beacon">Step 3</p>
      <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Prove Bastion has done this before</h2>
      <p className="mt-1.5 text-[15px] text-ink-secondary">
        Bastion Assist ranked Bastion’s past projects for this {draft.workType.toLowerCase()} of {draft.services.map((s) => serviceById(s).name.split(' ')[0].toLowerCase()).join(', ')}. The best matches are already ticked.
      </p>
      <div className="mt-6 space-y-6">
        <WinThemes draft={draft} patch={patch} />
        <EvidencePicker draft={draft} patch={patch} />
      </div>
    </div>
  );
}
