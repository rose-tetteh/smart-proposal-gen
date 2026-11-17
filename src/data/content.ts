/**
 * Approved, reusable content blocks: the "boilerplate" a proposal writer
 * would otherwise copy and paste from old Word files. The generator pulls
 * these into sections; users can edit them in the Content Library.
 *
 * All wording describes Bastion, a fictional demo company.
 */
import type { ContentBlock } from '@/lib/types';

const D = '2026-10-15';

export const CONTENT_BLOCKS: ContentBlock[] = [
  {
    id: 'cb-who',
    title: 'Who is Bastion',
    category: 'Company',
    approved: true,
    updatedAt: D,
    body:
      'For more than 65 years, Bastion has provided specialty multi-craft services across the U.S. and Canada. We work in oil & gas, petrochemical, power generation, LNG, offshore, heavy manufacturing, pipelines & transmission, nuclear, pulp and paper, and pharmaceutical facilities.\n\nBastion delivers scaffolding, insulation, coatings, abatement, refractory, fireproofing, rope access and fabrication, as well as general mechanical services that include civil, structural, mechanical, piping, and electrical & instrumentation. To help owners keep safe worksites, we also provide safety professionals, safety attendants and ground support personnel.',
  },
  {
    id: 'cb-mission',
    title: 'Mission & Vision',
    category: 'Company',
    approved: true,
    updatedAt: D,
    body:
      '**Mission:** To keep the plants that power North America running: safely, on schedule and on budget.\n\n**Vision:** To be the contractor owners trust most with their hardest, highest-risk work.',
  },
  {
    id: 'cb-safehold',
    title: 'SafeHold Safety Culture',
    category: 'Safety',
    approved: true,
    updatedAt: D,
    body:
      'Bastion’s safety culture is called **SafeHold**, and it comes before schedule and cost on every job. Its goal is simple: **Zero Harm**, so that everyone goes home safe at the end of every shift.\n\nSafeHold starts with each person taking responsibility for their own safety and extends to their crew, the owner’s people and the community around the plant. It is put into practice through:\n- A pre-task risk assessment and a last-minute risk check on every job\n- Stop Work Authority: anyone can stop a job they believe is unsafe, with no blame\n- A short-service worker program that pairs new and returning craft with a mentor\n- Weekly leading-indicator reviews (observations, near misses, stop-work calls) with the owner',
  },
  {
    id: 'cb-awards',
    title: 'Safety Recognition',
    category: 'Safety',
    approved: true,
    updatedAt: D,
    body:
      '- 31 client sites with three or more years and zero recordable incidents\n- 9 OSHA VPP Star worksites\n- Gold award from the Gulf Coast Contractor Safety Council, 2025\n- 4 owner-nominated contractor safety awards in 2025',
  },
  {
    id: 'cb-quality',
    title: 'Quality Management System',
    category: 'Quality',
    approved: true,
    updatedAt: D,
    body:
      'Bastion’s Quality Management System, **BuildRight**, is modelled on **ISO 9001**. It covers the Quality Manual, inspection and test plans, work instructions and quality-control forms for every craft, and it is checked through internal audits and management reviews. A Quality Steering Group reviews results every quarter and drives improvements.\n\nOur improvement habit is **"Sharper Every Shift"**: lessons from each job are captured in the debrief and turned into standard practice for the next one.',
  },
  {
    id: 'cb-workforce',
    title: 'Workforce & Training',
    category: 'Workforce',
    approved: true,
    updatedAt: D,
    body:
      'Bastion employs both union and merit craft across the United States and Canada, and works with local unions and training partners in each region. Our four regional training yards and craft recruiting teams keep a qualified, site-ready craft pool available for maintenance programs and turnaround surges.',
  },
  {
    id: 'cb-lens',
    title: 'Bastion Lens Technology Suite',
    category: 'Technology',
    approved: true,
    updatedAt: D,
    body:
      'With **Bastion Lens**, we pair decades of field experience with 3D modeling, laser scanning, drone capture, data analytics and digital field tools. Owners and EPCs see the work before it starts and follow it in real time once it does.\n\n- **3D Modeling:** check access, quantities and clashes before anyone is on site\n- **Bastion Track:** logs every scaffold request, build, modification and dismantle to control cost and utilization\n- **SiteSight:** live dashboards for productivity, cost and progress\n- **Laser Scanning & Drones:** capture accurate as-is site conditions\n- **Digital Field Tools:** permits, inspections and timesheets on tablets, not paper',
  },
  {
    id: 'cb-commercial',
    title: 'Standard Commercial Assumptions',
    category: 'Commercial',
    approved: false,
    updatedAt: D,
    body:
      '- Pricing is valid for 90 days from the date of submission\n- Work is performed under Bastion’s standard Terms & Conditions unless otherwise agreed\n- Site access, permits and utilities are provided by the owner\n- Rates assume a standard 5×10 schedule unless otherwise stated\n- Changes to scope are managed through a written change-order process',
  },
];
