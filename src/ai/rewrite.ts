/**
 * One-click section rewrites ("Shorten", "Make persuasive", "Add proof"...).
 * Rule-based for the offline demo; same signature an LLM call would have.
 */
import { LIVE_STATS } from '@/data/company';
import type { PastProject, Proposal, SectionKey } from '@/lib/types';

export type RewriteOp = 'shorten' | 'expand' | 'persuasive' | 'formal' | 'proof' | 'simplify';

export const REWRITE_OPS: { id: RewriteOp; label: string; hint: string }[] = [
  { id: 'shorten', label: 'Shorten', hint: 'Cut to the essentials' },
  { id: 'expand', label: 'Expand', hint: 'Add supporting detail' },
  { id: 'persuasive', label: 'More persuasive', hint: 'Lead with client benefit' },
  { id: 'formal', label: 'More formal', hint: 'Procurement-friendly tone' },
  { id: 'proof', label: 'Add proof point', hint: 'Insert a stat or result' },
  { id: 'simplify', label: 'Simplify', hint: 'Plain, short sentences' },
];

/** `attached` = this block followed the previous one with a single newline. */
type Block = { kind: 'p' | 'list' | 'table' | 'h'; lines: string[]; attached: boolean };

export function splitBlocks(md: string): Block[] {
  const out: Block[] = [];
  for (const raw of md.split(/\n{2,}/)) {
    let cur: Block | null = null;
    for (const l of raw.split('\n')) {
      const kind: Block['kind'] = l.startsWith('|') ? 'table' : l.startsWith('- ') ? 'list' : l.startsWith('### ') ? 'h' : 'p';
      // Plain lines inside one chunk (e.g. an address) stay one paragraph block.
      if (!cur || cur.kind !== kind || kind === 'h') {
        cur = { kind, lines: [], attached: cur !== null };
        out.push(cur);
      }
      cur.lines.push(l);
    }
  }
  return out;
}

export function joinBlocks(blocks: Block[]) {
  let out = '';
  blocks.forEach((b, i) => {
    if (!b.lines.length) return;
    const text = b.lines.join('\n');
    out += i === 0 ? text : `${b.attached ? '\n' : '\n\n'}${text}`;
  });
  return out;
}

const sentences = (s: string) => s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((x) => x.trim()) ?? [s];

function shorten(md: string) {
  return joinBlocks(
    splitBlocks(md).map((b) => {
      if (b.kind === 'p') return { ...b, lines: b.lines.map((l) => sentences(l).slice(0, 1).join(' ')) };
      if (b.kind === 'list') return { ...b, lines: b.lines.slice(0, Math.max(2, Math.ceil(b.lines.length / 2))) };
      return b;
    }),
  );
}

function simplify(md: string) {
  return md
    .split('\n')
    .map((l) =>
      l.startsWith('|')
        ? l
        : l
            .replace(/, and /g, '. And ')
            .replace(/\bin order to\b/gi, 'to')
            .replace(/\butili[sz]e\b/gi, 'use')
            .replace(/\bcommence\b/gi, 'start')
            .replace(/\bfacilitate\b/gi, 'help')
            .replace(/\bapproximately\b/gi, 'about')
            .replace(/\. And /g, '. ')
            .replace(/(^|\. )([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase()),
    )
    .join('\n');
}

function formal(md: string) {
  return md
    .replace(/\bwe'll\b/gi, 'we will')
    .replace(/\bwe're\b/gi, 'we are')
    .replace(/\bdon't\b/gi, 'do not')
    .replace(/\bcan't\b/gi, 'cannot')
    .replace(/\bit's\b/gi, 'it is')
    .replace(/\bthat's\b/gi, 'that is')
    .replace(/!/g, '.')
    .replace(/\bexactly\b/gi, 'precisely')
    .replace(/\bget\b/g, 'receive')
    .replace(/\bjob\b/g, 'scope of work');
}

function persuasive(md: string, client: string) {
  const lead = `**The result for ${client}: a safer job, a protected schedule and no surprises on cost.**`;
  const body = md
    .replace(/\bWe will\b/g, 'We commit to')
    .replace(/\bBastion proposes\b/g, 'Bastion will deliver')
    .replace(/\bcan help\b/g, 'will')
    .replace(/\baims to\b/g, 'will');
  return body.startsWith('**The result') ? body : `${lead}\n\n${body}`;
}

const EXPANSIONS: Partial<Record<SectionKey, (c: string) => string>> = {
  safety: (c) => `Our site leadership will meet the ${c} safety team daily, share leading indicators (observations, near misses, stop-work calls) weekly, and review every incident within 24 hours.`,
  schedule: (c) => `Progress will be reported to ${c} every shift through Bastion Track and SiteSight, so any slip on the critical path is visible within hours, not days.`,
  services: (c) => `All crafts will work from shared work-packs, so ${c} has one point of contact for access, insulation and coatings interfaces.`,
  workforce: (c) => `Key supervision will be named before award and will stay on the ${c} project for its full duration.`,
  experience: (c) => `Each reference above can be visited or called on request, and the project managers are available to brief ${c} directly.`,
  technology: (c) => `${c} will have read access to the project's Bastion Track and SiteSight dashboards from day one.`,
  quality: (c) => `Non-conformances will be logged, root-caused and closed with ${c}'s quality team, with trends reviewed monthly.`,
};

function expand(md: string, key: SectionKey, client: string) {
  const extra = EXPANSIONS[key]?.(client) ?? `Bastion will assign a dedicated project manager as the single point of contact for ${client} throughout the work.`;
  return md.includes(extra) ? md : `${md}\n\n${extra}`;
}

function proof(md: string, projects: PastProject[]) {
  const stat = LIVE_STATS.find((s) => !md.includes(s.value));
  const outcome = projects.flatMap((p) => p.outcomes.map((o) => `${o} (${p.name})`)).find((o) => !md.includes(o.split(' (')[0]));
  const line = outcome ? `- **Proof point:** ${outcome}` : stat ? `- **Proof point:** ${stat.value} ${stat.label.toLowerCase()}: ${stat.detail}` : '';
  return line ? `${md}\n\n${line}` : md;
}

export function rewriteSection(md: string, op: RewriteOp, key: SectionKey, p: Pick<Proposal, 'client'>, projects: PastProject[]) {
  switch (op) {
    case 'shorten':
      return shorten(md);
    case 'expand':
      return expand(md, key, p.client);
    case 'persuasive':
      return persuasive(md, p.client);
    case 'formal':
      return formal(md);
    case 'proof':
      return proof(md, projects);
    case 'simplify':
      return simplify(md);
  }
}
