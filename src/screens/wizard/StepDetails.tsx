import { useState, type ReactNode } from 'react';
import { ChevronDown, SparkIcon } from '@/components/icons';
import { Chip, Field, inputCls } from '@/components/ui';
import { CLIENT_SUGGESTIONS, CONTRACT_TYPES, INDUSTRIES, REGIONS, SERVICES, WORK_TYPES } from '@/data/company';
import type { ContractType, Industry, ProposalDraft, Region, ServiceId, WorkType } from '@/lib/types';
import type { AutoFilled } from './Wizard';

function FromRfp({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rampart-wash px-1.5 py-px text-[10.5px] font-semibold text-rampart">
      <SparkIcon size={11} /> from RFP
    </span>
  );
}

function Group({ n, title, children, hint }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-panel border border-rule bg-paper-raised p-5">
      <div className="mb-4 flex items-baseline gap-2.5">
        <span className="tabular text-[12px] font-bold text-beacon">0{n}</span>
        <h3 className="text-[15.5px] font-semibold text-ink">{title}</h3>
        {hint && <span className="text-[12.5px] text-ink-tertiary">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function StepDetails({
  draft,
  patch,
  auto,
  onTitleEdit,
}: {
  draft: ProposalDraft;
  patch: (p: Partial<ProposalDraft>) => void;
  auto: AutoFilled;
  onTitleEdit: () => void;
}) {
  const [showReqs, setShowReqs] = useState(false);
  const hl = (k: string) => (auto.has(k) ? 'bg-rampart-wash/60 border-rampart/40' : '');
  const toggleService = (id: ServiceId) =>
    patch({ services: draft.services.includes(id) ? draft.services.filter((s) => s !== id) : [...draft.services, id] });

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-beacon">Step 2</p>
      <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Tell Bastion Assist about the opportunity</h2>
      <p className="mt-1.5 text-[15px] text-ink-secondary">
        {auto.size ? (
          <>
            Bastion Assist filled in <strong className="text-ink">{auto.size} fields</strong> from the RFP. They are highlighted, so check them and change anything that’s off.
          </>
        ) : (
          'Only the client and services are required. Sensible defaults are filled in for the rest.'
        )}
      </p>

      {draft.requirements.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-panel border border-rampart/30 bg-rampart-wash">
          <button onClick={() => setShowReqs((s) => !s)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <span className="grid h-8 w-8 place-items-center rounded-record bg-rampart text-white [:root[data-theme=dark]_&]:text-[#0e1116]">
              <SparkIcon size={16} />
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-semibold text-ink">{draft.requirements.length} requirements found in the RFP</span>
              <span className="block text-[12.5px] text-ink-secondary">Each one will be mapped to a section and checked before you send.</span>
            </span>
            <ChevronDown className={`text-ink-tertiary transition-transform ${showReqs ? 'rotate-180' : ''}`} />
          </button>
          {showReqs && (
            <ol className="scroll-quiet max-h-64 space-y-1.5 overflow-y-auto border-t border-rampart/20 bg-paper-raised px-4 py-3">
              {draft.requirements.map((r) => (
                <li key={r.id} className="flex gap-3 text-[13px]">
                  <span className="stamp h-fit shrink-0 text-rampart">{r.category}</span>
                  <span className="text-ink-secondary">{r.text}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <Group n={1} title="Who is it for?">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client" hint={<FromRfp on={auto.has('client')} />}>
              <input
                list="clients"
                className={`${inputCls} ${hl('client')}`}
                value={draft.client}
                placeholder="e.g. Phillips 66"
                onChange={(e) => patch({ client: e.target.value })}
                autoFocus={!draft.client}
              />
              <datalist id="clients">
                {CLIENT_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Site / facility" hint={<FromRfp on={auto.has('site')} />}>
              <input className={`${inputCls} ${hl('site')}`} value={draft.site} placeholder="e.g. Sweeny Refinery" onChange={(e) => patch({ site: e.target.value })} />
            </Field>
            <Field label="Location" hint={<FromRfp on={auto.has('location')} />}>
              <input className={`${inputCls} ${hl('location')}`} value={draft.location} placeholder="City, State" onChange={(e) => patch({ location: e.target.value })} />
            </Field>
            <Field label="Region" hint={<FromRfp on={auto.has('region')} />}>
              <select className={`${inputCls} ${hl('region')}`} value={draft.region} onChange={(e) => patch({ region: e.target.value as Region })}>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Proposal title" className="sm:col-span-2" hint="auto-suggested, edit freely">
              <input
                className={`${inputCls} ${hl('title')}`}
                value={draft.title}
                placeholder="Client: Scope"
                onChange={(e) => {
                  onTitleEdit();
                  patch({ title: e.target.value });
                }}
              />
            </Field>
          </div>
        </Group>

        <Group n={2} title="What’s the work?">
          <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink-secondary">
            Work type <FromRfp on={auto.has('workType')} />
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {WORK_TYPES.map((w) => {
              const on = draft.workType === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => patch({ workType: w.id as WorkType })}
                  aria-pressed={on}
                  className={`rounded-record border p-3.5 text-left transition-all ${on ? 'border-rampart bg-rampart-wash ring-1 ring-rampart' : 'border-rule-strong hover:border-ink-muted'}`}
                >
                  <span className="flex items-center justify-between text-[14px] font-semibold text-ink">
                    {w.id}
                    <span className={`h-4 w-4 rounded-full border-2 ${on ? 'border-rampart bg-rampart shadow-[inset_0_0_0_2px_var(--color-paper-raised)]' : 'border-rule-strong'}`} />
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-ink-tertiary">{w.hint}</span>
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-5 flex items-center gap-2 text-[12.5px] font-semibold text-ink-secondary">
            Services in scope <FromRfp on={auto.has('services')} />
            <span className="font-normal text-ink-tertiary">({draft.services.length} selected)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <Chip key={s.id} active={draft.services.includes(s.id)} onClick={() => toggleService(s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Industry" hint={<FromRfp on={auto.has('industry')} />}>
              <select className={`${inputCls} ${hl('industry')}`} value={draft.industry} onChange={(e) => patch({ industry: e.target.value as Industry })}>
                {INDUSTRIES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Commercial basis" hint={<FromRfp on={auto.has('contractType')} />}>
              <select className={`${inputCls} ${hl('contractType')}`} value={draft.contractType} onChange={(e) => patch({ contractType: e.target.value as ContractType })}>
                {CONTRACT_TYPES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
        </Group>

        <Group n={3} title="When, and how big?">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Work starts" hint={<FromRfp on={auto.has('startDate')} />}>
              <input type="date" className={`${inputCls} ${hl('startDate')}`} value={draft.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
            </Field>
            <Field label="Duration (weeks)" hint={<FromRfp on={auto.has('durationWeeks')} />}>
              <input type="number" min={1} className={`${inputCls} ${hl('durationWeeks')}`} value={draft.durationWeeks} onChange={(e) => patch({ durationWeeks: Number(e.target.value) })} />
            </Field>
            <Field label="Proposal due" hint={<FromRfp on={auto.has('dueDate')} />}>
              <input type="date" className={`${inputCls} ${hl('dueDate')}`} value={draft.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label={`Peak craft headcount: ${draft.peakHeadcount.toLocaleString()}`} hint={<FromRfp on={auto.has('peakHeadcount')} />}>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={10}
                  max={1500}
                  step={10}
                  value={draft.peakHeadcount}
                  onChange={(e) => patch({ peakHeadcount: Number(e.target.value) })}
                  className="flex-1 accent-[var(--color-rampart)]"
                  aria-label="Peak headcount"
                />
                <input
                  type="number"
                  className={`${inputCls} w-24 ${hl('peakHeadcount')}`}
                  value={draft.peakHeadcount}
                  onChange={(e) => patch({ peakHeadcount: Number(e.target.value) })}
                  aria-label="Peak headcount value"
                />
              </div>
            </Field>
            <Field label="Est. contract value" hint="internal only">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary">$</span>
                <input
                  type="number"
                  min={0}
                  step={100000}
                  className={`${inputCls} pl-6`}
                  value={draft.estimatedValue || ''}
                  placeholder="0"
                  onChange={(e) => patch({ estimatedValue: Number(e.target.value) })}
                />
              </div>
            </Field>
          </div>
          <Field label="Anything else Bastion Assist should know?" hint="optional" className="mt-4">
            <textarea
              rows={3}
              className={inputCls}
              value={draft.scopeNotes}
              placeholder="e.g. Client had schedule overruns with their last contractor; emphasise pre-turnaround scaffold build."
              onChange={(e) => patch({ scopeNotes: e.target.value })}
            />
          </Field>
        </Group>
      </div>
    </div>
  );
}
