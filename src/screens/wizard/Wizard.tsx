/**
 * New-proposal flow. Four short steps, each with smart defaults, so a user can
 * go from "the client sent an RFP" to a full draft in a few minutes:
 *
 *   1. Opportunity: paste the RFP (optional). Bastion Assist fills in step 2.
 *   2. Details: client, scope, dates. Only the client name is required.
 *   3. Evidence: Bastion Assist ranks past projects and live stats; tick what to cite.
 *   4. Format: template and tone. Then Generate.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ai } from '@/ai/provider';
import type { RfpExtraction } from '@/ai/extract';
import { CheckIcon, ChevronLeft, ChevronRight, SparkIcon } from '@/components/icons';
import { Button, Kbd } from '@/components/ui';
import { serviceById, templateById } from '@/data/company';
import { addWeeks, todayIso } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { ProposalDraft, TemplateId, WorkType } from '@/lib/types';
import { Generating } from './Generating';
import { StepDetails } from './StepDetails';
import { StepEvidence } from './StepEvidence';
import { StepFormat } from './StepFormat';
import { StepRfp } from './StepRfp';

const STEPS = ['Opportunity', 'Details', 'Evidence', 'Format'] as const;

export const templateFor = (w: WorkType): TemplateId => (w === 'Turnaround' ? 'turnaround' : w === 'Maintenance' ? 'maintenance' : 'full');

function blankDraft(template?: TemplateId): ProposalDraft {
  const t = todayIso();
  return {
    title: '',
    client: '',
    site: '',
    location: '',
    region: 'Gulf Coast',
    industry: 'Refining',
    workType: 'Turnaround',
    services: ['scaffolding', 'insulation'],
    contractType: 'Time & Materials',
    startDate: addWeeks(t, 10),
    durationWeeks: 6,
    peakHeadcount: 250,
    dueDate: addWeeks(t, 3),
    estimatedValue: 0,
    scopeNotes: '',
    rfpText: '',
    requirements: [],
    template: template ?? 'turnaround',
    tone: 'Formal',
    selectedProjectIds: [],
    selectedStatIds: ['years', 'people', 'zero-sites', 'standby', 'scaffold-ontime'],
    winThemes: [],
  };
}

export type AutoFilled = Set<string>;

export function Wizard() {
  const [params] = useSearchParams();
  const presetTemplate = (params.get('template') as TemplateId | null) ?? undefined;
  const [draft, setDraft] = useState<ProposalDraft>(() => blankDraft(presetTemplate));
  const [step, setStep] = useState(params.get('mode') === 'quick' || (presetTemplate && params.get('mode') !== 'rfp') ? 1 : 0);
  const [auto, setAuto] = useState<AutoFilled>(new Set());
  const [titleTouched, setTitleTouched] = useState(false);
  const [templateTouched, setTemplateTouched] = useState(!!presetTemplate);
  const [generating, setGenerating] = useState(false);
  const nav = useNavigate();
  const { projects } = useStore();

  const patch = (p: Partial<ProposalDraft>) => setDraft((d) => ({ ...d, ...p }));

  // Smart defaults that follow the user's choices until they override them.
  useEffect(() => {
    if (!titleTouched && draft.client) {
      const what = draft.workType === 'Capital Project' ? 'Capital Project Services' : draft.workType === 'Turnaround' ? 'Turnaround Services' : 'Maintenance Services';
      setDraft((d) => ({ ...d, title: `${d.site || d.client}: ${what}` }));
    }
  }, [draft.client, draft.site, draft.workType, titleTouched]);

  useEffect(() => {
    if (!templateTouched) setDraft((d) => ({ ...d, template: templateFor(d.workType) }));
  }, [draft.workType, templateTouched]);

  const applyExtraction = (x: RfpExtraction, text: string) => {
    const filled = new Set<string>();
    const next: Partial<ProposalDraft> = { rfpText: text, requirements: x.requirements };
    const set = <K extends keyof ProposalDraft>(k: K, v: ProposalDraft[K] | undefined) => {
      if (v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)) {
        next[k] = v;
        filled.add(k);
      }
    };
    set('client', x.client);
    set('site', x.site);
    set('location', x.location);
    set('region', x.region);
    set('industry', x.industry);
    set('workType', x.workType);
    set('services', x.services);
    set('contractType', x.contractType);
    set('startDate', x.startDate);
    set('dueDate', x.dueDate);
    set('durationWeeks', x.durationWeeks);
    set('peakHeadcount', x.peakHeadcount);
    if (x.title) {
      set('title', x.title);
      setTitleTouched(true);
    }
    setDraft((d) => ({ ...d, ...next }));
    setAuto(filled);
    setStep(1);
  };

  const canNext = step === 1 ? draft.client.trim().length > 0 && draft.services.length > 0 : true;

  const next = () => {
    if (!canNext) return;
    if (step < 3) setStep((s) => s + 1);
    else setGenerating(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Pre-select the best evidence the first time the user reaches step 3.
  useEffect(() => {
    if (step !== 2 || draft.selectedProjectIds.length) return;
    let live = true;
    Promise.all([ai.rank(draft, projects), ai.winThemes(draft)]).then(([ranked, themes]) => {
      if (!live) return;
      setDraft((d) => ({
        ...d,
        selectedProjectIds: d.selectedProjectIds.length ? d.selectedProjectIds : ranked.slice(0, 3).map((m) => m.project.id),
        winThemes: d.winThemes.length ? d.winThemes : themes,
      }));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const tpl = templateById(draft.template);
  const summary = useMemo(
    () => [
      { k: 'Client', v: draft.client || '—' },
      { k: 'Work', v: `${draft.workType} · ${draft.industry}` },
      { k: 'Scope', v: draft.services.map((s) => serviceById(s).name.split(' ')[0]).join(', ') || '—' },
      { k: 'Requirements', v: draft.requirements.length ? `${draft.requirements.length} from RFP` : 'None loaded' },
      { k: 'Evidence', v: `${draft.selectedProjectIds.length} projects · ${draft.selectedStatIds.length} stats` },
      { k: 'Output', v: `${tpl.name} · ${tpl.sections.length} sections · ${tpl.pages}` },
    ],
    [draft, tpl],
  );

  if (generating)
    return (
      <Generating
        draft={draft}
        onDone={(id) => nav(`/p/${id}`)}
        onCancel={() => setGenerating(false)}
      />
    );

  return (
    <div className="flex h-full flex-col">
      {/* Stepper */}
      <div className="no-print border-b border-rule bg-paper px-5 py-3 sm:px-8">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4">
          <h1 className="hidden text-[15px] font-semibold text-ink md:block">New proposal</h1>
          <ol className="flex flex-1 items-center gap-1 overflow-x-auto md:justify-center">
            {STEPS.map((s, i) => {
              const done = i < step;
              const cur = i === step;
              return (
                <li key={s} className="flex items-center">
                  <button
                    disabled={i > step && !(i === step + 1 && canNext)}
                    onClick={() => setStep(i)}
                    className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors ${cur ? 'bg-rampart-wash text-rampart' : done ? 'text-ink hover:bg-paper-sunk' : 'text-ink-muted'}`}
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${cur ? 'bg-rampart text-white [:root[data-theme=dark]_&]:text-[#0e1116]' : done ? 'bg-ok text-white [:root[data-theme=dark]_&]:text-[#0e1116]' : 'border border-rule-strong'}`}
                    >
                      {done ? <CheckIcon size={12} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="whitespace-nowrap">{s}</span>
                  </button>
                  {i < STEPS.length - 1 && <span className={`mx-1 h-px w-6 ${i < step ? 'bg-ok' : 'bg-rule-strong'}`} />}
                </li>
              );
            })}
          </ol>
          <span className="hidden items-center gap-1.5 text-[12px] text-ink-tertiary xl:flex">
            <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> next
          </span>
        </div>
      </div>

      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 pb-28 pt-7 sm:px-8 lg:grid-cols-[1fr_300px]">
          <div key={step} className="fade-up min-w-0">
            {step === 0 && <StepRfp draft={draft} onExtracted={applyExtraction} onSkip={() => setStep(1)} />}
            {step === 1 && (
              <StepDetails
                draft={draft}
                patch={patch}
                auto={auto}
                onTitleEdit={() => setTitleTouched(true)}
              />
            )}
            {step === 2 && <StepEvidence draft={draft} patch={patch} />}
            {step === 3 && (
              <StepFormat
                draft={draft}
                patch={(p) => {
                  if (p.template) setTemplateTouched(true);
                  patch(p);
                }}
              />
            )}
          </div>

          {/* Live summary */}
          <aside className="hidden lg:block">
            <div className="sticky top-2 rounded-panel border border-rule bg-paper-inset p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                <SparkIcon size={14} className="text-beacon" /> What Bastion Assist will write
              </p>
              <p className="mt-2 text-[14px] font-semibold leading-snug text-ink">{draft.title || 'Untitled proposal'}</p>
              <dl className="mt-3 space-y-2">
                {summary.map(({ k, v }) => (
                  <div key={k} className="flex gap-3 text-[12.5px]">
                    <dt className="w-[86px] shrink-0 text-ink-tertiary">{k}</dt>
                    <dd className="min-w-0 font-medium text-ink-secondary">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 border-t border-rule pt-3">
                <p className="text-[11.5px] leading-relaxed text-ink-tertiary">
                  Everything Bastion Assist writes is editable. Anything it cannot confirm is marked <mark className="rounded bg-[#fff1c2] px-1 text-[#7a4b00]">like this</mark> for you to fill in.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer nav */}
      {step > 0 && (
        <div className="no-print border-t border-rule bg-paper/95 px-5 py-3 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
            <Button variant="ghost" icon={<ChevronLeft size={16} />} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              {step === 1 && !canNext && <span className="text-[12.5px] text-ink-tertiary">Add a client and at least one service to continue</span>}
              {step === 3 ? (
                <Button variant="primary" size="lg" icon={<SparkIcon size={18} />} onClick={next}>
                  Generate proposal
                </Button>
              ) : (
                <Button variant="rampart" disabled={!canNext} onClick={next}>
                  Continue <ChevronRight size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
