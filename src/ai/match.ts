/**
 * Experience matcher: ranks past projects by how well they prove Bastion can do
 * THIS job. Each score comes with plain-English reasons so the user can see
 * why a project was suggested (and trust or overrule it).
 */
import { PAST_PROJECTS } from '@/data/projects';
import type { Industry, PastProject, Region, ServiceId, WorkType } from '@/lib/types';

export interface MatchInput {
  services: ServiceId[];
  industry: Industry;
  workType: WorkType;
  region: Region;
  peakHeadcount: number;
}

export interface ProjectMatch {
  project: PastProject;
  score: number; // 0..100
  reasons: string[];
}

const NEIGHBOUR_INDUSTRIES: Partial<Record<Industry, Industry[]>> = {
  Refining: ['Petrochemical', 'Chemicals', 'LNG'],
  Petrochemical: ['Refining', 'Chemicals'],
  Chemicals: ['Petrochemical', 'Refining'],
  LNG: ['Petrochemical', 'Midstream & Pipelines', 'Refining'],
  'Power Generation': ['Nuclear', 'Pulp & Paper'],
  Nuclear: ['Power Generation'],
};

export function rankProjects(input: MatchInput, library: PastProject[] = PAST_PROJECTS): ProjectMatch[] {
  const currentYear = new Date().getFullYear();
  return library
    .map((p) => {
      const reasons: string[] = [];
      let score = 0;

      const overlap = p.services.filter((s) => input.services.includes(s));
      if (input.services.length) {
        const share = overlap.length / input.services.length;
        score += share * 40;
        if (overlap.length) reasons.push(`${overlap.length} of ${input.services.length} services match`);
      }

      if (p.industry === input.industry) {
        score += 22;
        reasons.push(`Same industry: ${p.industry}`);
      } else if (NEIGHBOUR_INDUSTRIES[input.industry]?.includes(p.industry)) {
        score += 10;
        reasons.push(`Related industry: ${p.industry}`);
      }

      if (p.workType === input.workType) {
        score += 18;
        reasons.push(`Same work type: ${p.workType}`);
      }

      if (p.region === input.region) {
        score += 8;
        reasons.push(`Same region: ${p.region}`);
      }

      if (input.peakHeadcount > 0) {
        const ratio = Math.min(p.peakHeadcount, input.peakHeadcount) / Math.max(p.peakHeadcount, input.peakHeadcount);
        score += ratio * 7;
        if (ratio > 0.6) reasons.push(`Similar size: ${p.peakHeadcount.toLocaleString()} peak`);
      }

      const age = currentYear - p.year;
      score += Math.max(0, 5 - age);
      if (age <= 3) reasons.push(`Recent (${p.year})`);
      if (p.recordables === 0) reasons.push('Zero recordables');

      return { project: p, score: Math.round(Math.min(100, score)), reasons };
    })
    .sort((a, b) => b.score - a.score);
}
