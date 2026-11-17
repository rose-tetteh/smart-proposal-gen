import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assessReadiness } from '@/ai/quality';
import { KanbanIcon, ListIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { Avatar, Button, ProgressRing, STATUS_META, StatusStamp } from '@/components/ui';
import { USERS } from '@/data/company';
import { daysUntil, fmtMoney, fmtShort, timeAgo } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Proposal, ProposalStatus } from '@/lib/types';

const COLUMNS: ProposalStatus[] = ['draft', 'review', 'submitted', 'won', 'lost'];

function DueCell({ p }: { p: Proposal }) {
  const d = daysUntil(p.dueDate) ?? 0;
  const open = p.status === 'draft' || p.status === 'review';
  return (
    <span className={`tabular text-[12.5px] ${open && d <= 3 ? 'font-semibold text-beacon' : open && d <= 10 ? 'text-warn' : 'text-ink-tertiary'}`}>
      {fmtShort(p.dueDate)}
      {open && <span className="ml-1 text-[11.5px]">({d < 0 ? `${-d}d late` : `${d}d`})</span>}
    </span>
  );
}

export function Proposals() {
  const { proposals, user } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProposalStatus | 'all'>('all');
  const [mine, setMine] = useState(false);
  const [view, setView] = useState<'list' | 'board'>('list');

  const scores = useMemo(() => new Map(proposals.map((p) => [p.id, assessReadiness(p).score])), [proposals]);
  const rows = proposals
    .filter((p) => (status === 'all' || p.status === status) && (!mine || p.owner === user?.id))
    .filter((p) => !q || `${p.title} ${p.client} ${p.site} ${p.location}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-rule px-5 pb-4 pt-6 sm:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-ink">Proposals</h1>
            <p className="text-[13.5px] text-ink-tertiary">{proposals.length} proposals · {fmtMoney(proposals.filter((p) => p.status !== 'lost').reduce((a, p) => a + p.estimatedValue, 0))} total value</p>
          </div>
          <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => nav('/new')}>
            New proposal
          </Button>
        </div>
        <div className="mx-auto mt-4 flex max-w-[1180px] flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <SearchIcon size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, client, site…"
              className="w-full rounded-control border border-rule-strong bg-paper-raised py-1.5 pl-8 pr-3 text-[13.5px] text-ink placeholder:text-ink-muted focus:border-rampart focus:outline-none"
              aria-label="Search proposals"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(['all', ...COLUMNS] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-[12.5px] font-medium ${status === s ? 'bg-ink text-paper' : 'text-ink-secondary hover:bg-paper-sunk'}`}
              >
                {s === 'all' ? 'All' : STATUS_META[s].label}
                <span className="tabular ml-1 opacity-60">{s === 'all' ? proposals.length : proposals.filter((p) => p.status === s).length}</span>
              </button>
            ))}
          </div>
          <label className="ml-1 flex items-center gap-1.5 text-[12.5px] text-ink-secondary">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[var(--color-rampart)]" /> Only mine
          </label>
          <div className="ml-auto flex rounded-control border border-rule-strong p-0.5">
            <button aria-label="List view" onClick={() => setView('list')} className={`grid h-7 w-8 place-items-center rounded-[4px] ${view === 'list' ? 'bg-paper-sunk text-ink' : 'text-ink-tertiary'}`}>
              <ListIcon size={16} />
            </button>
            <button aria-label="Board view" onClick={() => setView('board')} className={`grid h-7 w-8 place-items-center rounded-[4px] ${view === 'board' ? 'bg-paper-sunk text-ink' : 'text-ink-tertiary'}`}>
              <KanbanIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="scroll-quiet min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          {rows.length === 0 && (
            <div className="blueprint grid place-items-center rounded-panel border border-dashed border-rule-strong py-16 text-center">
              <div>
                <p className="text-[15px] font-semibold text-ink">No proposals match.</p>
                <p className="mt-1 text-[13px] text-ink-tertiary">Clear the filters, or start a new one.</p>
              </div>
            </div>
          )}

          {view === 'list' && rows.length > 0 && (
            <div className="overflow-hidden rounded-panel border border-rule">
              <table className="w-full text-left">
                <thead className="bg-paper-inset text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-tertiary">
                  <tr>
                    <th className="px-4 py-2.5">Proposal</th>
                    <th className="hidden px-3 py-2.5 md:table-cell">Work</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="hidden px-3 py-2.5 sm:table-cell">Ready</th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">Value</th>
                    <th className="px-3 py-2.5">Due</th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const owner = USERS.find((u) => u.id === p.owner);
                    return (
                      <tr key={p.id} className="cursor-pointer border-t border-rule hover:bg-paper-inset" onClick={() => nav(`/p/${p.id}`)}>
                        <td className="max-w-0 px-4 py-3">
                          <Link to={`/p/${p.id}`} className="block truncate text-[14px] font-semibold text-ink hover:text-rampart" onClick={(e) => e.stopPropagation()}>
                            {p.title}
                          </Link>
                          <p className="truncate text-[12.5px] text-ink-tertiary">
                            {p.client} · updated {timeAgo(p.updatedAt)}
                          </p>
                        </td>
                        <td className="hidden px-3 py-3 text-[12.5px] text-ink-secondary md:table-cell">
                          {p.workType}
                          <br />
                          <span className="text-ink-tertiary">{p.industry}</span>
                        </td>
                        <td className="px-3 py-3">
                          <StatusStamp status={p.status} />
                        </td>
                        <td className="hidden px-3 py-3 sm:table-cell">
                          <ProgressRing value={scores.get(p.id) ?? 0} size={32} stroke={3.5} />
                        </td>
                        <td className="tabular hidden px-3 py-3 text-[13px] text-ink-secondary lg:table-cell">{fmtMoney(p.estimatedValue)}</td>
                        <td className="px-3 py-3">
                          <DueCell p={p} />
                        </td>
                        <td className="hidden px-3 py-3 lg:table-cell">
                          <span className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                            <Avatar initials={owner?.initials ?? '?'} size={22} tone={owner?.canApprove ? 'beacon' : 'rampart'} />
                            {owner?.name.split(' ')[0]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {view === 'board' && rows.length > 0 && (
            <div className="grid min-w-[900px] grid-cols-5 gap-3">
              {COLUMNS.map((c) => {
                const items = rows.filter((p) => p.status === c);
                return (
                  <div key={c} className="rounded-panel bg-paper-inset p-2">
                    <p className="flex items-center gap-2 px-1.5 pb-2 pt-1 text-[12px] font-semibold text-ink-secondary">
                      <span className={`h-2 w-2 rounded-full ${STATUS_META[c].dot}`} /> {STATUS_META[c].label}
                      <span className="tabular text-ink-muted">{items.length}</span>
                    </p>
                    <div className="space-y-2">
                      {items.map((p) => (
                        <Link key={p.id} to={`/p/${p.id}`} className="block rounded-record border border-rule bg-paper-raised p-3 transition-colors hover:border-rule-strong">
                          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{p.title}</p>
                          <p className="mt-1 text-[12px] text-ink-tertiary">{p.client}</p>
                          <div className="mt-2.5 flex items-center justify-between">
                            <DueCell p={p} />
                            <ProgressRing value={scores.get(p.id) ?? 0} size={26} stroke={3} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
