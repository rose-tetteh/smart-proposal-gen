/**
 * RFP reader: turns pasted RFP text into pre-filled proposal fields and a
 * requirements checklist.
 *
 * This is a deterministic, rule-based extractor so the demo works offline.
 * In production the same function signature would be backed by an LLM call
 * (see ai/provider.ts). The rest of the app only sees `RfpExtraction`.
 */
import { CLIENT_SUGGESTIONS, SERVICES } from '@/data/company';
import type {
  ContractType,
  Industry,
  Region,
  Requirement,
  SectionKey,
  ServiceId,
  WorkType,
} from '@/lib/types';

export interface RfpExtraction {
  title?: string;
  client?: string;
  site?: string;
  location?: string;
  region?: Region;
  industry?: Industry;
  workType?: WorkType;
  services: ServiceId[];
  contractType?: ContractType;
  startDate?: string;
  dueDate?: string;
  durationWeeks?: number;
  peakHeadcount?: number;
  requirements: Requirement[];
  /** Human-readable list of what was found, shown as "Bastion Assist filled in…" chips. */
  found: string[];
}

const STATE_REGION: Record<string, Region> = {
  texas: 'Gulf Coast', tx: 'Gulf Coast', louisiana: 'Gulf Coast', la: 'Gulf Coast', mississippi: 'Gulf Coast',
  alabama: 'Southeast', georgia: 'Southeast', florida: 'Southeast', 'south carolina': 'Southeast', 'north carolina': 'Southeast', tennessee: 'Southeast',
  illinois: 'Midwest', il: 'Midwest', indiana: 'Midwest', ohio: 'Midwest', michigan: 'Midwest', minnesota: 'Midwest', kansas: 'Midwest', oklahoma: 'Midwest', kentucky: 'Midwest',
  pennsylvania: 'Northeast', pa: 'Northeast', 'new jersey': 'Northeast', 'new york': 'Northeast', connecticut: 'Northeast', massachusetts: 'Northeast', delaware: 'Northeast',
  california: 'West Coast', ca: 'West Coast', washington: 'West Coast', oregon: 'West Coast',
  colorado: 'Rockies', wyoming: 'Rockies', utah: 'Rockies', montana: 'Rockies', 'new mexico': 'Rockies',
  alberta: 'Western Canada', ab: 'Western Canada', 'british columbia': 'Western Canada', bc: 'Western Canada', saskatchewan: 'Western Canada',
  ontario: 'Eastern Canada', on: 'Eastern Canada', quebec: 'Eastern Canada', 'nova scotia': 'Eastern Canada', 'new brunswick': 'Eastern Canada',
};

const INDUSTRY_RULES: [Industry, RegExp][] = [
  ['LNG', /\blng\b|liquefaction|liquefied natural gas/i],
  ['Nuclear', /nuclear|refuel(?:ing)? outage|reactor building/i],
  ['Refining', /refiner|crude unit|\bfcc|fluid catalytic|hydrocracker|coker|reformer/i],
  ['Petrochemical', /petrochemical|ethylene|cracker|polymer|olefins|propylene/i],
  ['Power Generation', /power (?:plant|station|generation)|combined[- ]cycle|hrsg|turbine|coal[- ]fired|generating station/i],
  ['Chemicals', /chemical plant|specialty chemical|chlor|ammonia/i],
  ['Pulp & Paper', /pulp|paper mill|recovery boiler/i],
  ['Midstream & Pipelines', /pipeline|compressor station|terminal|midstream/i],
  ['Pharmaceutical', /pharma/i],
  ['Heavy Manufacturing', /steel mill|manufacturing plant|smelter/i],
];

const SECTION_FOR: [RegExp, Requirement['category'], SectionKey][] = [
  [/trir|emr|safety|hole watch|fire watch|confined|hot work|attendant/i, 'Safety', 'safety'],
  [/schedule|level 3|duration|milestone|phase/i, 'Schedule', 'schedule'],
  [/staff|headcount|craft|union|supervision|personnel|manpower/i, 'Staffing', 'workforce'],
  [/quality|inspection|hold point|qa\b|qc\b|iso/i, 'Quality', 'quality'],
  [/pric|rate|cost|commercial|assumption|exclusion|not-to-exceed|invoice/i, 'Commercial', 'commercial'],
  [/reference|similar|experience|past project/i, 'Submission', 'experience'],
  [/due|submit|submission|deadline/i, 'Submission', 'cover_letter'],
  [/3d|laser|model|tracking system|technology|digital/i, 'Technical', 'technology'],
  [/scaffold|insulation|refractory|coating|abatement|fireproof|scope/i, 'Technical', 'services'],
];

function toIso(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw.replace(/(\d)(st|nd|rd|th)/, '$1'));
  if (Number.isNaN(d.getTime())) return undefined;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE = `(${MONTH}\\.? \\d{1,2}(?:st|nd|rd|th)?,? \\d{4})`;

function clean(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

export function extractFromRfp(text: string): RfpExtraction {
  const t = text.replace(/\r/g, '');
  const found: string[] = [];
  const out: RfpExtraction = { services: [], requirements: [], found };

  // Client
  const clientLine = t.match(/^(?:company|owner|client|issued by)\s*:\s*(.+)$/im);
  if (clientLine) out.client = clean(clientLine[1]);
  else {
    const known = CLIENT_SUGGESTIONS.find((c) => new RegExp(`\\b${c.replace(/\s+/g, '\\s+')}\\b`, 'i').test(t));
    if (known) out.client = known;
  }
  if (out.client) found.push('Client');

  // Site and location
  const facility = t.match(/^(?:facility|site|location|plant)\s*:\s*(.+)$/im);
  if (facility) {
    const parts = facility[1].split(',').map(clean);
    out.site = parts[0];
    if (parts.length > 1) out.location = parts.slice(1).join(', ');
  } else {
    const named = t.match(/\b([A-Z][\w.'-]*(?:\s[A-Z][\w.'-]*){0,3}\s(?:Refinery|Plant|Complex|Terminal|Station|Mill|Facility|Works))\b/);
    if (named) out.site = clean(named[1]);
  }
  if (!out.location) {
    const loc = t.match(/\b([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+)?),\s*(Texas|Louisiana|Illinois|Pennsylvania|Ohio|California|Alberta|Ontario|Georgia|Alabama|Mississippi|Indiana|Washington|New Jersey|Connecticut|TX|LA|IL|PA|CA|AB|ON)\b/);
    if (loc) out.location = `${loc[1]}, ${loc[2]}`;
  }
  if (out.site) found.push('Site');
  if (out.location) {
    found.push('Location');
    const lower = out.location.toLowerCase();
    const key = Object.keys(STATE_REGION)
      .sort((a, b) => b.length - a.length)
      .find((k) => new RegExp(`\\b${k}\\b`).test(lower));
    if (key) {
      out.region = STATE_REGION[key];
      found.push('Region');
    }
  }

  // Industry
  for (const [ind, re] of INDUSTRY_RULES) {
    if (re.test(t)) {
      out.industry = ind;
      found.push('Industry');
      break;
    }
  }

  // Work type: count signals for each and keep the strongest
  const score = (re: RegExp) => (t.match(re) ?? []).length;
  const wt: [WorkType, number][] = [
    ['Turnaround', score(/turnaround|\bTAR\b|shutdown|outage|\bTA\b/gi)],
    ['Capital Project', score(/greenfield|expansion|new unit|construction|capital project|brownfield/gi)],
    ['Maintenance', score(/routine maintenance|resident|\bMSA\b|master service|maintenance program|day-to-day/gi)],
  ];
  wt.sort((a, b) => b[1] - a[1]);
  if (wt[0][1] > 0) {
    out.workType = wt[0][0];
    found.push('Work type');
  }

  // Services
  const lower = t.toLowerCase();
  for (const s of SERVICES) {
    if (s.keywords.some((k) => lower.includes(k))) out.services.push(s.id);
  }
  if (/hole watch|fire watch|safety professional/i.test(t) && !out.services.includes('safety-services'))
    out.services.push('safety-services');
  if (out.services.length) found.push(`${out.services.length} services`);

  // Contract type
  if (/unit[- ]rate/i.test(t)) out.contractType = 'Unit Rate';
  else if (/lump[- ]sum|fixed price/i.test(t)) out.contractType = 'Lump Sum';
  else if (/time (?:and|&) materials?|\bT&M\b/i.test(t)) out.contractType = 'Time & Materials';
  else if (/master services? agreement|\bMSA\b/i.test(t)) out.contractType = 'Master Services Agreement';
  if (out.contractType) found.push('Contract type');

  // Dates
  const start = t.match(new RegExp(`start(?:s|ing)?(?: date)?(?: (?:on|is))?:?\\s+${DATE}`, 'i')) ?? t.match(new RegExp(`commenc\\w*(?: on)?\\s+${DATE}`, 'i'));
  out.startDate = toIso(start?.[1]);
  if (out.startDate) found.push('Start date');
  const due = t.match(new RegExp(`(?:due|deadline|submit(?:ted)?)(?: by| on| no later than|:)?\\s+${DATE}`, 'i'));
  out.dueDate = toIso(due?.[1]);
  if (out.dueDate) found.push('Due date');

  // Duration
  const weeks = t.match(/(\d{1,3})\s*(?:-|\s)?weeks?/i);
  const days = t.match(/(\d{1,3})\s*(?:-|\s)?days?\b/i);
  const months = t.match(/(\d{1,2})\s*(?:-|\s)?months?/i);
  if (weeks) out.durationWeeks = Number(weeks[1]);
  else if (days) out.durationWeeks = Math.max(1, Math.round(Number(days[1]) / 7));
  else if (months) out.durationWeeks = Math.round(Number(months[1]) * 4.33);
  if (out.durationWeeks) found.push('Duration');

  // Headcount
  const hc =
    t.match(/(?:headcount|manpower|peak)[^.\n]{0,60}?(\d{2,5})/i) ??
    t.match(/(\d{2,5})\s*(?:craft|personnel|workers|people)/i);
  if (hc) {
    out.peakHeadcount = Number(hc[1]);
    found.push('Peak headcount');
  }

  // Title
  const named = t.match(/((?:Spring|Summer|Fall|Autumn|Winter)\s+\d{4}[^.\n]{0,120}?(?:Turnaround|Outage|Shutdown))/i);
  const site = out.site ?? out.client ?? 'New opportunity';
  if (named) {
    // "Crude Unit (CU-1) and Fluid Catalytic Cracking Unit (FCCU)" -> "CU-1 and FCCU"
    const short = clean(named[1]).replace(/(?:[A-Z][a-z]+\s){1,5}\(([A-Z0-9-]{2,})\)/g, '$1');
    out.title = `${site}: ${short.length > 90 ? `${short.slice(0, 87)}…` : short}`;
  }
  else if (out.workType) out.title = `${site}: ${out.workType === 'Capital Project' ? 'Capital Project' : out.workType} Services`;

  // Requirements: sentences that oblige the contractor to do something
  const lines = t
    .split(/\n|(?<=\.)\s+(?=[A-Z])/)
    .map((l) => clean(l.replace(/^\s*(?:\d+(?:\.\d+)*\.?|[-•*])\s*/, '')))
    .filter((l) => l.length > 18);
  const seen = new Set<string>();
  for (const line of lines) {
    if (!/\b(shall|must|required|is required|are required|preferred|provide|submit|include|describe)\b/i.test(line)) continue;
    const k = line.toLowerCase().slice(0, 60);
    if (seen.has(k)) continue;
    seen.add(k);
    const rule = SECTION_FOR.find(([re]) => re.test(line));
    out.requirements.push({
      id: `r${out.requirements.length + 1}`,
      text: line.length > 220 ? `${line.slice(0, 217)}…` : line,
      category: rule?.[1] ?? 'Technical',
      section: rule?.[2] ?? 'services',
    });
  }
  if (out.requirements.length) found.push(`${out.requirements.length} requirements`);

  return out;
}
