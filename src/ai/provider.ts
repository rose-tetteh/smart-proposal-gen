/**
 * The AI boundary. Screens talk ONLY to `ai` (below), never to the rule
 * engines directly.
 *
 * `ai` is the live AmaliAI engine (ai/remote.ts), which falls back to the
 * built-in `LocalProposalAI` whenever no key is set or a live call fails.
 * `LocalProposalAI` runs fully in the browser with no keys, so the demo works
 * anywhere. Small artificial delays make its progress visible.
 */
import { SECTION_TITLES } from '@/data/company';
import type { ContentBlock, LiveStat, PastProject, Proposal, ProposalDraft, SectionKey, User } from '@/lib/types';
import { draftSection, suggestWinThemes } from './compose';
import { extractFromRfp, type RfpExtraction } from './extract';
import { rankProjects, type MatchInput, type ProjectMatch } from './match';
import { checkEngine } from './engine';
import { offlineFactCheck, type FactCheckResult } from './factcheck';
import { assessReadiness } from './quality';
import { RemoteProposalAI } from './remote';
import { rewriteSection, type RewriteOp } from './rewrite';

export interface DraftContext {
  author: User;
  projects: PastProject[];
  stats: LiveStat[];
  blocks: ContentBlock[];
}

export interface AssistReply {
  text: string;
  /** If set, Bastion Assist proposes this new body for a section. User accepts or rejects. */
  edit?: { sectionKey: SectionKey; body: string; summary: string };
  suggestions?: string[];
}

export interface ProposalAI {
  readonly name: string;
  extract(rfpText: string): Promise<RfpExtraction>;
  rank(input: MatchInput, library: PastProject[]): Promise<ProjectMatch[]>;
  winThemes(p: Pick<ProposalDraft, 'workType' | 'services' | 'industry' | 'requirements'>): Promise<string[]>;
  draft(key: SectionKey, p: ProposalDraft, ctx: DraftContext): Promise<string>;
  rewrite(body: string, op: RewriteOp, key: SectionKey, p: Proposal, projects: PastProject[]): Promise<string>;
  assist(message: string, p: Proposal, focus: SectionKey | undefined, ctx: DraftContext): Promise<AssistReply>;
  /** Flags claims in the draft that the facts, RFP and chosen evidence don't back up. */
  factCheck(p: Proposal, ctx: DraftContext): Promise<FactCheckResult>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SECTION_HINTS: [SectionKey, RegExp][] = [
  ['cover_letter', /cover|letter/i],
  ['executive_summary', /exec|summary|intro/i],
  ['understanding', /understand|scope/i],
  ['company_overview', /about|overview|company|who/i],
  ['services', /service|approach|method/i],
  ['experience', /experience|reference|project|case/i],
  ['live_performance', /live|performance|kpi|dashboard|stats?\b|metric/i],
  ['safety', /safety|safehold|trir|emr/i],
  ['quality', /quality|qms|iso|hold/i],
  ['workforce', /staff|workforce|headcount|labou?r|crew|union/i],
  ['schedule', /schedule|timeline|plan|phase/i],
  ['technology', /tech|pulse|3d|digital|model/i],
  ['commercial', /commercial|pric|cost|assumption|exclusion/i],
  ['why_bastion', /why bastion|closing|close/i],
];

const OP_HINTS: [RewriteOp, RegExp][] = [
  ['shorten', /short|trim|cut|condense|tighten|brief/i],
  ['expand', /expand|longer|more detail|elaborate|flesh/i],
  ['persuasive', /persua|strong|punch|sell|compelling|confident|win/i],
  ['formal', /formal|professional|procurement/i],
  ['proof', /proof|stat|number|evidence|data|figure/i],
  ['simplify', /simpl|plain|easier|clear/i],
];

export class LocalProposalAI implements ProposalAI {
  readonly name = 'Bastion Assist (offline engine)';

  async extract(rfpText: string) {
    await wait(900);
    return extractFromRfp(rfpText);
  }

  async rank(input: MatchInput, library: PastProject[]) {
    await wait(350);
    return rankProjects(input, library);
  }

  async winThemes(p: Pick<ProposalDraft, 'workType' | 'services' | 'industry' | 'requirements'>) {
    await wait(250);
    return suggestWinThemes(p);
  }

  async draft(key: SectionKey, p: ProposalDraft, ctx: DraftContext) {
    await wait(260 + Math.random() * 380);
    return draftSection(key, { p, ...ctx });
  }

  async rewrite(body: string, op: RewriteOp, key: SectionKey, p: Proposal, projects: PastProject[]) {
    await wait(500);
    return rewriteSection(body, op, key, p, projects);
  }

  async factCheck(p: Proposal, ctx: DraftContext) {
    await wait(700);
    return offlineFactCheck(p, ctx);
  }

  async assist(message: string, p: Proposal, focus: SectionKey | undefined, ctx: DraftContext): Promise<AssistReply> {
    await wait(650);
    const m = message.trim();

    if (/missing|ready|check|review|score|gap|complian/i.test(m)) {
      const r = assessReadiness(p);
      const open = r.checks.filter((c) => !c.ok);
      const uncovered = r.coverage.filter((c) => !c.covered).map((c) => c.req.text);
      return {
        text: open.length
          ? `Readiness is **${r.score}/100**. Still to do:\n${open.map((c) => `- ${c.label}: ${c.detail}`).join('\n')}${uncovered.length ? `\n\nRequirements not clearly answered yet:\n${uncovered.slice(0, 4).map((u) => `- ${u}`).join('\n')}` : ''}`
          : `Readiness is **${r.score}/100**. Everything on the checklist is green. Good to send for review.`,
        suggestions: ['Make the executive summary more persuasive', 'Add a proof point to safety'],
      };
    }

    if (/win theme|theme|differentiat/i.test(m)) {
      const themes = suggestWinThemes(p);
      return { text: `Win themes that fit this ${p.workType.toLowerCase()}:\n${themes.map((t) => `- ${t}`).join('\n')}\n\nYou can set them in **Details → Win themes**.` };
    }

    const exact = (Object.entries(SECTION_TITLES) as [SectionKey, string][]).find(([, t]) => m.includes(t))?.[0];
    const target = exact ?? SECTION_HINTS.find(([, re]) => re.test(m))?.[0] ?? focus;
    const section = p.sections.find((s) => s.key === target);
    const op = OP_HINTS.find(([, re]) => re.test(m))?.[0];
    const regen = /regenerat|redo|rewrite from scratch|start over|fresh/i.test(m);

    if (section && (op || regen)) {
      const body = regen ? draftSection(section.key, { p, ...ctx }) : rewriteSection(section.body, op!, section.key, p, ctx.projects);
      const what = regen ? 'a fresh draft of' : { shorten: 'a shorter', expand: 'an expanded', persuasive: 'a more persuasive', formal: 'a more formal', proof: 'a better-evidenced', simplify: 'a simpler' }[op!];
      return {
        text: `Here is ${what} version of **${SECTION_TITLES[section.key]}**. Review the change and apply it if you like it.`,
        edit: { sectionKey: section.key, body, summary: `${SECTION_TITLES[section.key]}: ${regen ? 'regenerated' : op}` },
      };
    }

    if (section && !op) {
      return {
        text: `What would you like me to do with **${SECTION_TITLES[section.key]}**?`,
        suggestions: ['Shorten it', 'Make it more persuasive', 'Add a proof point', 'Regenerate it'].map((s) => `${s} (${SECTION_TITLES[section.key]})`),
      };
    }

    return {
      text: `I can help you finish this proposal. Try:\n- "Make the safety section more persuasive"\n- "Shorten the executive summary"\n- "Add proof to the experience section"\n- "What's missing?"\n- "Suggest win themes"`,
    };
  }
}

export const ai: ProposalAI = new RemoteProposalAI(new LocalProposalAI());

checkEngine();
