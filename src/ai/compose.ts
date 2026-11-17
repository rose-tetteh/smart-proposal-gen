/**
 * Section writer: drafts each proposal section from the opportunity, the
 * chosen evidence and the approved content blocks.
 *
 * Output is a small Markdown subset (paragraphs, "- " bullets, "### " headings,
 * **bold** and pipe tables). The same subset is rendered on screen and
 * converted to Word and PDF, so what you see is what you export.
 *
 * Anything Bastion must confirm before sending is written as [[double brackets]].
 * The editor highlights these and the readiness check counts them, so nothing
 * made-up can slip into a client document unnoticed.
 */
import { COMPANY, SECTION_TITLES, serviceById } from '@/data/company';
import { addWeeks, fmtDate, fmtNum, listJoin } from '@/lib/format';
import type { ContentBlock, LiveStat, PastProject, ProposalDraft, SectionKey, Tone, User } from '@/lib/types';

export interface ComposeContext {
  p: ProposalDraft;
  author: User;
  projects: PastProject[];
  stats: LiveStat[];
  blocks: ContentBlock[];
}

const by = <T>(tone: Tone, v: { Formal: T; Persuasive: T; Concise: T }) => v[tone];

function block(ctx: ComposeContext, id: string) {
  return ctx.blocks.find((b) => b.id === id)?.body ?? '';
}

function scopeLabel(p: ProposalDraft) {
  const svc = p.services.map((s) => serviceById(s).name.replace(' & Work Access', '').toLowerCase().replace('bastion pulse', 'Bastion Lens'));
  return `${listJoin(svc.slice(0, 4))}${svc.length > 4 ? ' and related services' : ''}`;
}

function siteLabel(p: ProposalDraft) {
  return [p.site, p.location].filter(Boolean).join(', ');
}

function workPhrase(p: ProposalDraft) {
  switch (p.workType) {
    case 'Turnaround':
      return 'turnaround';
    case 'Maintenance':
      return 'maintenance program';
    default:
      return 'capital project';
  }
}

export function suggestWinThemes(p: Pick<ProposalDraft, 'workType' | 'services' | 'industry' | 'requirements'>): string[] {
  const themes: string[] = [];
  if (p.workType === 'Turnaround') {
    themes.push('Schedule certainty on the critical path: scaffold pre-built before the window opens');
    themes.push('Surge to peak headcount without changing contractors or safety systems');
  } else if (p.workType === 'Maintenance') {
    themes.push('Cost predictability: every scaffold tracked in Bastion Track, standing scaffold reviewed every two weeks');
    themes.push('One accountable multi-craft partner, with fewer interfaces for your planners');
  } else {
    themes.push('Model-based planning that has cut scaffold components ordered by 38% on a Texas LNG build');
    themes.push('Four soft crafts under one contract to remove trade-interface delays');
  }
  themes.push('Zero Harm: the SafeHold culture, with 31 client sites at zero recordables for three years or more');
  if (p.services.includes('technical-services') || p.requirements.some((r) => /3d|laser|model/i.test(r.text)))
    themes.push('Bastion Lens digital planning: 62% less standby labor on a recent outage');
  if (p.services.length >= 3) themes.push('Single-source soft-craft delivery: scaffold, insulation and coatings sequenced together');
  return themes.slice(0, 4);
}

// ─── Sections ─────────────────────────────────────────────────────────────

function coverLetter(ctx: ComposeContext) {
  const { p, author } = ctx;
  const t = p.tone;
  const today = fmtDate(new Date().toISOString());
  const opener = by(t, {
    Formal: `Bastion is pleased to submit this proposal to ${p.client} for ${scopeLabel(p)} in support of the ${p.title.replace(/^.*?:\s*/, '')}.`,
    Persuasive: `${p.client} needs a ${workPhrase(p)} that finishes safely, on time and without surprises. That is exactly what Bastion is built to deliver, and this proposal shows how we will do it at ${p.site || 'your facility'}.`,
    Concise: `Please find Bastion’s proposal for ${scopeLabel(p)} at ${p.site || 'your facility'}.`,
  });
  const middle = by(t, {
    Formal: `For more than 65 years, Bastion has delivered specialty multi-craft services at more than 350 facilities across North America. For this scope we are proposing one accountable team working under our SafeHold safety culture and an ISO 9001–modelled quality system, supported by the Bastion Lens planning and tracking tools.`,
    Persuasive: `With ${COMPANY.employees} craft professionals, ${COMPANY.facilities} facilities served and a proven safety record, Bastion brings both the capacity and the discipline this ${workPhrase(p)} needs. Our Bastion Lens planning tools show you what will happen before it happens.`,
    Concise: `Bastion brings 65+ years of soft-craft experience, ${COMPANY.employees} people and a proven safety record to this scope.`,
  });
  const themes = p.winThemes.length ? `\n\nWhat this means for ${p.client}:\n${p.winThemes.map((w) => `- ${w}`).join('\n')}` : '';
  const close = by(t, {
    Formal: `We would welcome the opportunity to review this proposal with your team and answer any questions. Thank you for considering Bastion.`,
    Persuasive: `We would value the chance to walk your team through our plan in person, on site if that helps. We are ready to start planning now.`,
    Concise: `We would be glad to discuss any part of this proposal.`,
  });
  return `${today}\n\n**${p.client}**\n${siteLabel(p) || '[[Client address]]'}\n\n**Re: ${p.title}**\n\nDear ${p.client} Selection Committee,\n\n${opener}\n\n${middle}${themes}\n\n${close}\n\nSincerely,\n\n**${author.name}**\n${author.title}, ${author.unit}\n${author.email}`;
}

function executiveSummary(ctx: ComposeContext) {
  const { p, projects } = ctx;
  const t = p.tone;
  const need = by(t, {
    Formal: `${p.client} is seeking a qualified contractor to deliver ${scopeLabel(p)} for the ${workPhrase(p)} at ${siteLabel(p) || 'its facility'}.`,
    Persuasive: `${p.client} needs ${scopeLabel(p)} delivered safely, inside the ${p.workType === 'Turnaround' ? 'outage window' : 'agreed schedule'}, with no surprises on cost.`,
    Concise: `${p.client} requires ${scopeLabel(p)} at ${p.site || 'its facility'}.`,
  });
  const response = by(t, {
    Formal: `Bastion proposes a single, integrated soft-craft team, planned with Bastion Lens 3D modeling and tracked through our Scaffold Management System, and governed by the SafeHold safety culture.`,
    Persuasive: `Bastion will plan the work in 3D before mobilization, track every scaffold and work-pack in real time, and deliver it with a team that has done this many times before, ${projects.length ? `most recently on projects like ${projects[0].name}` : 'across hundreds of facilities'}.`,
    Concise: `Bastion will deliver it with one integrated team, digital planning and a proven safety culture.`,
  });
  const table = [
    '| Item | Proposed |',
    '| --- | --- |',
    `| Scope | ${p.services.map((s) => serviceById(s).name).join(', ')} |`,
    `| Work type | ${p.workType}${p.industry ? `, ${p.industry}` : ''} |`,
    `| Site | ${siteLabel(p) || '[[Site]]'} |`,
    `| Start | ${p.startDate ? fmtDate(p.startDate) : '[[Start date]]'} |`,
    `| Duration | ${p.durationWeeks ? `${p.durationWeeks} weeks` : '[[Duration]]'} |`,
    `| Peak headcount | ${p.peakHeadcount ? fmtNum(p.peakHeadcount) : '[[Headcount]]'} |`,
    `| Commercial basis | ${p.contractType} |`,
  ].join('\n');
  const themes = p.winThemes.length
    ? `\n\n### What ${p.client} gets\n${p.winThemes.map((w) => `- ${w}`).join('\n')}`
    : '';
  return `${need} ${response}\n\n${table}${themes}`;
}

function understanding(ctx: ComposeContext) {
  const { p } = ctx;
  const implications: Record<string, string[]> = {
    Turnaround: [
      'The outage window is fixed, so scaffold and access must be ready before the unit comes down',
      'Labor must surge to peak quickly and demobilize cleanly',
      'Refractory, insulation and scaffold activities sit on or near the critical path and must be sequenced together',
    ],
    Maintenance: [
      'Day-to-day work must be responsive without growing standing-scaffold cost',
      'A stable, site-qualified crew protects safety and productivity',
      'The owner needs clear, regular reporting on cost, backlog and KPIs',
    ],
    'Capital Project': [
      'Soft-craft work must keep pace with mechanical completion and turnover by system',
      'Access, insulation and coatings must be sequenced to avoid trade stacking',
      'Material quantities must be controlled from design to avoid overspend',
    ],
  };
  const reqs = p.requirements.slice(0, 8);
  const reqList = reqs.length
    ? `\n\n### Key requirements we have addressed\n| Requirement | Where we answer it |\n| --- | --- |\n${reqs
        .map((r) => `| ${r.text.replace(/\|/g, '/')} | ${SECTION_TITLES[r.section]} |`)
        .join('\n')}`
    : '';
  const notes = p.scopeNotes ? `\n\n### Scope notes\n${p.scopeNotes}` : '';
  return `We understand that ${p.client} is planning a ${workPhrase(p)} at ${siteLabel(p) || 'its facility'}${p.startDate ? `, starting ${fmtDate(p.startDate)}` : ''}${p.durationWeeks ? ` for about ${p.durationWeeks} weeks` : ''}. The scope covers ${scopeLabel(p)}${p.peakHeadcount ? `, with a peak of roughly ${fmtNum(p.peakHeadcount)} craft` : ''}.\n\nFrom our experience on similar ${p.industry.toLowerCase()} work, the factors that decide success are:\n${implications[p.workType].map((i) => `- ${i}`).join('\n')}${reqList}${notes}`;
}

function companyOverview(ctx: ComposeContext) {
  const t = ctx.p.tone;
  const who = block(ctx, 'cb-who');
  const glance = `\n\n### Bastion at a glance\n| ${COMPANY.years} | ${COMPANY.employees} | ${COMPANY.facilities} | ${COMPANY.annualHours} |\n| --- | --- | --- | --- |\n| years in business | employees | facilities served | craft hours a year |`;
  if (t === 'Concise') return `${who.split('\n\n')[0]}${glance}`;
  return `${who}\n\n${block(ctx, 'cb-mission')}${glance}\n\n${COMPANY.heritage}`;
}

function services(ctx: ComposeContext) {
  const { p } = ctx;
  const intro = by(p.tone, {
    Formal: `Bastion proposes the following services. Each is delivered under one site management team, one safety program and one quality system.`,
    Persuasive: `Here is how Bastion will deliver each part of the scope, and why our approach removes risk for ${p.client}.`,
    Concise: `Proposed services:`,
  });
  const parts = p.services.map((id) => {
    const s = serviceById(id);
    const steps = p.tone === 'Concise' ? s.approach.slice(0, 2) : s.approach;
    return `### ${s.name}\n${s.blurb}\n${steps.map((a) => `- ${a}`).join('\n')}`;
  });
  return `${intro}\n\n${parts.join('\n\n')}`;
}

function experience(ctx: ComposeContext) {
  const { p, projects } = ctx;
  if (!projects.length)
    return `[[Select at least three relevant past projects in the Evidence step. Clients usually ask for references from similar work.]]`;
  const table = `| Project | Location | Scope | Duration | Peak | Recordables |\n| --- | --- | --- | --- | --- | --- |\n${projects
    .map(
      (x) =>
        `| ${x.name} | ${x.location} | ${x.services.map((s) => serviceById(s).name.split(' ')[0]).join(', ')} | ${x.durationWeeks} wks | ${fmtNum(x.peakHeadcount)} | ${x.recordables} |`,
    )
    .join('\n')}`;
  const n = p.tone === 'Concise' ? 2 : 3;
  const stories = projects.slice(0, n).map((x) => {
    const lesson = x.lessons[0] ? `\n\n**Lesson applied to ${p.client}:** ${x.lessons[0]}.` : '';
    return `### ${x.name}\n${x.client}, ${x.location} (${x.year}). ${x.summary}\n${x.outcomes.map((o) => `- ${o}`).join('\n')}${lesson}`;
  });
  const intro = by(p.tone, {
    Formal: `Bastion has completed comparable ${p.workType.toLowerCase()} work across ${listJoin([...new Set(projects.map((x) => x.industry.toLowerCase()))])} facilities. Selected references follow.`,
    Persuasive: `${p.client} will not be our first ${p.workType.toLowerCase()} of this kind. These projects show the same scope, the same pressures, and results we are proud of.`,
    Concise: `Comparable projects:`,
  });
  const refs = `\n\n[[Confirm reference contacts and figures with the project managers before submission.]]`;
  return `${intro}\n\n${table}\n\n${stories.join('\n\n')}${refs}`;
}

function livePerformance(ctx: ComposeContext) {
  const { stats, p } = ctx;
  if (!stats.length) return `[[Pick live performance stats in the Evidence step.]]`;
  const anySample = stats.some((s) => s.source === 'sample');
  const rows = stats.map((s) => `| ${s.label} | **${s.value}**${s.source === 'sample' ? ' †' : ''} | ${s.detail} |`).join('\n');
  const intro = by(p.tone, {
    Formal: `The figures below come from Bastion’s operational systems, including the Bastion Track and SiteSight reporting, and give a current view of how we perform across our active sites.`,
    Persuasive: `Most contractors tell you how they perform. We show you. These numbers come straight from the same Bastion Track and SiteSight dashboards ${p.client} would have access to on this project.`,
    Concise: `Current performance, from Bastion Track and SiteSight reporting:`,
  });
  const foot = anySample
    ? `\n\n† Indicative figure pending confirmation from Bastion operations data. [[Confirm † figures before submission.]]`
    : '';
  return `${intro}\n\n| Measure | Value | Context |\n| --- | --- | --- |\n${rows}${foot}\n\n${p.client} would get a live project dashboard with the same measures for this scope.`;
}

function safety(ctx: ComposeContext) {
  const { p } = ctx;
  const ratio = p.requirements.find((r) => /1\s*:\s*(\d+)/.test(r.text))?.text.match(/1\s*:\s*(\d+)/)?.[1];
  const per = ratio ? Number(ratio) : 50;
  const pros = p.peakHeadcount ? Math.max(1, Math.ceil(p.peakHeadcount / per)) : 0;
  const plan = [
    `- A site-specific safety plan issued [[two weeks]] before mobilization`,
    pros ? `- ${pros} dedicated safety professionals at peak (1:${per} ratio)` : '',
    p.services.includes('safety-services') ? '- Hole watch, fire watch and confined-space attendants supplied from our Bastion safety services pool' : '',
    p.workType === 'Turnaround' ? '- Daily pre-shift safety alignment with the owner’s turnaround safety team' : '',
    '- Short Service Worker identification and mentoring for every new hire',
  ]
    .filter(Boolean)
    .join('\n');
  const trir = p.requirements.some((r) => /trir|emr/i.test(r.text))
    ? `\n\n### Safety statistics\n| Year | TRIR | EMR |\n| --- | --- | --- |\n| [[2024]] | [[TRIR]] | [[EMR]] |\n| [[2025]] | [[TRIR]] | [[EMR]] |\n| [[2026]] | [[TRIR]] | [[EMR]] |`
    : '';
  const awards = p.tone === 'Concise' ? '' : `\n\n### Recognition\n${block(ctx, 'cb-awards')}`;
  return `${block(ctx, 'cb-safehold')}\n\n### Site safety plan for ${p.site || p.client}\n${plan}${trir}${awards}`;
}

function quality(ctx: ComposeContext) {
  const { p } = ctx;
  const holds: string[] = [];
  if (p.services.includes('scaffolding')) holds.push('Scaffold: competent-person inspection and tag before every use');
  if (p.services.includes('insulation')) holds.push('Insulation: spec verification per line class; jacketing inspection before turnover');
  if (p.services.includes('coatings')) holds.push('Coatings: surface profile, DFT and holiday testing hold points signed by the owner’s inspector');
  if (p.services.includes('refractory')) holds.push('Refractory: material certification, anchor inspection and dry-out curve records');
  if (p.services.includes('fireproofing')) holds.push('Fireproofing: thickness verification against specification');
  if (p.services.includes('abatement')) holds.push('Abatement: clearance air monitoring before re-insulation');
  return `${block(ctx, 'cb-quality')}${holds.length ? `\n\n### Inspection hold points for this scope\n${holds.map((h) => `- ${h}`).join('\n')}` : ''}`;
}

function workforce(ctx: ComposeContext) {
  const { p } = ctx;
  const peak = p.peakHeadcount || 0;
  const foremen = Math.ceil(peak / 10);
  const generals = Math.ceil(foremen / 5);
  const phases =
    p.workType === 'Turnaround'
      ? [
          ['Pre-turnaround build', 0.3],
          ['Execution ramp', 0.7],
          ['Execution peak', 1],
          ['Demobilization', 0.25],
        ]
      : p.workType === 'Maintenance'
        ? [
            ['Transition (first 30 days)', 0.6],
            ['Steady state', 0.8],
            ['Planned surge / outages', 1],
          ]
        : [
            ['Mobilization', 0.2],
            ['Ramp-up', 0.6],
            ['Peak construction', 1],
            ['Turnover & demob', 0.3],
          ];
  const table = peak
    ? `\n\n| Phase | Craft | Foremen | General foremen |\n| --- | --- | --- | --- |\n${phases
        .map(([name, f]) => {
          const c = Math.round(peak * (f as number));
          return `| ${name} | ${fmtNum(c)} | ${Math.ceil(c / 10)} | ${Math.max(1, Math.ceil(c / 50))} |`;
        })
        .join('\n')}`
    : `\n\n[[Add peak headcount to generate the staffing table.]]`;
  const intro = peak
    ? `Bastion will staff this scope to a peak of **${fmtNum(peak)} craft**, supervised at 1 foreman per 10 craft and 1 general foreman per 5 foremen (${foremen} foremen and ${generals} general foremen at peak).`
    : `Bastion will size the crew to the final scope and schedule.`;
  const source = `Craft will be drawn from Bastion’s ${p.region} workforce, our recruitment and training centers, and [[local union hall agreements / merit labor pool]] as agreed with ${p.client}.`;
  return `${intro}${table}\n\n${source}\n\n${block(ctx, 'cb-workforce')}`;
}

function schedule(ctx: ComposeContext) {
  const { p } = ctx;
  const start = p.startDate;
  const d = p.durationWeeks || 0;
  const at = (w: number) => (start ? fmtDate(addWeeks(start, w), { month: 'short', day: 'numeric', year: 'numeric' }) : `Week ${w}`);
  let rows: string[][] = [];
  if (p.workType === 'Turnaround') {
    rows = [
      ['Planning & 3D model', `${at(-16)} – ${at(-4)}`, 'Laser scan / walkdowns, 3D scaffold design, material take-off, work-packs'],
      ['Pre-turnaround build', `${at(-4)} – ${at(0)}`, 'Erect non-intrusive scaffold, stage insulation and refractory material'],
      ['Execution', `${at(0)} – ${at(d)}`, '24-hour coverage, daily Bastion Track progress to the owner, critical-path focus'],
      ['Demobilization', `${at(d)} – ${at(d + 1)}`, 'Dismantle, housekeeping, close-out documentation'],
    ];
  } else if (p.workType === 'Maintenance') {
    rows = [
      ['Transition', `${at(0)} – ${at(4)}`, 'Onboard crew, take over open work orders, baseline standing scaffold'],
      ['Steady state', `${at(4)} onward`, 'Weekly planning meetings, Bastion Track reporting, bi-weekly standing-scaffold review'],
      ['Quarterly review', 'Every 13 weeks', 'KPI review with the owner: safety, cost, backlog, productivity'],
    ];
  } else {
    const q = Math.max(1, Math.round(d / 4));
    rows = [
      ['Mobilization', `${at(0)} – ${at(q / 2)}`, 'Site setup, orientation, 3D model and quantity validation'],
      ['Ramp-up', `${at(q / 2)} – ${at(q * 1.5)}`, 'Access for mechanical and piping; first insulation areas'],
      ['Peak', `${at(q * 1.5)} – ${at(q * 3.2)}`, 'Full soft-craft production, area-by-area sequencing'],
      ['Turnover & demob', `${at(q * 3.2)} – ${at(d || q * 4)}`, 'System turnover, punch list, dismantle'],
    ];
  }
  const table = `| Phase | Timing | Key activities |\n| --- | --- | --- |\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}`;
  const l3 = p.requirements.some((r) => /level 3/i.test(r.text))
    ? `\n\nA detailed Level 3 schedule is provided as [[Appendix B: Level 3 schedule]].`
    : '';
  return `${by(p.tone, {
    Formal: `The execution plan below is aligned to the ${p.client} ${workPhrase(p)} schedule.`,
    Persuasive: `Our plan puts the hard work before the clock starts, so the ${p.workType === 'Turnaround' ? 'window' : 'schedule'} is protected.`,
    Concise: 'Execution plan:',
  })}\n\n${table}${l3}`;
}

function technology(ctx: ComposeContext) {
  const { p } = ctx;
  const results = `\n\n### Proven results\n${COMPANY.techResults.map((r) => `- **${r.value}** ${r.label}`).join('\n')}`;
  const fit = `\n\n### On this project\n- ${p.workType === 'Turnaround' ? 'Scaffold for the turnaround designed in 3D before the window opens' : 'Quantities and access validated in 3D before mobilization'}\n- Every scaffold request, build and dismantle tracked in Bastion Track, visible to ${p.client}\n- SiteSight dashboards for daily productivity and cost`;
  return `${block(ctx, 'cb-lens')}${results}${p.tone === 'Concise' ? '' : fit}`;
}

function commercial(ctx: ComposeContext) {
  const { p } = ctx;
  const basis: Record<string, string> = {
    'Time & Materials': 'Pricing is provided on a Time & Materials basis using the attached rate sheet.',
    'Unit Rate': 'Pricing is provided on a Unit Rate basis, with a not-to-exceed estimate based on the quantities in our take-off.',
    'Lump Sum': 'Pricing is provided as a Lump Sum for the defined scope, with unit rates for changes.',
    'Master Services Agreement': 'Work will be performed under a Master Services Agreement with agreed rate schedules and KPIs.',
  };
  return `${basis[p.contractType]} Detailed pricing is in the separate commercial workbook [[attach pricing file]].\n\n### Assumptions\n${block(ctx, 'cb-commercial')}\n\n### Exclusions\n- [[List exclusions agreed with the estimating team]]`;
}

function whyBastion(ctx: ComposeContext) {
  const { p } = ctx;
  const reasons = [
    `**Safety first, always.** SafeHold is our number one value, proven at 31 client sites with zero recordables for three years or more.`,
    `**Scale when you need it.** ${COMPANY.employees} people and ${COMPANY.facilities} facilities across the U.S. and Canada.`,
    `**Plan before you build.** Bastion Lens 3D modeling and Bastion Track tracking make cost and schedule predictable.`,
    `**One partner, many crafts.** Scaffold, insulation, coatings, refractory and more under one system.`,
    `**65+ years of doing this.** Our experience is in refineries, petrochemical plants, LNG and power facilities like yours.`,
  ];
  return `${reasons.map((r) => `- ${r}`).join('\n')}\n\n${by(p.tone, {
    Formal: `Bastion appreciates the opportunity to support ${p.client} and looks forward to discussing this proposal.`,
    Persuasive: `${p.client} deserves a partner who treats your site like their own. That is the Bastion standard. **When results matter, choose Bastion.**`,
    Concise: `We look forward to working with ${p.client}.`,
  })}`;
}

const WRITERS: Record<SectionKey, (ctx: ComposeContext) => string> = {
  cover_letter: coverLetter,
  executive_summary: executiveSummary,
  understanding,
  company_overview: companyOverview,
  services,
  experience,
  live_performance: livePerformance,
  safety,
  quality,
  workforce,
  schedule,
  technology,
  commercial,
  why_bastion: whyBastion,
};

export function draftSection(key: SectionKey, ctx: ComposeContext): string {
  return WRITERS[key](ctx);
}
