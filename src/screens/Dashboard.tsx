import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assessReadiness } from '@/ai/quality';
import {
  ChartIcon,
  ChevronRight,
  ClipboardIcon,
  ClockIcon,
  CopyIcon,
  FileIcon,
  SparkIcon,
  TrophyIcon,
  WandIcon,
} from '@/components/icons';
import { Card, ProgressRing, SectionLabel, SourceTag, Sparkline, StatusStamp } from '@/components/ui';
import { LIVE_STATS, USERS } from '@/data/company';
import { daysUntil, fmtDate, fmtMoney, timeAgo } from '@/lib/format';
import { useStore } from '@/lib/store';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const START_OPTIONS = [
  {
    to: '/new?mode=rfp',
    icon: ClipboardIcon,
    title: 'Paste the client’s RFP',
    text: 'Bastion Assist reads it, fills in the details and builds a requirements checklist.',
    time: '≈ 5 min',
    accent: true,
  },
  {
    to: '/new?mode=quick',
    icon: WandIcon,
    title: 'Start from a few answers',
    text: 'Pick client, services and work type. Bastion Assist drafts the rest.',
    time: '≈ 7 min',
  },
  {
    to: '/new?template=capability',
    icon: FileIcon,
    title: 'Capability statement',
    text: 'Introduce Bastion to a new client. No RFP needed.',
    time: '≈ 3 min',
  },
];

export function Dashboard() {
  const { user, proposals } = useStore();
  const nav = useNavigate();

  const open = proposals.filter((p) => p.status === 'draft' || p.status === 'review');
  const won = proposals.filter((p) => p.status === 'won').length;
  const lost = proposals.filter((p) => p.status === 'lost').length;
  const pipeline = proposals.filter((p) => ['draft', 'review', 'submitted'].includes(p.status)).reduce((a, p) => a + p.estimatedValue, 0);
  const readiness = useMemo(() => new Map(open.map((p) => [p.id, assessReadiness(p).score])), [open]);
  const avgReady = open.length ? Math.round([...readiness.values()].reduce((a, b) => a + b, 0) / open.length) : 0;
  const dueSoon = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const due14 = open.filter((p) => (daysUntil(p.dueDate) ?? 99) <= 14).length;
  const activity = proposals
    .flatMap((p) => p.activity.map((a) => ({ ...a, p })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 7);
  const liveTiles = LIVE_STATS.filter((s) => s.trend).slice(0, 4);

  return (
    <div className="scroll-quiet h-full overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-8 sm:px-8">
        {/* Greeting */}
        <div className="fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-ink-tertiary">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-ink">
              {greeting()}, {user?.name.split(' ')[0]}.
            </h1>
            <p className="mt-1 text-[15px] text-ink-secondary">
              {due14 > 0 ? (
                <>
                  You have <strong className="text-ink">{due14} proposal{due14 > 1 ? 's' : ''}</strong> due in the next two weeks.
                </>
              ) : (
                'No deadlines in the next two weeks. Good time to start something new.'
              )}
            </p>
          </div>
        </div>

        {/* Start */}
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {START_OPTIONS.map(({ to, icon: Icon, title, text, time, accent }, i) => (
            <button
              key={to}
              onClick={() => nav(to)}
              style={{ animationDelay: `${60 + i * 50}ms` }}
              className={`fade-up group relative overflow-hidden rounded-panel border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                accent ? 'border-rampart bg-rampart text-white [:root[data-theme=dark]_&]:bg-rampart-wash [:root[data-theme=dark]_&]:text-ink' : 'border-rule bg-paper-raised hover:border-rule-strong'
              }`}
            >
              {accent && <div className="blueprint pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:linear-gradient(135deg,transparent_30%,black)]" />}
              <div className="relative flex items-start justify-between">
                <span className={`grid h-10 w-10 place-items-center rounded-record ${accent ? 'bg-white/12 text-white [:root[data-theme=dark]_&]:text-rampart' : 'bg-rampart-wash text-rampart'}`}>
                  <Icon size={20} />
                </span>
                <span className={`text-[11.5px] font-semibold ${accent ? 'text-white/70 [:root[data-theme=dark]_&]:text-ink-tertiary' : 'text-ink-tertiary'}`}>{time}</span>
              </div>
              <h3 className="relative mt-4 text-[16px] font-semibold">{title}</h3>
              <p className={`relative mt-1 text-[13.5px] leading-relaxed ${accent ? 'text-white/80 [:root[data-theme=dark]_&]:text-ink-secondary' : 'text-ink-secondary'}`}>{text}</p>
              <span className={`relative mt-4 inline-flex items-center gap-1 text-[13px] font-semibold ${accent ? 'text-white [:root[data-theme=dark]_&]:text-rampart' : 'text-rampart'}`}>
                Start <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-rule bg-rule md:grid-cols-4">
          {[
            { label: 'Open pipeline', value: fmtMoney(pipeline), sub: `${open.length + proposals.filter((p) => p.status === 'submitted').length} live bids`, icon: ChartIcon },
            { label: 'Win rate', value: won + lost ? `${Math.round((won / (won + lost)) * 100)}%` : '—', sub: `${won} won · ${lost} lost`, icon: TrophyIcon },
            { label: 'Avg. readiness', value: `${avgReady}`, sub: 'of open proposals, out of 100', icon: SparkIcon },
            { label: 'Writing time saved', value: `${proposals.length * 14}h`, sub: 'est. 14h per proposal vs manual', icon: ClockIcon },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="bg-paper-raised px-5 py-4">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-tertiary">
                <Icon size={14} /> {label}
              </p>
              <p className="tabular mt-1.5 text-[26px] font-semibold tracking-tight text-ink">{value}</p>
              <p className="text-[12px] text-ink-tertiary">{sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* Due soon */}
          <section>
            <SectionLabel right={<Link to="/proposals" className="text-[12.5px] font-semibold text-rampart hover:underline">All proposals</Link>}>
              Open proposals by deadline
            </SectionLabel>
            <Card className="overflow-hidden">
              {dueSoon.length === 0 && <p className="p-6 text-center text-[13px] text-ink-tertiary">No open proposals.</p>}
              {dueSoon.map((p) => {
                const d = daysUntil(p.dueDate) ?? 0;
                const owner = USERS.find((u) => u.id === p.owner);
                const urgent = d <= 3;
                const countdown = d < 0 ? `${-d} day${d === -1 ? '' : 's'} overdue` : d === 0 ? 'Due today' : `${d} day${d === 1 ? '' : 's'} left`;
                return (
                  <Link key={p.id} to={`/p/${p.id}`} className="group flex items-center gap-3.5 border-b border-rule px-4 py-3.5 last:border-b-0 hover:bg-paper-inset">
                    {/* Deadline as a calendar tile, so the date is the first thing you read */}
                    <div
                      className={`w-12 shrink-0 overflow-hidden rounded-record border text-center ${urgent ? 'border-beacon/50' : 'border-rule-strong'}`}
                      title={`Due ${fmtDate(p.dueDate)}`}
                    >
                      <div className={`py-0.5 text-[10px] font-bold uppercase tracking-wider text-white [:root[data-theme=dark]_&]:text-[#0e1116] ${urgent ? 'bg-beacon' : 'bg-rampart'}`}>
                        {fmtDate(p.dueDate, { month: 'short' })}
                      </div>
                      <div className="tabular bg-paper-raised py-1 text-[19px] font-bold leading-tight text-ink">{fmtDate(p.dueDate, { day: 'numeric' })}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink group-hover:text-rampart">{p.title}</p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-tertiary">
                        <span className={`tabular shrink-0 font-semibold ${urgent ? 'text-beacon' : d <= 10 ? 'text-warn' : 'text-ink-secondary'}`}>{countdown}</span>
                        <span className="shrink-0">·</span>
                        <span className="truncate">
                          {p.client} · {p.workType} · {owner?.name}
                        </span>
                      </p>
                    </div>
                    <span className="hidden shrink-0 items-center gap-1.5 text-[11.5px] text-ink-tertiary sm:flex" title="Readiness score">
                      <ProgressRing value={readiness.get(p.id) ?? 0} size={34} stroke={3.5} label={`Readiness ${readiness.get(p.id)}`} />
                    </span>
                    <StatusStamp status={p.status} />
                  </Link>
                );
              })}
            </Card>

            <div className="mt-8">
              <SectionLabel>Recent activity</SectionLabel>
              <ol className="relative ml-2 border-l border-rule pl-5">
                {activity.map((a, i) => (
                  <li key={i} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full border-2 border-paper bg-ink-muted" />
                    <p className="text-[13px] text-ink-secondary">
                      <strong className="font-semibold text-ink">{a.who}</strong> {a.what.charAt(0).toLowerCase() + a.what.slice(1)} on{' '}
                      <Link to={`/p/${a.p.id}`} className="font-medium text-rampart hover:underline">
                        {a.p.title}
                      </Link>
                    </p>
                    <p className="text-[11.5px] text-ink-tertiary">{timeAgo(a.at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Live performance */}
          <section>
            <SectionLabel right={<span className="text-[11.5px] text-ink-tertiary">from Bastion Track · SiteSight</span>}>Live performance proof</SectionLabel>
            <Card className="p-4">
              <p className="text-[13px] leading-relaxed text-ink-secondary">
                These live numbers can be dropped straight into any proposal, so clients see how Bastion performs today, not just a brochure.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {liveTiles.map((s) => (
                  <div key={s.id} className="rounded-record border border-rule p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11.5px] font-medium leading-snug text-ink-tertiary">{s.label}</p>
                      <SourceTag source={s.source} />
                    </div>
                    <p className="tabular mt-1 text-[22px] font-semibold tracking-tight text-ink">{s.value}</p>
                    {s.trend && <Sparkline data={s.trend} width={130} />}
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-tertiary">
                <CopyIcon size={13} className="mt-0.5 shrink-0" />
                “Sample” figures are placeholders until a live data feed is connected. The readiness check flags them before you send.
              </p>
            </Card>

            <div className="mt-6 rounded-panel border border-dashed border-rule-strong p-4">
              <p className="text-[13px] font-semibold text-ink">Tip: let Bastion Assist check your work</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
                In any proposal, ask Bastion Assist <em>“What’s missing?”</em>. It checks every RFP requirement, open placeholder and proof point, then tells you exactly what to fix.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
