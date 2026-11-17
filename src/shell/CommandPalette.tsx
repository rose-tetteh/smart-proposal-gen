/** Ctrl/Cmd+K: jump to any proposal, past project or action without leaving the keyboard. */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookIcon, ClipboardIcon, FileIcon, LayersIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { Kbd, STATUS_META } from '@/components/ui';
import { useStore } from '@/lib/store';

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { proposals, projects } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setI(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      nav(to);
      onClose();
    };
    const actions: Item[] = [
      { id: 'a-new', group: 'Actions', label: 'New proposal', hint: 'Start the guided flow', icon: <PlusIcon size={16} />, run: go('/new') },
      { id: 'a-rfp', group: 'Actions', label: 'New proposal from an RFP', hint: 'Paste or upload the RFP', icon: <ClipboardIcon size={16} />, run: go('/new?mode=rfp') },
      { id: 'a-cap', group: 'Actions', label: 'New capability statement', hint: 'No RFP needed', icon: <FileIcon size={16} />, run: go('/new?template=capability') },
      { id: 'a-lib', group: 'Actions', label: 'Open experience library', icon: <LayersIcon size={16} />, run: go('/library') },
      { id: 'a-content', group: 'Actions', label: 'Open content library', icon: <BookIcon size={16} />, run: go('/content') },
    ];
    const props: Item[] = proposals.map((p) => ({
      id: p.id,
      group: 'Proposals',
      label: p.title,
      hint: `${p.client} · ${STATUS_META[p.status].label}`,
      icon: <FileIcon size={16} />,
      run: go(`/p/${p.id}`),
    }));
    const projs: Item[] = projects.map((p) => ({
      id: p.id,
      group: 'Past projects',
      label: p.name,
      hint: `${p.location} · ${p.workType}`,
      icon: <LayersIcon size={16} />,
      run: go(`/library?focus=${p.id}`),
    }));
    const all = [...actions, ...props, ...projs];
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [...actions, ...props.slice(0, 5)];
    return all.filter((it) => terms.every((t) => `${it.label} ${it.hint ?? ''}`.toLowerCase().includes(t))).slice(0, 12);
  }, [q, proposals, projects, nav, onClose]);

  if (!open) return null;

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setI((x) => Math.min(items.length - 1, x + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setI((x) => Math.max(0, x - 1));
    } else if (e.key === 'Enter') items[i]?.run();
    else if (e.key === 'Escape') onClose();
  };

  let lastGroup = '';
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center bg-[#0b0e14]/40 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="pop-in w-full max-w-xl overflow-hidden rounded-panel border border-rule-strong bg-paper-raised shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-rule px-4">
          <SearchIcon className="text-ink-tertiary" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            onKeyDown={onKey}
            placeholder="Search proposals, past projects, actions…"
            className="h-12 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
            aria-label="Search"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul className="scroll-quiet max-h-[52vh] overflow-y-auto p-1.5" role="listbox">
          {items.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-ink-tertiary">No matches for “{q}”</li>}
          {items.map((it, idx) => {
            const header = it.group !== lastGroup;
            lastGroup = it.group;
            return (
              <li key={it.id}>
                {header && <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{it.group}</p>}
                <button
                  role="option"
                  aria-selected={idx === i}
                  onMouseEnter={() => setI(idx)}
                  onClick={it.run}
                  className={`flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left ${idx === i ? 'bg-rampart-wash text-ink' : 'text-ink-secondary'}`}
                >
                  <span className="text-ink-tertiary">{it.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{it.label}</span>
                    {it.hint && <span className="block truncate text-[12px] text-ink-tertiary">{it.hint}</span>}
                  </span>
                  {idx === i && <Kbd>↵</Kbd>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
