/**
 * Who Bastion is and what it sells.
 *
 * Bastion is a FICTIONAL specialty industrial contractor made
 * up for this demo. Every name, figure, award and project here is invented.
 * Facts tagged `public` are the company's "verified" figures inside the demo
 * story; facts tagged `sample` are placeholders that a real deployment would
 * replace with live operational data.
 */

import type {
  ContractType,
  Industry,
  LiveStat,
  Region,
  SectionKey,
  ServiceId,
  TemplateId,
  Tone,
  User,
  WorkType,
} from '@/lib/types';

export const COMPANY = {
  name: 'Bastion',
  short: 'Bastion',
  tagline: 'Hold the Line',
  years: '65+',
  employees: '9,000+',
  facilities: '350+',
  annualHours: '18+ million',
  hq: 'Lake Charles, Louisiana',
  coverage: 'United States and Canada',
  website: 'bastion.example',
  mission: 'To keep the plants that power North America running: safely, on schedule and on budget.',
  vision: 'To be the contractor owners trust most with their hardest, highest-risk work.',
  heritage:
    'Bastion began in 1958 as a two-crew blasting and painting shop in Lake Charles, Louisiana. It added scaffolding in the 1970s and insulation in the 1980s, and today delivers more than a dozen specialty crafts across the U.S. and Canada from four operating regions: Bastion Gulf, Bastion Midwest, Bastion West and Bastion Canada.',
  industries: [
    'oil & gas',
    'petrochemical',
    'power generation',
    'LNG',
    'offshore',
    'heavy manufacturing',
    'pipelines & transmission',
    'nuclear',
    'pulp and paper',
    'pharmaceutical',
  ],
  awards: [
    { value: '31', label: 'client sites with three or more years and zero recordable incidents' },
    { value: '9', label: 'OSHA VPP Star worksites' },
    { value: 'Gold', label: 'Gulf Coast Contractor Safety Council award, 2025' },
    { value: '4', label: 'owner-nominated contractor safety awards in 2025' },
  ],
  techResults: [
    { value: '62%', label: 'less standby labor (910 hours avoided), Mississippi paper mill outage' },
    { value: '38%', label: 'fewer scaffold components ordered, Texas LNG train build' },
  ],
} as const;

export interface ServiceInfo {
  id: ServiceId;
  name: string;
  family: 'Soft Craft' | 'General Mechanical' | 'Technical' | 'Safety' | 'Fabrication';
  blurb: string;
  approach: string[];
  keywords: string[];
}

export const SERVICES: ServiceInfo[] = [
  {
    id: 'scaffolding',
    name: 'Scaffolding & Work Access',
    family: 'Soft Craft',
    blurb:
      'Engineered scaffold and work-access solutions, from tube-and-clamp and systems scaffold to shoring, lifts and hoists, designed in 3D before a single component reaches site.',
    approach: [
      '3D scaffold design and bill-of-materials take-offs before mobilization',
      'Bastion Track logging of every scaffold request, build, modification and dismantle',
      'Certified competent-person inspection and tagging on every structure',
      'Material staged by work-pack to cut standby time and excess components',
    ],
    keywords: ['scaffold', 'scaffolding', 'work access', 'shoring', 'hoist'],
  },
  {
    id: 'insulation',
    name: 'Insulation',
    family: 'Soft Craft',
    blurb:
      'Hot, cold, cryogenic and acoustic insulation for piping, vessels and equipment, including removable insulation blankets fabricated in-house.',
    approach: [
      'Field verification of line lists and insulation specifications',
      'Removable blanket fabrication for valves, flanges and inspection points',
      'Corrosion-under-insulation (CUI) awareness built into every scope',
      'Weather-proofing and jacketing quality checks before turnover',
    ],
    keywords: ['insulation', 'insulate', 'jacketing', 'cryogenic', 'blanket', 'cui', 'lagging'],
  },
  {
    id: 'coatings',
    name: 'Coatings & Linings',
    family: 'Soft Craft',
    blurb:
      'Industrial painting, abrasive blasting, protective coatings and tank linings, on site and in-shop. Coatings is the craft Bastion was founded on in 1958.',
    approach: [
      'Surface preparation to SSPC/NACE (AMPP) standards',
      'Certified coating inspectors with hold-point documentation',
      'Containment and environmental controls for blasting',
      'Shop application where possible to reduce field exposure',
    ],
    keywords: ['coating', 'coatings', 'painting', 'paint', 'blast', 'blasting', 'lining', 'linings', 'sspc', 'nace'],
  },
  {
    id: 'abatement',
    name: 'Lead & Asbestos Abatement',
    family: 'Soft Craft',
    blurb:
      'Licensed lead and asbestos abatement, with regulatory notifications, air monitoring and waste handling managed end to end.',
    approach: [
      'Regulatory notifications and permits handled by Bastion',
      'Negative-pressure enclosures and continuous air monitoring',
      'Manifested waste handling and disposal documentation',
    ],
    keywords: ['asbestos', 'lead', 'abatement', 'hazardous material', 'acm'],
  },
  {
    id: 'refractory',
    name: 'Refractory',
    family: 'Soft Craft',
    blurb:
      'Refractory crews that restore boilers, furnaces, heaters, kilns, reformers and steam generators, from small repairs to full relines.',
    approach: [
      'Pre-outage inspection and material take-off',
      'Gunite, castable and brick installation with dry-out planning',
      'Hot-work coordination with the turnaround critical path',
    ],
    keywords: ['refractory', 'furnace', 'heater', 'boiler', 'kiln', 'reformer', 'castable', 'gunite'],
  },
  {
    id: 'fireproofing',
    name: 'Fireproofing',
    family: 'Soft Craft',
    blurb: 'Cementitious and intumescent fireproofing for structural steel, vessel skirts and pipe racks.',
    approach: [
      'Thickness verification and documentation against specification',
      'Repair of degraded fireproofing with CUI inspection access',
    ],
    keywords: ['fireproofing', 'fire proofing', 'intumescent', 'cementitious', 'fire protection'],
  },
  {
    id: 'rope-access',
    name: 'Rope Access',
    family: 'Technical',
    blurb:
      'IRATA/SPRAT-certified rope access teams that reach difficult areas safely, quickly and cost-effectively, often removing the need for scaffold altogether.',
    approach: [
      'Access method selection: rope access vs scaffold, decided on cost and risk',
      'Certified technicians for inspection, coating touch-up and insulation repair',
    ],
    keywords: ['rope access', 'irata', 'sprat', 'rope'],
  },
  {
    id: 'fabrication',
    name: 'Metal & Blanket Fabrication',
    family: 'Fabrication',
    blurb:
      'Shop fabrication of metal jacketing, removable insulation blankets and specialty components, built to field-verified dimensions.',
    approach: ['Field measurement to shop drawing turnaround', 'Labelled, sequenced delivery by work-pack'],
    keywords: ['fabrication', 'fabricate', 'shop-fabricated', 'shop fabricated'],
  },
  {
    id: 'general-mechanical',
    name: 'General Mechanical',
    family: 'General Mechanical',
    blurb:
      'Civil, structural, mechanical, piping and electrical & instrumentation services for maintenance, turnaround and capital work.',
    approach: [
      'Integrated multi-craft crews under one safety and quality system',
      'Single point of contact for soft-craft and mechanical interfaces',
    ],
    keywords: ['mechanical services', 'general mechanical', 'pipefitting', 'pipe fitting', 'welding', 'structural steel', 'civil works', 'e&i', 'electrical and instrumentation', 'millwright'],
  },
  {
    id: 'safety-services',
    name: 'Safety Services',
    family: 'Safety',
    blurb:
      'Safety professionals, safety attendants, hole watch, fire watch and ground support personnel that keep a site compliant with company and regulatory protocols.',
    approach: [
      'Dedicated site safety professionals reporting into Bastion HSE',
      'Hole watch, fire watch and confined-space attendants on demand',
    ],
    keywords: ['safety attendant', 'hole watch', 'fire watch', 'confined space', 'safety services', 'safety personnel'],
  },
  {
    id: 'technical-services',
    name: 'Bastion Lens Technical Services',
    family: 'Technical',
    blurb:
      'Bastion Lens: 3D modeling, laser scanning, drone capture, digital field tools and SiteSight analytics that give owners a 360° view of the work before and during execution.',
    approach: [
      'Laser scanning and drone capture to build an as-is model',
      '3D modeling to validate access and quantities before mobilization',
      'SiteSight dashboards for real-time productivity and cost reporting',
    ],
    keywords: ['3d', 'laser scan', 'laser scanning', 'drone', 'digital twin', 'model', 'modeling', 'analytics', 'reporting', 'dashboard'],
  },
  {
    id: 'facilities-maintenance',
    name: 'Facilities Maintenance',
    family: 'General Mechanical',
    blurb: 'Routine and preventive facilities maintenance delivered by resident site crews.',
    approach: ['Resident crew with flexible surge capacity', 'Planned preventive maintenance schedules'],
    keywords: ['facilities', 'routine maintenance', 'preventive', 'resident'],
  },
];

export const serviceById = (id: ServiceId) => SERVICES.find((s) => s.id === id)!;

export const WORK_TYPES: { id: WorkType; hint: string }[] = [
  { id: 'Turnaround', hint: 'Planned shutdown, outage or TAR: tight window, surge labor' },
  { id: 'Maintenance', hint: 'Routine or resident site work, often under an MSA' },
  { id: 'Capital Project', hint: 'New build, expansion or greenfield construction' },
];

export const INDUSTRIES: Industry[] = [
  'Refining',
  'Petrochemical',
  'Power Generation',
  'LNG',
  'Chemicals',
  'Pulp & Paper',
  'Midstream & Pipelines',
  'Nuclear',
  'Heavy Manufacturing',
  'Pharmaceutical',
];

export const REGIONS: Region[] = [
  'Gulf Coast',
  'Midwest',
  'Northeast',
  'Southeast',
  'West Coast',
  'Rockies',
  'Western Canada',
  'Eastern Canada',
];

export const CONTRACT_TYPES: ContractType[] = [
  'Time & Materials',
  'Unit Rate',
  'Lump Sum',
  'Master Services Agreement',
];

export const TONES: { id: Tone; hint: string }[] = [
  { id: 'Formal', hint: 'Measured, procurement-friendly' },
  { id: 'Persuasive', hint: 'Benefit-led, confident' },
  { id: 'Concise', hint: 'Short, scannable' },
];

export const SECTION_TITLES: Record<SectionKey, string> = {
  cover_letter: 'Cover Letter',
  executive_summary: 'Executive Summary',
  understanding: 'Our Understanding of Your Scope',
  company_overview: 'About Bastion',
  services: 'Proposed Services & Approach',
  experience: 'Relevant Experience',
  live_performance: 'Live Performance Snapshot',
  safety: 'Safety Performance: SafeHold',
  quality: 'Quality Management: BuildRight',
  workforce: 'Workforce & Staffing Plan',
  schedule: 'Execution Plan & Schedule',
  technology: 'Technology: Bastion Lens',
  commercial: 'Commercial Approach',
  why_bastion: 'Why Bastion',
};

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  pages: string;
  sections: SectionKey[];
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'full',
    name: 'Full Proposal',
    description: 'Complete response to an RFP: every section, every proof point.',
    pages: '12–18 pages',
    sections: [
      'cover_letter',
      'executive_summary',
      'understanding',
      'company_overview',
      'services',
      'experience',
      'live_performance',
      'safety',
      'quality',
      'workforce',
      'schedule',
      'technology',
      'commercial',
      'why_bastion',
    ],
  },
  {
    id: 'turnaround',
    name: 'Turnaround Bid',
    description: 'Built around the outage window: schedule certainty, surge labor and safety.',
    pages: '8–12 pages',
    sections: [
      'executive_summary',
      'understanding',
      'services',
      'schedule',
      'workforce',
      'safety',
      'experience',
      'live_performance',
      'technology',
      'commercial',
    ],
  },
  {
    id: 'maintenance',
    name: 'Maintenance / MSA Proposal',
    description: 'Long-term resident work: cost predictability, continuity and KPIs.',
    pages: '8–12 pages',
    sections: [
      'executive_summary',
      'understanding',
      'services',
      'workforce',
      'live_performance',
      'safety',
      'quality',
      'experience',
      'technology',
      'commercial',
    ],
  },
  {
    id: 'capability',
    name: 'Capability Statement',
    description: 'Introduce Bastion to a new client, with no RFP needed.',
    pages: '4–6 pages',
    sections: ['company_overview', 'services', 'experience', 'live_performance', 'safety', 'technology', 'why_bastion'],
  },
  {
    id: 'letter',
    name: 'Executive Letter',
    description: 'One-page cover letter to go with a bid or a follow-up.',
    pages: '1 page',
    sections: ['cover_letter'],
  },
];

export const templateById = (id: TemplateId) => TEMPLATES.find((t) => t.id === id)!;

/**
 * Live performance stats, styled like the operational dashboards (Bastion Track /
 * SiteSight) a contractor would pull in. Values marked `sample` are placeholders
 * until a live data feed is connected.
 */
export const LIVE_STATS: LiveStat[] = [
  {
    id: 'years',
    label: 'Years in business',
    value: '65+',
    detail: 'Specialty multi-craft services since 1958',
    source: 'public',
  },
  {
    id: 'people',
    label: 'Employees',
    value: '9,000+',
    detail: 'Across the U.S. and Canada',
    source: 'public',
  },
  {
    id: 'facilities',
    label: 'Facilities served',
    value: '350+',
    detail: 'Across North America',
    source: 'public',
  },
  {
    id: 'hours',
    label: 'Hours worked annually',
    value: '18M+',
    detail: 'Craft hours across North America',
    source: 'public',
  },
  {
    id: 'zero-sites',
    label: 'Zero-recordable sites',
    value: '31',
    detail: 'Client sites with three or more years and no recordable incident',
    source: 'public',
  },
  {
    id: 'standby',
    label: 'Standby labor reduced',
    value: '62%',
    detail: 'Bastion Lens planning, Mississippi paper mill outage',
    source: 'public',
  },
  {
    id: 'trir',
    label: 'TRIR, rolling 12 months',
    value: '0.21',
    detail: 'Total recordable incident rate per 200k hours',
    trend: [0.34, 0.32, 0.3, 0.29, 0.27, 0.26, 0.24, 0.23, 0.22, 0.22, 0.21, 0.21],
    source: 'sample',
  },
  {
    id: 'active-projects',
    label: 'Active projects',
    value: '204',
    detail: 'Maintenance, turnaround and capital sites live this month',
    trend: [176, 181, 185, 190, 188, 195, 199, 201, 204],
    source: 'sample',
  },
  {
    id: 'scaffold-ontime',
    label: 'Scaffold on-time delivery',
    value: '95.8%',
    detail: 'Bastion Track requests built by the required date, last 90 days',
    trend: [91.4, 92.6, 92.2, 93.9, 94.7, 95.3, 95.8],
    source: 'sample',
  },
  {
    id: 'builds',
    label: 'Scaffold builds / month',
    value: '11,820',
    detail: 'Erect, modify and dismantle tickets closed in Bastion Track',
    trend: [9900, 10350, 10800, 10720, 11240, 11590, 11820],
    source: 'sample',
  },
  {
    id: 'utilization',
    label: 'Scaffold material utilization',
    value: '85%',
    detail: 'Owned and rented components in active use',
    trend: [77, 79, 80, 82, 83, 84, 85],
    source: 'sample',
  },
  {
    id: 'ta-ontime',
    label: 'Turnarounds finished on/ahead of schedule',
    value: '93%',
    detail: 'Turnaround scopes, last 24 months',
    source: 'sample',
  },
];

export const statById = (id: string) => LIVE_STATS.find((s) => s.id === id);

export const CLIENT_SUGGESTIONS = [
  'ExxonMobil',
  'Chevron',
  'Phillips 66',
  'Shell',
  'Marathon Petroleum',
  'Valero',
  'Motiva',
  'Dow',
  'LyondellBasell',
  'BASF',
  'Cheniere',
  'Duke Energy',
  'Southern Company',
  'Suncor',
  'Imperial Oil',
];

/** Simulated users for the demo. Real sign-in would come from Entra ID. */
export const USERS: User[] = [
  {
    id: 'u-jordan',
    name: 'Jordan Ellis',
    initials: 'JE',
    title: 'Business Development Manager',
    unit: 'Bastion Gulf',
    email: 'jordan.ellis@bastion.example',
    canApprove: false,
  },
  {
    id: 'u-maya',
    name: 'Maya Fontenot',
    initials: 'MF',
    title: 'Proposal Coordinator',
    unit: 'Bastion Midwest',
    email: 'maya.fontenot@bastion.example',
    canApprove: false,
  },
  {
    id: 'u-ray',
    name: 'Ray Castillo',
    initials: 'RC',
    title: 'Estimator',
    unit: 'Bastion West',
    email: 'ray.castillo@bastion.example',
    canApprove: false,
  },
  {
    id: 'u-dana',
    name: 'Dana Whitaker',
    initials: 'DW',
    title: 'VP, Sales & Marketing',
    unit: 'Corporate',
    email: 'dana.whitaker@bastion.example',
    canApprove: true,
  },
];
