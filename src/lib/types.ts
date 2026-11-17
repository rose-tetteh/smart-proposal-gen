/**
 * Core domain types for the Bastion Proposal Generator.
 *
 * Every proposal is made from three ingredients:
 *  1. The opportunity: what the client is asking for (often an RFP).
 *  2. Bastion's evidence: past projects, safety record, live performance stats.
 *  3. Reusable content: approved company boilerplate (SafeHold, BuildRight, Bastion Lens...).
 */

export type ServiceId =
  | 'scaffolding'
  | 'insulation'
  | 'coatings'
  | 'abatement'
  | 'refractory'
  | 'fireproofing'
  | 'rope-access'
  | 'fabrication'
  | 'general-mechanical'
  | 'safety-services'
  | 'technical-services'
  | 'facilities-maintenance';

export type WorkType = 'Turnaround' | 'Maintenance' | 'Capital Project';

export type Industry =
  | 'Refining'
  | 'Petrochemical'
  | 'Power Generation'
  | 'LNG'
  | 'Chemicals'
  | 'Pulp & Paper'
  | 'Midstream & Pipelines'
  | 'Nuclear'
  | 'Heavy Manufacturing'
  | 'Pharmaceutical';

export type Region =
  | 'Gulf Coast'
  | 'Midwest'
  | 'Northeast'
  | 'Southeast'
  | 'West Coast'
  | 'Rockies'
  | 'Western Canada'
  | 'Eastern Canada';

export type ContractType = 'Time & Materials' | 'Unit Rate' | 'Lump Sum' | 'Master Services Agreement';

export type Tone = 'Formal' | 'Persuasive' | 'Concise';

export type ProposalStatus = 'draft' | 'review' | 'submitted' | 'won' | 'lost';

export type TemplateId = 'full' | 'turnaround' | 'maintenance' | 'capability' | 'letter';

export type SectionKey =
  | 'cover_letter'
  | 'executive_summary'
  | 'understanding'
  | 'company_overview'
  | 'services'
  | 'experience'
  | 'live_performance'
  | 'safety'
  | 'quality'
  | 'workforce'
  | 'schedule'
  | 'technology'
  | 'commercial'
  | 'why_bastion';

export interface PastProject {
  id: string;
  name: string;
  /** Anonymised client descriptor. Contractors rarely name clients in marketing. */
  client: string;
  location: string;
  region: Region;
  industry: Industry;
  workType: WorkType;
  services: ServiceId[];
  year: number;
  durationWeeks: number;
  peakHeadcount: number;
  craftHours: number;
  recordables: number;
  summary: string;
  outcomes: string[];
  lessons: string[];
  /** 'public' = a verified company figure (shown as "Verified"); 'sample' = a placeholder to confirm. All demo data is fictional. */
  source: 'public' | 'sample';
}

export interface LiveStat {
  id: string;
  label: string;
  value: string;
  detail: string;
  trend?: number[];
  source: 'public' | 'sample';
}

export interface ContentBlock {
  id: string;
  title: string;
  category: 'Company' | 'Safety' | 'Quality' | 'Workforce' | 'Technology' | 'Commercial';
  body: string;
  updatedAt: string;
  approved: boolean;
}

export interface Requirement {
  id: string;
  text: string;
  category: 'Submission' | 'Safety' | 'Technical' | 'Commercial' | 'Schedule' | 'Staffing' | 'Quality';
  /** Section that should answer it. */
  section: SectionKey;
}

export interface Section {
  id: string;
  key: SectionKey;
  title: string;
  body: string;
  generatedAt?: string;
  edited?: boolean;
}

export interface Activity {
  at: string;
  who: string;
  what: string;
}

export interface Proposal {
  id: string;
  title: string;
  client: string;
  site: string;
  location: string;
  region: Region;
  industry: Industry;
  workType: WorkType;
  services: ServiceId[];
  contractType: ContractType;
  startDate: string;
  durationWeeks: number;
  peakHeadcount: number;
  dueDate: string;
  estimatedValue: number;
  scopeNotes: string;
  rfpText: string;
  requirements: Requirement[];
  template: TemplateId;
  tone: Tone;
  selectedProjectIds: string[];
  selectedStatIds: string[];
  winThemes: string[];
  sections: Section[];
  status: ProposalStatus;
  owner: string;
  createdAt: string;
  updatedAt: string;
  activity: Activity[];
}

export type ProposalDraft = Omit<
  Proposal,
  'id' | 'sections' | 'status' | 'owner' | 'createdAt' | 'updatedAt' | 'activity'
>;

export interface User {
  id: string;
  name: string;
  initials: string;
  title: string;
  unit: string;
  email: string;
  canApprove: boolean;
}
