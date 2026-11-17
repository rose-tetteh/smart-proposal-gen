/**
 * Fact check: before export, look for claims in the draft that Bastion's facts,
 * the RFP and the chosen evidence don't back up.
 *
 * The live engine asks a model from a different maker than the writer (see
 * AMALIAI_MODEL_FACTCHECK in .env). The offline check below is narrower: it flags any number
 * in the draft that appears nowhere in the facts, the RFP or the offline
 * engine's own draft (whose figures are all computed from the facts).
 */
import { COMPANY, SERVICES } from '@/data/company';
import type { Proposal, SectionKey } from '@/lib/types';
import { draftSection } from './compose';
import type { DraftContext } from './provider';
import { PLACEHOLDER_RE } from './quality';

export interface FactIssue {
  id: string;
  sectionKey: SectionKey;
  /** The claim, quoted from the section. */
  quote: string;
  problem: string;
  kind: 'unsupported' | 'contradicted';
}

export interface FactCheckResult {
  issues: FactIssue[];
  /** Model name, or "offline number check". */
  checkedBy: string;
  live: boolean;
  at: string;
}

/** Marks a claim for the writer to confirm. The Checklist then lists it under "Needs your input". */
export const CONFIRM_PREFIX = 'Confirm: ';

/** Changes whenever any section's text changes, so a check can tell it is out of date. */
export function draftSignature(sections: Proposal['sections']) {
  let h = 0;
  for (const ch of sections.map((s) => `${s.id}\u0000${s.body}`).join('\u0001')) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0;
  return `${sections.length}:${h}`;
}

/** A number, optionally followed by its unit ("3 days", "37 fewer craft", "98%"). */
const CLAIM = /(\d[\d,]*(?:\.\d+)?)(?:\s?(%)|[\s-]+(?:(?:fewer|more|less|additional|consecutive|straight)\s+)?([a-z]+))?/gi;
const UNIT = /^(percent|day|week|month|year|hour|craft|people|worker|employee|personnel|facilit|site|award|project|turnaround|outage|recordable|incident|million)/;
const norm = (n: string) => n.replace(/,/g, '').replace(/\.0+$/, '');

/** Each figure as "<number>" and, when it has a unit, "<number> <unit>". */
function figures(text: string) {
  const out: { n: string; unit?: string }[] = [];
  for (const m of text.matchAll(CLAIM)) {
    // Abbreviations count as their unit: the experience table says "7 wks", prose says "7 weeks".
    const word = m[2] ? 'percent' : m[3]?.toLowerCase().replace(/^wks?$/, 'week').replace(/^hrs?$/, 'hour').replace(/^yrs?$/, 'year');
    out.push({ n: norm(m[1]), unit: word && UNIT.exec(word)?.[1] });
  }
  return out;
}

/** Record ids and timestamps are full of digits that aren't facts. */
const notFacts = (k: string, v: unknown) => (/^(id|createdAt|updatedAt|at|generatedAt|activity|sections|owner|selected\w*Ids|trend)$/.test(k) ? undefined : v);

export function offlineFactCheck(p: Proposal, ctx: DraftContext): FactCheckResult {
  const corpus = [
    JSON.stringify(COMPANY),
    JSON.stringify(SERVICES.filter((s) => p.services.includes(s.id))),
    JSON.stringify([ctx.projects, ctx.stats, ctx.blocks, p], notFacts),
    ...p.sections.map((s) => draftSection(s.key, { p, ...ctx })),
  ].join('\n');
  const known = new Set<string>();
  for (const f of figures(corpus)) {
    known.add(f.n);
    if (f.unit) known.add(`${f.n} ${f.unit}`);
  }
  // Single-digit figures are everywhere, so they only count as backed up with the same unit.
  const backed = (f: { n: string; unit?: string }) => (f.n.length > 1 ? known.has(f.n) : !f.unit || known.has(`${f.n} ${f.unit}`));

  const issues: FactIssue[] = [];
  for (const s of p.sections) {
    const text = s.body.replace(PLACEHOLDER_RE, ' ');
    // Table cells count as separate claims, so a fix never spans cells.
    const sentences = text.split(/(?<=[.!?])\s+|\n+|\s*\|\s*/);
    for (const sentence of sentences) {
      const unknown = [...new Set(figures(sentence).filter((f) => !backed(f)).map((f) => f.n))];
      if (!unknown.length) continue;
      const quote = sentence.replace(/^[-|#\s]+/, '').trim();
      if (!quote || !s.body.includes(quote)) continue;
      issues.push({
        id: `fc-${issues.length + 1}`,
        sectionKey: s.key,
        quote,
        problem: `${unknown.join(', ')} ${unknown.length > 1 ? "don't" : "doesn't"} appear in Bastion's facts, the RFP or the chosen evidence.`,
        kind: 'unsupported',
      });
    }
  }
  return { issues, checkedBy: 'offline number check', live: false, at: new Date().toISOString() };
}
