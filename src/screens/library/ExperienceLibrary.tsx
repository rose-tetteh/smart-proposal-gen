/** The experience library: past projects Bastion Assist can cite. Add, edit and filter them here. */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarIcon, ClockIcon, EditIcon, MapPinIcon, PlusIcon, SearchIcon, ShieldIcon, TrashIcon, UsersIcon } from '@/components/icons';
import { Button, Chip, Field, inputCls, Modal, SourceTag } from '@/components/ui';
import { INDUSTRIES, REGIONS, SERVICES, serviceById, WORK_TYPES } from '@/data/company';
import { fmtNum, uid } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Industry, PastProject, Region, ServiceId, WorkType } from '@/lib/types';
import { useToast } from '@/lib/ui-state';

const blank = (): PastProject => ({
  id: uid('p'),
  name: '',
  client: '',
  location: '',
  region: 'Gulf Coast',
  industry: 'Refining',
  workType: 'Turnaround',
  services: ['scaffolding'],
  year: new Date().getFullYear(),
  durationWeeks: 6,
  peakHeadcount: 200,
  craftHours: 100_000,
  recordables: 0,
  summary: '',
  outcomes: [],
  lessons: [],
  source: 'sample',
});

function ProjectForm({ value, onSave, onClose }: { value: PastProject; onSave: (p: PastProject) => void; onClose: () => void }) {
  const [p, setP] = useState(value);
  const [outcomes, setOutcomes] = useState(value.outcomes.join('\n'));
  const [lessons, setLessons] = useState(value.lessons.join('\n'));
  const set = (x: Partial<PastProject>) => setP((o) => ({ ...o, ...x }));
  const toggle = (id: ServiceId) => set({ services: p.services.includes(id) ? p.services.filter((s) => s !== id) : [...p.services, id] });
  const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <Modal
      open
      onClose={onClose}
      title={value.name ? 'Edit project' : 'Add a past project'}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="rampart" disabled={!p.name.trim()} onClick={() => onSave({ ...p, outcomes: lines(outcomes), lessons: lines(lessons) })}>
            Save project
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Project name" className="sm:col-span-2">
          <input className={inputCls} value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. FCC Turnaround: Scaffold & Insulation" />
        </Field>
        <Field label="Client (as you want it shown)" hint="anonymise if needed">
          <input className={inputCls} value={p.client} onChange={(e) => set({ client: e.target.value })} placeholder="e.g. Gulf Coast refiner" />
        </Field>
        <Field label="Location">
          <input className={inputCls} value={p.location} onChange={(e) => set({ location: e.target.value })} />
        </Field>
        <Field label="Region">
          <select className={inputCls} value={p.region} onChange={(e) => set({ region: e.target.value as Region })}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
        </Field>
        <Field label="Industry">
          <select className={inputCls} value={p.industry} onChange={(e) => set({ industry: e.target.value as Industry })}>{INDUSTRIES.map((r) => <option key={r}>{r}</option>)}</select>
        </Field>
        <Field label="Work type">
          <select className={inputCls} value={p.workType} onChange={(e) => set({ workType: e.target.value as WorkType })}>{WORK_TYPES.map((r) => <option key={r.id}>{r.id}</option>)}</select>
        </Field>
        <Field label="Year">
          <input type="number" className={inputCls} value={p.year} onChange={(e) => set({ year: Number(e.target.value) })} />
        </Field>
        <Field label="Duration (weeks)">
          <input type="number" className={inputCls} value={p.durationWeeks} onChange={(e) => set({ durationWeeks: Number(e.target.value) })} />
        </Field>
        <Field label="Peak headcount">
          <input type="number" className={inputCls} value={p.peakHeadcount} onChange={(e) => set({ peakHeadcount: Number(e.target.value) })} />
        </Field>
        <Field label="Craft hours">
          <input type="number" className={inputCls} value={p.craftHours} onChange={(e) => set({ craftHours: Number(e.target.value) })} />
        </Field>
        <Field label="Recordable incidents">
          <input type="number" className={inputCls} value={p.recordables} onChange={(e) => set({ recordables: Number(e.target.value) })} />
        </Field>
      </div>
      <p className="mb-2 mt-4 text-[12.5px] font-semibold text-ink-secondary">Services</p>
      <div className="flex flex-wrap gap-1.5">
        {SERVICES.map((s) => <Chip key={s.id} active={p.services.includes(s.id)} onClick={() => toggle(s.id)}>{s.name}</Chip>)}
      </div>
      <Field label="Summary" className="mt-4">
        <textarea rows={2} className={inputCls} value={p.summary} onChange={(e) => set({ summary: e.target.value })} />
      </Field>
      <Field label="Outcomes" hint="one per line" className="mt-3">
        <textarea rows={3} className={inputCls} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} placeholder="Finished 2 days ahead of schedule" />
      </Field>
      <Field label="Lessons learned" hint="one per line" className="mt-3">
        <textarea rows={2} className={inputCls} value={lessons} onChange={(e) => setLessons(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function ExperienceLibrary() {
  const { projects, upsertProject, deleteProject } = useStore();
  const [params] = useSearchParams();
  const focus = params.get('focus');
  const toast = useToast();
  const [q, setQ] = useState('');
  const [wt, setWt] = useState<WorkType | 'all'>('all');
  const [svc, setSvc] = useState<ServiceId | 'all'>('all');
  const [editing, setEditing] = useState<PastProject | null>(null);

  useEffect(() => {
    if (focus) setTimeout(() => document.getElementById(`proj-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [focus]);

  const rows = projects.filter(
    (p) =>
      (wt === 'all' || p.workType === wt) &&
      (svc === 'all' || p.services.includes(svc)) &&
      (!q || `${p.name} ${p.client} ${p.location} ${p.industry} ${p.summary}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="scroll-quiet h-full overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-ink">Experience library</h1>
            <p className="max-w-2xl text-[13.5px] text-ink-tertiary">
              Past projects Bastion Assist can cite as proof. The better this library, the better every proposal. Entries tagged <span className="stamp text-warn">Sample</span> are placeholders until connected to Bastion’s project records.
            </p>
          </div>
          <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setEditing(blank())}>
            Add project
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <SearchIcon size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" aria-label="Search projects" className="w-full rounded-control border border-rule-strong bg-paper-raised py-1.5 pl-8 pr-3 text-[13.5px] text-ink focus:border-rampart focus:outline-none" />
          </div>
          <select value={wt} onChange={(e) => setWt(e.target.value as WorkType | 'all')} className="rounded-control border border-rule-strong bg-paper-raised px-2.5 py-1.5 text-[13px] text-ink" aria-label="Work type filter">
            <option value="all">All work types</option>
            {WORK_TYPES.map((w) => <option key={w.id}>{w.id}</option>)}
          </select>
          <select value={svc} onChange={(e) => setSvc(e.target.value as ServiceId | 'all')} className="rounded-control border border-rule-strong bg-paper-raised px-2.5 py-1.5 text-[13px] text-ink" aria-label="Service filter">
            <option value="all">All services</option>
            {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span className="ml-auto text-[12.5px] text-ink-tertiary">{rows.length} of {projects.length}</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {rows.map((p) => (
            <article
              id={`proj-${p.id}`}
              key={p.id}
              className={`group flex flex-col rounded-panel border bg-paper-raised p-4 transition-colors ${focus === p.id ? 'border-rampart ring-2 ring-rampart/20' : 'border-rule hover:border-rule-strong'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="stamp text-rampart">{p.workType}</span>
                    <SourceTag source={p.source} />
                  </div>
                  <h3 className="mt-2 text-[15px] font-semibold leading-snug text-ink">{p.name}</h3>
                  <p className="text-[12.5px] text-ink-tertiary">{p.client}</p>
                </div>
                <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                  <button aria-label="Edit project" onClick={() => setEditing(p)} className="grid h-8 w-8 place-items-center rounded-control text-ink-tertiary hover:bg-paper-sunk hover:text-ink">
                    <EditIcon size={15} />
                  </button>
                  <button
                    aria-label="Delete project"
                    onClick={() => {
                      deleteProject(p.id);
                      toast(`Removed “${p.name}”`, 'info', { label: 'Undo', run: () => upsertProject(p) });
                    }}
                    className="grid h-8 w-8 place-items-center rounded-control text-ink-tertiary hover:bg-bad-wash hover:text-bad"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{p.summary}</p>
              {p.outcomes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {p.outcomes.slice(0, 3).map((o) => (
                    <li key={o} className="flex gap-2 text-[12.5px] text-ink-secondary">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-beacon" /> {o}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-rule pt-3 text-[12px] text-ink-tertiary [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1">
                <span><MapPinIcon size={13} /> {p.location}</span>
                <span><CalendarIcon size={13} /> {p.year}</span>
                <span><ClockIcon size={13} /> {p.durationWeeks} wks</span>
                <span><UsersIcon size={13} /> {fmtNum(p.peakHeadcount)} peak</span>
                <span><ShieldIcon size={13} /> {p.recordables} recordables</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.services.map((s) => (
                  <span key={s} className="rounded-full bg-paper-sunk px-2 py-0.5 text-[11.5px] text-ink-secondary">{serviceById(s).name}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
      {editing && (
        <ProjectForm
          value={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            upsertProject(p);
            setEditing(null);
            toast('Project saved. Bastion Assist can now cite it.', 'ok');
          }}
        />
      )}
    </div>
  );
}
