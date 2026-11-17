/**
 * Readiness check: is this proposal ready to send? Produces a 0–100 score,
 * a checklist with one-click fixes, and requirement-by-requirement coverage.
 */
import { statById } from '@/data/company';
import { daysUntil, wordCount } from '@/lib/format';
import type { Proposal, Requirement } from '@/lib/types';

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  weight: number;
  fix?: 'placeholders' | 'evidence' | 'generate' | 'requirements' | 'stats';
}

export interface Coverage {
  req: Requirement;
  covered: boolean;
}

export interface Readiness {
  score: number;
  checks: Check[];
  coverage: Coverage[];
  placeholders: number;
  words: number;
  pages: number;
  proofPoints: number;
}

const STOP = new Set(
  'contractor contractors shall must provide proposal proposals include including describe required requirement submit should their which with from that this have will each other within these those about approximately'.split(' '),
);

const keywords = (s: string) =>
  [...new Set((s.toLowerCase().match(/[a-z0-9][a-z0-9-]{3,}/g) ?? []).filter((w) => !STOP.has(w)))];

export const PLACEHOLDER_RE = /\[\[([^\]]+)\]\]/g;

export function assessReadiness(p: Proposal): Readiness {
  const all = p.sections.map((s) => s.body).join('\n\n');
  const lower = all.toLowerCase();
  const placeholders = (all.match(PLACEHOLDER_RE) ?? []).length;
  const words = wordCount(all.replace(PLACEHOLDER_RE, ''));
  const proofPoints = (all.match(/\b\d[\d,.]*\s?(%|\+|M\b|million|hours|craft|weeks|awards?)/gi) ?? []).length;

  const coverage: Coverage[] = p.requirements.map((req) => {
    const kws = keywords(req.text);
    const inSection = p.sections.some((s) => s.key === req.section && s.body.trim().length > 40);
    const hit = kws.filter((k) => lower.includes(k)).length;
    return { req, covered: inSection && (kws.length === 0 || hit / kws.length >= 0.45) };
  });
  const coveredN = coverage.filter((c) => c.covered).length;

  const empty = p.sections.filter((s) => s.body.trim().length < 20);
  const due = daysUntil(p.dueDate);
  const sampleStats = p.selectedStatIds.map(statById).filter((s) => s?.source === 'sample').length;
  const execText = p.sections.find((s) => s.key === 'executive_summary' || s.key === 'cover_letter')?.body ?? '';

  const checks: Check[] = [
    {
      id: 'drafted',
      label: 'Every section drafted',
      ok: p.sections.length > 0 && empty.length === 0,
      detail: empty.length ? `${empty.length} section(s) still empty` : `${p.sections.length} sections drafted`,
      weight: 20,
      fix: 'generate',
    },
    {
      id: 'placeholders',
      label: 'No open placeholders',
      ok: placeholders === 0,
      detail: placeholders ? `${placeholders} item(s) marked [[…]] need your input` : 'All facts confirmed',
      weight: 20,
      fix: 'placeholders',
    },
    {
      id: 'requirements',
      label: 'RFP requirements answered',
      ok: p.requirements.length === 0 || coveredN === p.requirements.length,
      detail: p.requirements.length ? `${coveredN} of ${p.requirements.length} covered` : 'No RFP requirements loaded',
      weight: 20,
      fix: 'requirements',
    },
    {
      id: 'evidence',
      label: 'At least 3 relevant references',
      ok: p.selectedProjectIds.length >= 3,
      detail: `${p.selectedProjectIds.length} past project(s) cited`,
      weight: 15,
      fix: 'evidence',
    },
    {
      id: 'proof',
      label: 'Backed by numbers',
      ok: proofPoints >= 8,
      detail: `${proofPoints} quantified proof points`,
      weight: 10,
      fix: 'stats',
    },
    {
      id: 'client',
      label: 'Speaks to the client by name',
      ok: !!p.client && execText.includes(p.client),
      detail: p.client ? `Opening section mentions ${p.client}` : 'No client set',
      weight: 5,
    },
    {
      id: 'sample',
      label: 'Live figures confirmed',
      ok: sampleStats === 0,
      detail: sampleStats ? `${sampleStats} sample figure(s) pending confirmation from operations data` : 'All figures are from confirmed sources',
      weight: 5,
      fix: 'stats',
    },
    {
      id: 'deadline',
      label: 'Submission deadline',
      ok: due === undefined || due >= 0,
      detail: due === undefined ? 'No due date set' : due < 0 ? `Overdue by ${-due} day(s)` : `${due} day(s) left`,
      weight: 5,
    },
  ];

  const score = Math.round(
    checks.reduce((acc, c) => {
      if (c.ok) return acc + c.weight;
      if (c.id === 'requirements' && p.requirements.length) return acc + c.weight * (coveredN / p.requirements.length);
      if (c.id === 'placeholders') return acc + Math.max(0, c.weight - placeholders * 2);
      if (c.id === 'evidence') return acc + (c.weight * p.selectedProjectIds.length) / 3;
      if (c.id === 'proof') return acc + (c.weight * proofPoints) / 8;
      return acc;
    }, 0),
  );

  return { score: Math.min(100, score), checks, coverage, placeholders, words, pages: Math.max(1, Math.round(words / 420)), proofPoints };
}
