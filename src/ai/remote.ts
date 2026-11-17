/**
 * Live engine: the same `ProposalAI` contract, answered by an AmaliAI model
 * through the local proxy.
 *
 * Every method falls back to the offline engine if the live call fails, so a
 * demo never breaks. Project ranking stays rule-based: it is fast, explainable
 * and already shows its reasons.
 *
 * The honesty rule carries over: the model gets a fact sheet and is told to
 * write [[placeholders]] for anything not on it. Section drafts also get the
 * offline draft as a starting point, which pins the approved facts, tables and
 * placeholders while the model tailors the writing to the RFP.
 */
import {
  COMPANY,
  CONTRACT_TYPES,
  INDUSTRIES,
  REGIONS,
  SECTION_TITLES,
  SERVICES,
  serviceById,
  statById,
  WORK_TYPES,
} from '@/data/company';
import type { LiveStat, PastProject, Proposal, ProposalDraft, Requirement, SectionKey, ServiceId } from '@/lib/types';
import { chat, getEngine, modelFor, reportFailure, type ChatMessage, type Job } from './engine';
import type { FactCheckResult, FactIssue } from './factcheck';
import type { RfpExtraction } from './extract';
import type { MatchInput } from './match';
import type { AssistReply, DraftContext, ProposalAI } from './provider';
import { assessReadiness, PLACEHOLDER_RE } from './quality';
import type { RewriteOp } from './rewrite';

const SECTION_KEYS = Object.keys(SECTION_TITLES) as SectionKey[];
const REQ_CATEGORIES: Requirement['category'][] = ['Submission', 'Safety', 'Technical', 'Commercial', 'Schedule', 'Staffing', 'Quality'];
const RFP_LIMIT = 14_000;

const RULES = `You are Bastion Assist, the proposal writer for Bastion, a North American specialty industrial contractor (scaffolding, insulation, coatings, refractory, abatement, fireproofing and related services for refineries, petrochemical, LNG and power plants).

HONESTY RULE (most important):
- Use only facts given to you in FACTS, the RFP, or the existing text. Never invent numbers, names, dates, people, contacts, certifications, safety statistics (TRIR, EMR), prices or project results.
- If something a client would expect is not in the facts, write a short placeholder in double square brackets, e.g. [[TRIR for 2025]] or [[Reference contact]].
- Keep every [[placeholder]] that is already in the text unless FACTS gives the real value.
- Figures marked "sample" must keep their † marker.

FORMAT: write in a small Markdown subset only: paragraphs, "- " bullets, "### " subheadings, **bold**, and pipe tables with a header separator row. No "#" or "##" headings, no numbered lists, no italics, no links, no code fences. Do not repeat the section title. Use US English.`;

const OP_TEXT: Record<RewriteOp, string> = {
  shorten: 'Make it about half as long. Keep the most important facts, every table and every [[placeholder]].',
  expand: 'Make it fuller and more specific, using only FACTS. Add [[placeholders]] where a real detail is needed but not known.',
  persuasive: 'Make it more persuasive: lead with the client benefit, use confident active language, and end with a strong line.',
  formal: 'Make it more formal and procurement-friendly: measured, precise, third person, no hype.',
  proof: 'Add one or two proof points taken only from FACTS (project outcomes, live stats, Bastion Lens results, awards). Do not invent any.',
  simplify: 'Rewrite in plain English with short sentences and common words, keeping all facts.',
};

// ─── Helpers ────────────────────────────────────────────────────────────

/** Strips code fences and maps stray Markdown onto the subset the app renders. */
export function cleanSection(text: string, title?: string) {
  let t = text.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  t = t
    .split('\n')
    .map((l) => l.replace(/^#{1,6}\s+/, '### ').replace(/^\s*\d+[.)]\s+/, '- ').replace(/^\s*\*\s+/, '- '))
    .join('\n');
  // Drop a leading heading that just repeats the section title ("### Safety" for "Safety Performance: SafeHold").
  const first = t.match(/^### (.+)\n+/);
  if (title && first && title.toLowerCase().includes(first[1].replace(/\**/g, '').trim().toLowerCase())) t = t.slice(first[0].length);
  return t.trim();
}

function parseJson<T>(text: string): T {
  const t = text.replace(/```(?:json)?/gi, '');
  const start = t.search(/[[{]/);
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (start < 0 || end < start) throw new Error('Model did not return JSON');
  return JSON.parse(t.slice(start, end + 1)) as T;
}

const placeholders = (s: string) => [...new Set(s.match(PLACEHOLDER_RE) ?? [])];

function companyFacts() {
  return {
    name: COMPANY.name,
    tagline: COMPANY.tagline,
    years: COMPANY.years,
    employees: COMPANY.employees,
    facilities: COMPANY.facilities,
    craftHoursPerYear: COMPANY.annualHours,
    headquarters: COMPANY.hq,
    coverage: COMPANY.coverage,
    mission: COMPANY.mission,
    vision: COMPANY.vision,
    heritage: COMPANY.heritage,
    safetyAwards: COMPANY.awards.map((a) => `${a.value}: ${a.label}`),
    techResults: COMPANY.techResults.map((r) => `${r.value} ${r.label}`),
  };
}

function projectFacts(projects: PastProject[]) {
  return projects.map(({ id: _id, ...x }) => ({ ...x, services: x.services.map((s) => serviceById(s).name) }));
}

function statFacts(stats: LiveStat[]) {
  return stats.map((s) => ({ label: s.label, value: s.value, detail: s.detail, source: s.source === 'sample' ? 'sample †' : 'verified' }));
}

function opportunity(p: ProposalDraft) {
  return {
    title: p.title,
    client: p.client,
    site: p.site,
    location: p.location,
    region: p.region,
    industry: p.industry,
    workType: p.workType,
    services: p.services.map((s) => serviceById(s).name),
    contractType: p.contractType,
    startDate: p.startDate || null,
    durationWeeks: p.durationWeeks || null,
    peakHeadcount: p.peakHeadcount || null,
    proposalDueDate: p.dueDate || null,
    scopeNotes: p.scopeNotes || null,
    winThemes: p.winThemes,
    tone: p.tone,
  };
}

function factSheet(p: ProposalDraft, ctx: Partial<DraftContext> & { projects: PastProject[]; stats: LiveStat[] }) {
  const facts = {
    company: companyFacts(),
    opportunity: opportunity(p),
    servicesOffered: p.services.map((id) => {
      const s = serviceById(id);
      return { name: s.name, summary: s.blurb, approach: s.approach };
    }),
    selectedPastProjects: projectFacts(ctx.projects),
    liveStats: statFacts(ctx.stats),
    approvedContent: (ctx.blocks ?? []).filter((b) => b.approved).map((b) => ({ title: b.title, text: b.body })),
    rfpRequirements: p.requirements.map((r) => ({ text: r.text, answeredIn: SECTION_TITLES[r.section] })),
    author: ctx.author ? { name: ctx.author.name, title: ctx.author.title, unit: ctx.author.unit, email: ctx.author.email } : undefined,
  };
  const rfp = p.rfpText.trim() ? `\n\nRFP TEXT:\n"""\n${p.rfpText.slice(0, RFP_LIMIT)}${p.rfpText.length > RFP_LIMIT ? '\n[RFP truncated]' : ''}\n"""` : '';
  return `FACTS:\n${JSON.stringify(facts, null, 1)}${rfp}`;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export class RemoteProposalAI implements ProposalAI {
  /** `local` is the offline engine: it answers whenever the live one can't. */
  constructor(private readonly local: ProposalAI) {}

  get name() {
    const e = getEngine();
    return e.mode === 'live' ? `Bastion Assist (AmaliAI · ${modelFor('write', e)})` : this.local.name;
  }

  /** Runs `live` when the live engine is on, else (or on failure) the offline engine. */
  private async run<T>(live: () => Promise<T>, offline: () => Promise<T>): Promise<T> {
    if (getEngine().mode !== 'live') return offline();
    try {
      return await live();
    } catch (e) {
      reportFailure(e);
      return offline();
    }
  }

  /** One request for a job; the proxy picks the model from .env. */
  private ask(job: Job, user: string, opts?: { temperature?: number }) {
    const messages: ChatMessage[] = [
      { role: 'system', content: RULES },
      { role: 'user', content: user },
    ];
    return chat(job, messages, opts);
  }

  extract(rfpText: string): Promise<RfpExtraction> {
    return this.run(
      async () => {
        const base = await this.local.extract(rfpText);
        const raw = (await this.ask(
          'extract',
          `Read this RFP and return ONLY a JSON object with these keys (omit a key or use null when the RFP does not say):
{
 "title": "short proposal title, e.g. '<Site>: <Season Year> <Unit> Turnaround'",
 "client": string, "site": string, "location": "City, State/Province",
 "region": one of ${JSON.stringify(REGIONS)},
 "industry": one of ${JSON.stringify(INDUSTRIES)},
 "workType": one of ${JSON.stringify(WORK_TYPES.map((w) => w.id))},
 "services": array of ids from ${JSON.stringify(SERVICES.map((s) => s.id))},
 "contractType": one of ${JSON.stringify(CONTRACT_TYPES)},
 "startDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD (proposal submission deadline)",
 "durationWeeks": number, "peakHeadcount": number,
 "requirements": [ { "text": "one obligation the contractor must meet, quoted or tightly paraphrased", "category": one of ${JSON.stringify(REQ_CATEGORIES)}, "section": one of ${JSON.stringify(SECTION_KEYS)} } ]
}
List every distinct shall/must/required obligation as a requirement. Do not guess values.

RFP:
"""
${rfpText.slice(0, RFP_LIMIT)}
"""`,
          { temperature: 0 },
        )).content;
        return mergeExtraction(base, parseJson<Record<string, unknown>>(raw));
      },
      () => this.local.extract(rfpText),
    );
  }

  rank(input: MatchInput, library: PastProject[]) {
    return this.local.rank(input, library);
  }

  winThemes(p: Pick<ProposalDraft, 'workType' | 'services' | 'industry' | 'requirements'>) {
    return this.run(
      async () => {
        const raw = (await this.ask(
          'assist',
          `Suggest 4 win themes for a Bastion proposal. Each is one line (max 16 words): a client benefit backed by a Bastion strength from FACTS. Return ONLY a JSON array of strings.

FACTS:
${JSON.stringify({ company: companyFacts(), workType: p.workType, industry: p.industry, services: p.services.map((s) => serviceById(s).name), requirements: p.requirements.map((r) => r.text) }, null, 1)}`,
          { temperature: 0.6 },
        )).content;
        const themes = parseJson<unknown[]>(raw).filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
        if (!themes.length) throw new Error('No win themes returned');
        return themes.slice(0, 4).map((t) => t.trim());
      },
      () => this.local.winThemes(p),
    );
  }

  draft(key: SectionKey, p: ProposalDraft, ctx: DraftContext) {
    return this.run(
      async () => {
        const baseline = await this.local.draft(key, p, ctx);
        const keep = placeholders(baseline);
        const reqs = p.requirements.filter((r) => r.section === key);
        const body = (await this.ask(
          'write',
          `${factSheet(p, ctx)}

Write the "${SECTION_TITLES[key]}" section of this proposal for ${p.client || 'the client'}. Tone: ${p.tone}.
${reqs.length ? `This section must clearly answer these RFP requirements:\n${reqs.map((r) => `- ${r.text}`).join('\n')}\n` : ''}
Below is a starting draft built only from approved facts. Improve the writing and tailor it to this client and RFP. Keep its facts, figures and tables accurate; you may restructure, tighten or add points that FACTS supports.${keep.length ? `\nThese placeholders must stay in your answer exactly as written: ${keep.join(' ')}` : ''}

STARTING DRAFT:
"""
${baseline}
"""

Return only the section body.`,
          { temperature: 0.5 },
        )).content;
        return cleanSection(body, SECTION_TITLES[key]);
      },
      () => this.local.draft(key, p, ctx),
    );
  }

  rewrite(body: string, op: RewriteOp, key: SectionKey, p: Proposal, projects: PastProject[]) {
    return this.run(
      async () => {
        const stats = p.selectedStatIds.map(statById).filter((s) => s !== undefined);
        const out = (await this.ask(
          'assist',
          `${factSheet(p, { projects, stats })}

Rewrite the "${SECTION_TITLES[key]}" section below. ${OP_TEXT[op]}

SECTION:
"""
${body}
"""

Return only the rewritten section body.`,
          { temperature: 0.5 },
        )).content;
        return cleanSection(out, SECTION_TITLES[key]);
      },
      () => this.local.rewrite(body, op, key, p, projects),
    );
  }

  assist(message: string, p: Proposal, focus: SectionKey | undefined, ctx: DraftContext): Promise<AssistReply> {
    return this.run(
      async () => {
        const r = assessReadiness(p);
        const doc = p.sections.map((s) => `=== ${s.key} | ${s.title} ===\n${s.body}`).join('\n\n');
        const status = {
          readinessScore: `${r.score}/100`,
          openChecks: r.checks.filter((c) => !c.ok).map((c) => `${c.label}: ${c.detail}`),
          requirementsNotCovered: r.coverage.filter((c) => !c.covered).map((c) => c.req.text),
          placeholdersToFill: r.placeholders,
        };
        const raw = (await this.ask(
          'assist',
          `${factSheet(p, ctx)}

CURRENT PROPOSAL (sections are headed "=== key | title ==="):
${doc}

READINESS CHECK:
${JSON.stringify(status, null, 1)}

${focus ? `The user is looking at the "${SECTION_TITLES[focus]}" section (${focus}).\n` : ''}USER REQUEST: ${message}

Reply with ONLY a JSON object:
{
 "reply": "your answer to the user, short, in the Markdown subset",
 "edit": null, or { "sectionKey": one of ${JSON.stringify(p.sections.map((s) => s.key))}, "body": "the full new section body", "summary": "e.g. 'Safety: more persuasive'" },
 "suggestions": up to 3 short follow-up requests the user might send next
}
Propose an edit only when the user asks to change the text. Answer questions about readiness from READINESS CHECK.`,
          { temperature: 0.4 },
        )).content;
        return toAssistReply(raw, p);
      },
      () => this.local.assist(message, p, focus, ctx),
    );
  }

  factCheck(p: Proposal, ctx: DraftContext): Promise<FactCheckResult> {
    return this.run(
      async () => {
        // A whole draft in one request is too slow for the checking models, so check a few sections
        // per request, in parallel (the engine runs up to 4 at a time), and merge the findings.
        const facts = factSheet(p, ctx);
        const results = await Promise.all(
          batchSections(p.sections).map(async (batch) => {
            const doc = batch.map((s) => `=== ${s.key} ===\n${s.body}`).join('\n\n');
            const { content, model } = await chat(
              'factcheck',
              [
                { role: 'system', content: FACT_CHECK_RULES },
                {
                  role: 'user',
                  content: `${facts}

PROPOSAL SECTIONS TO CHECK (headed "=== key ==="):
${doc}

Return ONLY a JSON object:
{ "issues": [ { "section": one of ${JSON.stringify(batch.map((s) => s.key))}, "quote": "the claim, copied exactly from the draft", "problem": "one sentence: what FACTS says, or that FACTS says nothing about it", "kind": "unsupported" or "contradicted" } ] }
Return { "issues": [] } if every claim is backed up.`,
                },
              ],
              { temperature: 0 },
            );
            return { issues: parseIssues(content, batch), model };
          }),
        );
        const issues = results.flatMap((r) => r.issues).map((x, i) => ({ ...x, id: `fc-${i + 1}` }));
        return { issues, checkedBy: [...new Set(results.map((r) => r.model))].join(', '), live: true, at: new Date().toISOString() };
      },
      () => this.local.factCheck(p, ctx),
    );
  }
}

/** Groups sections into batches of roughly FACT_CHECK_WORDS words, keeping document order. */
const FACT_CHECK_WORDS = 1000;
function batchSections(sections: Proposal['sections']) {
  const batches: Proposal['sections'][] = [];
  let words = Infinity;
  for (const s of sections) {
    const n = s.body.split(/\s+/).length;
    if (words + n > FACT_CHECK_WORDS) {
      batches.push([]);
      words = 0;
    }
    batches[batches.length - 1].push(s);
    words += n;
  }
  return batches;
}

const FACT_CHECK_RULES = `You are a strict fact checker reviewing a proposal from Bastion, an industrial contractor, before it is sent to a client. Bastion is legally and commercially bound by what it claims.

Find every factual claim in the draft that FACTS and the RFP do not support, or that contradicts them. Factual claims include numbers, percentages, dates, durations, headcounts, safety statistics, awards, certifications, client or project names, project results, and statements that something happened.

Do NOT flag:
- [[double-bracket placeholders]]: they are already marked for the writer to fill in.
- Statements of intent or approach (what Bastion will do on this project) and general opinions.
- Bastion's own proposed plan for this project: schedule phases and their dates, staffing levels, crew ratios and methods. These are Bastion's offer, not claims about the past.
- Figures that are simple arithmetic from FACTS, e.g. foremen at 1 per 10 craft, or dates computed from the start date and duration.
- Figures marked † as sample: they are already flagged.

Quote each claim exactly as it appears in the draft, at most 25 words. Be precise: a missed false claim is worse than an extra flag, but do not flag things FACTS clearly supports.`;

/** Reads one batch's findings; ids are assigned after the batches are merged. */
function parseIssues(raw: string, sections: Proposal['sections']): Omit<FactIssue, 'id'>[] {
  const j = parseJson<{ issues?: unknown }>(raw);
  if (!Array.isArray(j.issues)) throw new Error('Fact check did not return an issues list');
  const keys = sections.map((s) => s.key);
  return j.issues
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => {
      const quote = text(x.quote)?.replace(/^["“]|["”]$/g, '') ?? '';
      // Models sometimes misname the section: fall back to the one that contains the quote.
      const named = oneOf(x.section, keys);
      const sectionKey = named && sections.find((s) => s.key === named)?.body.includes(quote) ? named : (sections.find((s) => quote && s.body.includes(quote))?.key ?? named);
      return sectionKey && quote
        ? { sectionKey, quote, problem: text(x.problem) ?? 'Not backed up by the facts.', kind: x.kind === 'contradicted' ? ('contradicted' as const) : ('unsupported' as const) }
        : null;
    })
    .filter((x) => x !== null);
}

function toAssistReply(raw: string, p: Proposal): AssistReply {
  let j: { reply?: unknown; edit?: { sectionKey?: unknown; body?: unknown; summary?: unknown } | null; suggestions?: unknown };
  try {
    j = parseJson(raw);
  } catch {
    // Model answered in prose instead of JSON: show it as a plain reply.
    return { text: cleanSection(raw) };
  }
  const reply: AssistReply = { text: typeof j.reply === 'string' && j.reply.trim() ? cleanSection(j.reply) : 'Done.' };
  const e = j.edit;
  const key = e && typeof e.sectionKey === 'string' ? (e.sectionKey as SectionKey) : undefined;
  if (e && key && p.sections.some((s) => s.key === key) && typeof e.body === 'string' && e.body.trim()) {
    reply.edit = {
      sectionKey: key,
      body: cleanSection(e.body, SECTION_TITLES[key]),
      summary: typeof e.summary === 'string' && e.summary ? e.summary : `${SECTION_TITLES[key]}: edited`,
    };
  }
  if (Array.isArray(j.suggestions)) reply.suggestions = j.suggestions.filter((s): s is string => typeof s === 'string').slice(0, 3);
  return reply;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const oneOf = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const count = (v: unknown) => (typeof v === 'number' && v > 0 && v < 100_000 ? Math.round(v) : undefined);

/** Takes the model's valid answers, keeps the offline reader's where the model said nothing usable. */
function mergeExtraction(base: RfpExtraction, m: Record<string, unknown>): RfpExtraction {
  const serviceIds = SERVICES.map((s) => s.id);
  const services = Array.isArray(m.services) ? [...new Set(m.services.map((s) => oneOf(s, serviceIds)).filter((s): s is ServiceId => !!s))] : [];
  const requirements: Requirement[] = Array.isArray(m.requirements)
    ? m.requirements
        .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !!text((r as Record<string, unknown>).text))
        .map((r, i) => ({
          id: `r${i + 1}`,
          text: text(r.text)!.slice(0, 220),
          category: oneOf(r.category, REQ_CATEGORIES) ?? 'Technical',
          section: oneOf(r.section, SECTION_KEYS) ?? 'services',
        }))
    : [];

  const out: RfpExtraction = {
    title: text(m.title) ?? base.title,
    client: text(m.client) ?? base.client,
    site: text(m.site) ?? base.site,
    location: text(m.location) ?? base.location,
    region: oneOf(m.region, REGIONS) ?? base.region,
    industry: oneOf(m.industry, INDUSTRIES) ?? base.industry,
    workType: oneOf(m.workType, WORK_TYPES.map((w) => w.id)) ?? base.workType,
    services: services.length ? services : base.services,
    contractType: oneOf(m.contractType, CONTRACT_TYPES) ?? base.contractType,
    startDate: typeof m.startDate === 'string' && ISO_DATE.test(m.startDate) ? m.startDate : base.startDate,
    dueDate: typeof m.dueDate === 'string' && ISO_DATE.test(m.dueDate) ? m.dueDate : base.dueDate,
    durationWeeks: count(m.durationWeeks) ?? base.durationWeeks,
    peakHeadcount: count(m.peakHeadcount) ?? base.peakHeadcount,
    requirements: requirements.length ? requirements : base.requirements,
    found: [],
  };

  const labels: [keyof RfpExtraction, string][] = [
    ['client', 'Client'],
    ['site', 'Site'],
    ['location', 'Location'],
    ['region', 'Region'],
    ['industry', 'Industry'],
    ['workType', 'Work type'],
    ['contractType', 'Contract type'],
    ['startDate', 'Start date'],
    ['dueDate', 'Due date'],
    ['durationWeeks', 'Duration'],
    ['peakHeadcount', 'Peak headcount'],
  ];
  out.found = labels.filter(([k]) => out[k] !== undefined).map(([, l]) => l);
  if (out.services.length) out.found.splice(5, 0, `${out.services.length} services`);
  if (out.requirements.length) out.found.push(`${out.requirements.length} requirements`);
  return out;
}
