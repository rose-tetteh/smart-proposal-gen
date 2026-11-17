/**
 * The proposal as a document on a desk. Every section can be edited in place
 * or rewritten by Bastion Assist with one click.
 */
import { useEffect, useRef, useState } from 'react';
import { REWRITE_OPS, type RewriteOp } from '@/ai/rewrite';
import { CheckIcon, ChevronDown, CopyIcon, EditIcon, RefreshIcon, WandIcon } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { Spinner } from '@/components/ui';
import { USERS } from '@/data/company';
import { fmtDate } from '@/lib/format';
import type { Proposal, Section } from '@/lib/types';

function CoverPage({ p }: { p: Proposal }) {
  const owner = USERS.find((u) => u.id === p.owner);
  return (
    <div className="relative flex min-h-[640px] flex-col overflow-hidden px-12 pb-12 pt-12">
      <div className="absolute inset-x-0 top-0 h-2 bg-[#c2410c]" />
      <img src="/bastion-logo.png" alt="Bastion" className="h-10 w-fit" />
      <div className="mt-auto">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-[#c2410c]">Proposal for {p.client || 'Client'}</p>
        <h1 className="mt-3 font-sans text-[34px] font-bold leading-[1.12] tracking-tight text-[#0e4a52]">{p.title}</h1>
        <p className="mt-4 max-w-md text-[16px] text-[#454b59]">
          {[p.site, p.location].filter(Boolean).join(' · ')}
          {p.site || p.location ? <br /> : null}
          {p.workType} · {p.industry}
        </p>
      </div>
      <div className="mt-14 grid grid-cols-3 gap-6 border-t border-[#e3e5ea] pt-5 font-sans text-[12px]">
        <div>
          <p className="font-semibold uppercase tracking-[0.08em] text-[#9aa1ae]">Date</p>
          <p className="mt-1 font-medium text-[#14171f]">{fmtDate(p.dueDate) || fmtDate(new Date().toISOString())}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.08em] text-[#9aa1ae]">Prepared by</p>
          <p className="mt-1 font-medium text-[#14171f]">{owner?.name}</p>
          <p className="text-[#6b7280]">{owner?.title}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.08em] text-[#9aa1ae]">Bastion</p>
          <p className="mt-1 font-medium text-[#14171f]">Hold the Line</p>
          <p className="text-[#6b7280]">bastion.example</p>
        </div>
      </div>
      <svg className="pointer-events-none absolute -right-16 top-24 h-[360px] w-[360px] opacity-[0.07]" viewBox="0 0 100 100" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, r) =>
          Array.from({ length: 4 }).map((__, c) => (
            <g key={`${r}-${c}`} stroke="#0e4a52" strokeWidth="0.8" fill="none">
              <rect x={10 + c * 20} y={5 + r * 15} width="20" height="15" />
              <line x1={10 + c * 20} y1={20 + r * 15} x2={30 + c * 20} y2={5 + r * 15} />
            </g>
          )),
        )}
      </svg>
    </div>
  );
}

function AutoTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 4}px`;
  }, [value]);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck
      className="block w-full resize-none rounded-[4px] border border-[#0e4a52]/30 bg-[#f7f8fb] p-3 font-mono text-[12.5px] leading-[1.65] text-[#14171f] focus:border-[#0e4a52] focus:outline-none"
      aria-label="Section text"
    />
  );
}

function SectionBlock({
  s,
  index,
  active,
  busy,
  onFocus,
  onChange,
  onRewrite,
  onRegenerate,
  onCopy,
}: {
  s: Section;
  index: number;
  active: boolean;
  busy: boolean;
  onFocus: () => void;
  onChange: (body: string) => void;
  onRewrite: (op: RewriteOp) => void;
  onRegenerate: () => void;
  onCopy: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);

  return (
    <section
      id={`sec-${s.id}`}
      onMouseDown={onFocus}
      className={`group relative scroll-mt-6 border-t border-[#eceef2] px-12 py-9 transition-colors ${active ? 'bg-[#fbfbfd]' : ''}`}
    >
      {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#c2410c]" />}

      {/* Section toolbar */}
      <div className={`no-print absolute right-5 top-4 z-10 flex items-center gap-0.5 rounded-[7px] border border-[#e3e5ea] bg-white p-0.5 font-sans shadow-sm transition-opacity ${active || menu || editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {editing ? (
          <button onClick={() => setEditing(false)} className="flex h-7 items-center gap-1 rounded-[5px] bg-[#0e4a52] px-2.5 text-[12px] font-semibold text-white">
            <CheckIcon size={14} /> Done
          </button>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="flex h-7 items-center gap-1 rounded-[5px] px-2 text-[12px] font-semibold text-[#454b59] hover:bg-[#f3f4f6]" title="Edit text">
              <EditIcon size={14} /> Edit
            </button>
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} className="flex h-7 items-center gap-1 rounded-[5px] px-2 text-[12px] font-semibold text-[#454b59] hover:bg-[#f3f4f6]" aria-expanded={menu}>
                <WandIcon size={14} /> Rewrite <ChevronDown size={12} />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onMouseDown={(e) => { e.stopPropagation(); setMenu(false); }} />
                  <div className="pop-in absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-[8px] border border-[#e3e5ea] bg-white py-1 shadow-xl">
                    {REWRITE_OPS.map((o) => (
                      <button
                        key={o.id}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          setMenu(false);
                          onRewrite(o.id);
                        }}
                        className="block w-full px-3 py-1.5 text-left hover:bg-[#eef6f6]"
                      >
                        <span className="block text-[12.5px] font-semibold text-[#14171f]">{o.label}</span>
                        <span className="block text-[11.5px] text-[#6b7280]">{o.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={onRegenerate} className="grid h-7 w-7 place-items-center rounded-[5px] text-[#454b59] hover:bg-[#f3f4f6]" title="Regenerate from current details" aria-label="Regenerate section">
              <RefreshIcon size={14} />
            </button>
            <button onClick={onCopy} className="grid h-7 w-7 place-items-center rounded-[5px] text-[#454b59] hover:bg-[#f3f4f6]" title="Copy section" aria-label="Copy section">
              <CopyIcon size={14} />
            </button>
          </>
        )}
      </div>

      <h2 className="flex items-baseline gap-3">
        <span className="font-sans text-[13px] font-bold text-[#c2410c]">{String(index + 1).padStart(2, '0')}</span>
        {s.title}
      </h2>

      <div className={`relative mt-3 ${busy ? 'pointer-events-none' : ''}`}>
        {editing ? (
          <>
            <AutoTextarea value={s.body} onChange={onChange} />
            <p className="mt-2 font-sans text-[11.5px] text-[#6b7280]">
              <code className="rounded bg-[#eef0f4] px-1">**bold**</code> · <code className="rounded bg-[#eef0f4] px-1">- bullet</code> ·{' '}
              <code className="rounded bg-[#eef0f4] px-1">### heading</code> · <code className="rounded bg-[#eef0f4] px-1">[[needs input]]</code> · tables with <code className="rounded bg-[#eef0f4] px-1">| a | b |</code>
            </p>
          </>
        ) : (
          <div onDoubleClick={() => setEditing(true)} className={busy ? 'opacity-30 blur-[1px] transition' : 'transition'}>
            <Markdown source={s.body} />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 font-sans text-[12.5px] font-semibold text-[#0e4a52] shadow-lg ring-1 ring-[#e3e5ea]">
              <Spinner size={14} /> Bastion Assist is rewriting…
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export function DocumentView({
  p,
  activeId,
  busyId,
  setActive,
  onChange,
  onRewrite,
  onRegenerate,
  onCopy,
}: {
  p: Proposal;
  activeId: string | null;
  busyId: string | null;
  setActive: (id: string) => void;
  onChange: (id: string, body: string) => void;
  onRewrite: (id: string, op: RewriteOp) => void;
  onRegenerate: (id: string) => void;
  onCopy: (id: string) => void;
}) {
  return (
    <article className="sheet doc mx-auto w-full max-w-[820px] rounded-[4px]" aria-label="Proposal document">
      <CoverPage p={p} />
      {p.sections.map((s, i) => (
        <SectionBlock
          key={s.id}
          s={s}
          index={i}
          active={activeId === s.id}
          busy={busyId === s.id}
          onFocus={() => setActive(s.id)}
          onChange={(b) => onChange(s.id, b)}
          onRewrite={(op) => onRewrite(s.id, op)}
          onRegenerate={() => onRegenerate(s.id)}
          onCopy={() => onCopy(s.id)}
        />
      ))}
      <footer className="flex items-center justify-between border-t-2 border-[#c2410c] px-12 py-5 font-sans text-[11px] text-[#9aa1ae]">
        <span>Bastion · Confidential proposal for {p.client}</span>
        <span>bastion.example</span>
      </footer>
    </article>
  );
}
