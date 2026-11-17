/**
 * App state: the signed-in (simulated) user, proposals, the experience library
 * and content blocks. Saved to this browser's localStorage so a demo survives a
 * refresh. A backend would replace `load`/`save` with API calls.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { draftSection, suggestWinThemes } from '@/ai/compose';
import { rankProjects } from '@/ai/match';
import { SECTION_TITLES, statById, templateById, USERS } from '@/data/company';
import { CONTENT_BLOCKS } from '@/data/content';
import { PAST_PROJECTS } from '@/data/projects';
import { addWeeks, todayIso, uid } from './format';
import type { ContentBlock, PastProject, Proposal, ProposalDraft, Section, User } from './types';

const KEY = 'bpg.state.v1';

interface Persisted {
  userId: string | null;
  proposals: Proposal[];
  projects: PastProject[];
  blocks: ContentBlock[];
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function save(s: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the app keeps working in memory */
  }
}

// ─── Seed pipeline so the dashboard is alive on first open ─────────────────

function seedProposal(
  over: Partial<ProposalDraft> & Pick<ProposalDraft, 'title' | 'client' | 'workType' | 'industry' | 'region' | 'services'>,
  status: Proposal['status'],
  owner: User,
  ageDays: number,
): Proposal {
  const now = Date.now();
  const created = new Date(now - ageDays * 86_400_000).toISOString();
  const draft: ProposalDraft = {
    site: '',
    location: '',
    contractType: 'Time & Materials',
    startDate: addWeeks(todayIso(), 10),
    durationWeeks: 6,
    peakHeadcount: 300,
    dueDate: addWeeks(todayIso(), 2),
    estimatedValue: 5_000_000,
    scopeNotes: '',
    rfpText: '',
    requirements: [],
    template: 'full',
    tone: 'Formal',
    selectedProjectIds: [],
    selectedStatIds: ['years', 'people', 'zero-sites', 'standby', 'scaffold-ontime'],
    winThemes: [],
    ...over,
  };
  draft.selectedProjectIds = rankProjects(draft)
    .slice(0, 3)
    .map((m) => m.project.id);
  draft.winThemes = suggestWinThemes(draft);
  const ctx = {
    p: draft,
    author: owner,
    projects: draft.selectedProjectIds.map((id) => PAST_PROJECTS.find((p) => p.id === id)!),
    stats: draft.selectedStatIds.map(statById).filter((s) => s !== undefined),
    blocks: CONTENT_BLOCKS,
  };
  const sections: Section[] = templateById(draft.template).sections.map((key) => ({
    id: uid('s'),
    key,
    title: SECTION_TITLES[key],
    body: draftSection(key, ctx),
    generatedAt: created,
  }));
  return {
    ...draft,
    id: uid('p'),
    sections,
    status,
    owner: owner.id,
    createdAt: created,
    updatedAt: new Date(now - Math.max(0, ageDays - 2) * 86_400_000).toISOString(),
    activity: [{ at: created, who: owner.name, what: 'Created proposal' }],
  };
}

function seed(): Persisted {
  const [jordan, maya, ray, dana] = USERS;
  const t = todayIso();
  const proposals = [
    seedProposal(
      {
        title: 'Lone Star Refining: Spring 2027 Hydrotreater Turnaround',
        client: 'Lone Star Refining',
        site: 'Neches River Refinery',
        location: 'Nederland, Texas',
        region: 'Gulf Coast',
        industry: 'Refining',
        workType: 'Turnaround',
        services: ['scaffolding', 'insulation', 'refractory', 'safety-services'],
        contractType: 'Unit Rate',
        peakHeadcount: 520,
        durationWeeks: 5,
        startDate: addWeeks(t, 18),
        dueDate: addWeeks(t, 1.3),
        estimatedValue: 14_200_000,
        template: 'turnaround',
        tone: 'Persuasive',
      },
      'review',
      jordan,
      6,
    ),
    seedProposal(
      {
        title: 'Calcasieu LNG: Train 3 Soft-Craft Package',
        client: 'Calcasieu LNG',
        site: 'Train 3 Expansion',
        location: 'Cameron Parish, Louisiana',
        region: 'Gulf Coast',
        industry: 'LNG',
        workType: 'Capital Project',
        services: ['scaffolding', 'insulation', 'coatings', 'technical-services'],
        contractType: 'Unit Rate',
        peakHeadcount: 850,
        durationWeeks: 96,
        startDate: addWeeks(t, 26),
        dueDate: addWeeks(t, 3),
        estimatedValue: 62_000_000,
        template: 'full',
      },
      'draft',
      maya,
      2,
    ),
    seedProposal(
      {
        title: 'Keystone Power: Unit 2 Fall Outage',
        client: 'Keystone Power',
        site: 'Keystone Generating Station',
        location: 'Shelocta, Pennsylvania',
        region: 'Northeast',
        industry: 'Power Generation',
        workType: 'Turnaround',
        services: ['scaffolding', 'insulation', 'abatement'],
        peakHeadcount: 180,
        durationWeeks: 4,
        dueDate: addWeeks(t, -2),
        estimatedValue: 3_400_000,
        template: 'turnaround',
      },
      'submitted',
      ray,
      21,
    ),
    seedProposal(
      {
        title: 'Bayou Olefins: Multi-Craft Maintenance MSA Renewal',
        client: 'Bayou Olefins',
        site: 'Channelview Complex',
        location: 'Channelview, Texas',
        region: 'Gulf Coast',
        industry: 'Petrochemical',
        workType: 'Maintenance',
        services: ['scaffolding', 'insulation', 'coatings', 'abatement'],
        contractType: 'Master Services Agreement',
        peakHeadcount: 380,
        durationWeeks: 156,
        dueDate: addWeeks(t, -6),
        estimatedValue: 41_000_000,
        template: 'maintenance',
      },
      'won',
      dana,
      48,
    ),
    seedProposal(
      {
        title: 'Northern Lights Energy: Upgrader Insulation Program',
        client: 'Northern Lights Energy',
        site: 'Upgrader',
        location: 'Fort Saskatchewan, Alberta',
        region: 'Western Canada',
        industry: 'Refining',
        workType: 'Maintenance',
        services: ['insulation', 'scaffolding'],
        peakHeadcount: 140,
        durationWeeks: 104,
        dueDate: addWeeks(t, -9),
        estimatedValue: 9_800_000,
        template: 'maintenance',
      },
      'lost',
      jordan,
      70,
    ),
  ];
  return { userId: null, proposals, projects: PAST_PROJECTS, blocks: CONTENT_BLOCKS };
}

// ─── Context ───────────────────────────────────────────────────────────────

interface Store {
  user: User | null;
  signIn: (u: User) => void;
  signOut: () => void;
  proposals: Proposal[];
  getProposal: (id: string) => Proposal | undefined;
  createProposal: (draft: ProposalDraft, sections: Section[]) => Proposal;
  updateProposal: (id: string, patch: Partial<Proposal> | ((p: Proposal) => Partial<Proposal>), activity?: string) => void;
  deleteProposal: (id: string) => void;
  duplicateProposal: (id: string) => Proposal | undefined;
  projects: PastProject[];
  upsertProject: (p: PastProject) => void;
  deleteProject: (id: string) => void;
  blocks: ContentBlock[];
  upsertBlock: (b: ContentBlock) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load() ?? seed());

  useEffect(() => {
    save(state);
  }, [state]);

  const user = USERS.find((u) => u.id === state.userId) ?? null;

  const updateProposal = useCallback<Store['updateProposal']>((id, patch, activity) => {
    setState((s) => ({
      ...s,
      proposals: s.proposals.map((p) => {
        if (p.id !== id) return p;
        const delta = typeof patch === 'function' ? patch(p) : patch;
        const who = USERS.find((u) => u.id === s.userId)?.name ?? 'Someone';
        return {
          ...p,
          ...delta,
          updatedAt: new Date().toISOString(),
          activity: activity ? [{ at: new Date().toISOString(), who, what: activity }, ...p.activity].slice(0, 50) : p.activity,
        };
      }),
    }));
  }, []);

  const store = useMemo<Store>(
    () => ({
      user,
      signIn: (u) => setState((s) => ({ ...s, userId: u.id })),
      signOut: () => setState((s) => ({ ...s, userId: null })),
      proposals: state.proposals,
      getProposal: (id) => state.proposals.find((p) => p.id === id),
      createProposal: (draft, sections) => {
        const now = new Date().toISOString();
        const p: Proposal = {
          ...draft,
          id: uid('p'),
          sections,
          status: 'draft',
          owner: state.userId ?? USERS[0].id,
          createdAt: now,
          updatedAt: now,
          activity: [{ at: now, who: user?.name ?? 'Someone', what: 'Created proposal with Bastion Assist' }],
        };
        setState((s) => ({ ...s, proposals: [p, ...s.proposals] }));
        return p;
      },
      updateProposal,
      deleteProposal: (id) => setState((s) => ({ ...s, proposals: s.proposals.filter((p) => p.id !== id) })),
      duplicateProposal: (id) => {
        const src = state.proposals.find((p) => p.id === id);
        if (!src) return undefined;
        const now = new Date().toISOString();
        const copy: Proposal = {
          ...structuredClone(src),
          id: uid('p'),
          title: `${src.title} (copy)`,
          status: 'draft',
          owner: state.userId ?? src.owner,
          createdAt: now,
          updatedAt: now,
          sections: src.sections.map((s) => ({ ...s, id: uid('s') })),
          activity: [{ at: now, who: user?.name ?? 'Someone', what: `Duplicated from “${src.title}”` }],
        };
        setState((s) => ({ ...s, proposals: [copy, ...s.proposals] }));
        return copy;
      },
      projects: state.projects,
      upsertProject: (p) =>
        setState((s) => ({
          ...s,
          projects: s.projects.some((x) => x.id === p.id) ? s.projects.map((x) => (x.id === p.id ? p : x)) : [p, ...s.projects],
        })),
      deleteProject: (id) => setState((s) => ({ ...s, projects: s.projects.filter((x) => x.id !== id) })),
      blocks: state.blocks,
      upsertBlock: (b) =>
        setState((s) => ({
          ...s,
          blocks: s.blocks.some((x) => x.id === b.id) ? s.blocks.map((x) => (x.id === b.id ? b : x)) : [...s.blocks, b],
        })),
      resetDemo: () => setState({ ...seed(), userId: state.userId }),
    }),
    [state, user, updateProposal],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
