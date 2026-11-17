/** Slide-over to change the opportunity details or evidence after drafting, then refresh affected sections. */
import { useState } from 'react';
import { RefreshIcon, XIcon } from '@/components/icons';
import { Button, Chip, Field, inputCls } from '@/components/ui';
import { CONTRACT_TYPES, INDUSTRIES, REGIONS, SERVICES, TONES, WORK_TYPES } from '@/data/company';
import type { ContractType, Industry, Proposal, ProposalDraft, Region, ServiceId, Tone, WorkType } from '@/lib/types';
import { EvidencePicker } from '../wizard/StepEvidence';

export function DetailsDrawer({
  p,
  open,
  onClose,
  onSave,
}: {
  p: Proposal;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<ProposalDraft>, regenerate: boolean) => void;
}) {
  const [d, setD] = useState<Proposal>(p);
  const [tab, setTab] = useState<'details' | 'evidence'>('details');
  const patch = (x: Partial<ProposalDraft>) => setD((o) => ({ ...o, ...x }));
  if (!open) return null;
  const toggleService = (id: ServiceId) => patch({ services: d.services.includes(id) ? d.services.filter((s) => s !== id) : [...d.services, id] });

  const fields: (keyof ProposalDraft)[] = [
    'title', 'client', 'site', 'location', 'region', 'industry', 'workType', 'services', 'contractType', 'startDate', 'durationWeeks', 'peakHeadcount', 'dueDate', 'estimatedValue', 'scopeNotes', 'tone', 'selectedProjectIds', 'selectedStatIds', 'winThemes',
  ];
  const collect = () => Object.fromEntries(fields.map((f) => [f, d[f]])) as Partial<ProposalDraft>;

  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end bg-[#0b0e14]/35" onMouseDown={onClose}>
      <div className="pop-in flex h-full w-full max-w-[560px] flex-col border-l border-rule-strong bg-paper shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Proposal details</h2>
            <p className="text-[12.5px] text-ink-tertiary">Change the inputs, then refresh the sections you haven’t edited by hand.</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-control text-ink-tertiary hover:bg-paper-sunk hover:text-ink">
            <XIcon />
          </button>
        </div>
        <div className="flex gap-1 border-b border-rule px-5">
          {(['details', 'evidence'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-2 py-2.5 text-[13px] font-semibold capitalize ${tab === t ? 'border-beacon text-ink' : 'border-transparent text-ink-tertiary hover:text-ink'}`}>
              {t === 'evidence' ? 'Evidence & themes' : 'Details'}
            </button>
          ))}
        </div>
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {tab === 'details' ? (
            <div className="space-y-4">
              <Field label="Title">
                <input className={inputCls} value={d.title} onChange={(e) => patch({ title: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client">
                  <input className={inputCls} value={d.client} onChange={(e) => patch({ client: e.target.value })} />
                </Field>
                <Field label="Site">
                  <input className={inputCls} value={d.site} onChange={(e) => patch({ site: e.target.value })} />
                </Field>
                <Field label="Location">
                  <input className={inputCls} value={d.location} onChange={(e) => patch({ location: e.target.value })} />
                </Field>
                <Field label="Region">
                  <select className={inputCls} value={d.region} onChange={(e) => patch({ region: e.target.value as Region })}>
                    {REGIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Work type">
                  <select className={inputCls} value={d.workType} onChange={(e) => patch({ workType: e.target.value as WorkType })}>
                    {WORK_TYPES.map((r) => <option key={r.id}>{r.id}</option>)}
                  </select>
                </Field>
                <Field label="Industry">
                  <select className={inputCls} value={d.industry} onChange={(e) => patch({ industry: e.target.value as Industry })}>
                    {INDUSTRIES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Commercial basis">
                  <select className={inputCls} value={d.contractType} onChange={(e) => patch({ contractType: e.target.value as ContractType })}>
                    {CONTRACT_TYPES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Tone">
                  <select className={inputCls} value={d.tone} onChange={(e) => patch({ tone: e.target.value as Tone })}>
                    {TONES.map((r) => <option key={r.id}>{r.id}</option>)}
                  </select>
                </Field>
                <Field label="Start">
                  <input type="date" className={inputCls} value={d.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
                </Field>
                <Field label="Due">
                  <input type="date" className={inputCls} value={d.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
                </Field>
                <Field label="Duration (weeks)">
                  <input type="number" className={inputCls} value={d.durationWeeks} onChange={(e) => patch({ durationWeeks: Number(e.target.value) })} />
                </Field>
                <Field label="Peak headcount">
                  <input type="number" className={inputCls} value={d.peakHeadcount} onChange={(e) => patch({ peakHeadcount: Number(e.target.value) })} />
                </Field>
              </div>
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-ink-secondary">Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICES.map((s) => (
                    <Chip key={s.id} active={d.services.includes(s.id)} onClick={() => toggleService(s.id)}>
                      {s.name}
                    </Chip>
                  ))}
                </div>
              </div>
              <Field label="Scope notes">
                <textarea rows={3} className={inputCls} value={d.scopeNotes} onChange={(e) => patch({ scopeNotes: e.target.value })} />
              </Field>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[13.5px] font-semibold text-ink">Win themes</p>
                {d.winThemes.map((w, i) => (
                  <input key={i} className={`${inputCls} mb-1.5`} value={w} onChange={(e) => patch({ winThemes: d.winThemes.map((x, j) => (j === i ? e.target.value : x)) })} />
                ))}
              </div>
              <EvidencePicker draft={d} patch={patch} compact />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-paper-inset px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => onSave(collect(), false)}>
            Save only
          </Button>
          <Button variant="rampart" icon={<RefreshIcon size={15} />} onClick={() => onSave(collect(), true)}>
            Save & refresh sections
          </Button>
        </div>
      </div>
    </div>
  );
}
