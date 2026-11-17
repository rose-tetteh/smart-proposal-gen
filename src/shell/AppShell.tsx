import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookIcon,
  ChevronDown,
  FileIcon,
  HomeIcon,
  LayersIcon,
  LogoutIcon,
  MoonIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SidebarIcon,
  SunIcon,
  UsersIcon,
} from '@/components/icons';
import { EngineBadge } from '@/components/EngineBadge';
import { Avatar, Kbd, STATUS_META } from '@/components/ui';
import { USERS } from '@/data/company';
import { useStore } from '@/lib/store';
import { useTheme, useToast } from '@/lib/ui-state';
import { CommandPalette } from './CommandPalette';

const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/proposals', label: 'Proposals', icon: FileIcon },
  { to: '/library', label: 'Experience library', icon: LayersIcon },
  { to: '/content', label: 'Content library', icon: BookIcon },
];

function UserMenu() {
  const { user, signIn, signOut, resetDemo } = useStore();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="relative">
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="pop-in absolute bottom-full left-0 right-0 z-40 mb-2 overflow-hidden rounded-record border border-rule-strong bg-paper-raised shadow-xl">
            <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Switch profile</p>
            {USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  signIn(u);
                  setOpen(false);
                  toast(`Signed in as ${u.name}`, 'info');
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-paper-inset ${u.id === user.id ? 'font-semibold text-ink' : 'text-ink-secondary'}`}
              >
                <Avatar initials={u.initials} size={22} tone={u.canApprove ? 'beacon' : 'rampart'} />
                <span className="truncate">{u.name}</span>
                {u.id === user.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-beacon" />}
              </button>
            ))}
            <div className="my-1 border-t border-rule" />
            <button onClick={toggle} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-secondary hover:bg-paper-inset hover:text-ink">
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />} {theme === 'dark' ? 'Light theme' : 'Dark theme'}
            </button>
            <button
              onClick={() => {
                resetDemo();
                setOpen(false);
                toast('Demo data restored', 'info');
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-secondary hover:bg-paper-inset hover:text-ink"
            >
              <RefreshIcon size={16} /> Reset demo data
            </button>
            <button onClick={signOut} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-secondary hover:bg-paper-inset hover:text-ink">
              <LogoutIcon size={16} /> Sign out
            </button>
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-record px-2 py-2 text-left transition-colors hover:bg-paper-sunk"
        aria-expanded={open}
      >
        <Avatar initials={user.initials} size={30} tone={user.canApprove ? 'beacon' : 'rampart'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-[11.5px] text-ink-tertiary">{user.title}</span>
        </span>
        <ChevronDown size={16} className="text-ink-muted" />
      </button>
    </div>
  );
}

function Sidebar({ onSearch, onNavigate, onCollapse, collapseLabel = 'Collapse sidebar' }: { onSearch: () => void; onNavigate?: () => void; onCollapse: () => void; collapseLabel?: string }) {
  const { proposals, user } = useStore();
  const nav = useNavigate();
  const mine = proposals
    .filter((p) => p.owner === user?.id && (p.status === 'draft' || p.status === 'review'))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 py-3 pl-4 pr-2">
        <Link to="/" className="brand-glow-hover" onClick={onNavigate}>
          <img src="/bastion-logo.png" alt="Bastion" className="logo-plate h-[26px] w-auto" />
        </Link>
        <button
          onClick={onCollapse}
          title={`${collapseLabel} (Ctrl \\)`}
          aria-label={collapseLabel}
          className="grid h-8 w-8 place-items-center rounded-control text-ink-tertiary transition-colors hover:bg-paper-sunk hover:text-ink"
        >
          <SidebarIcon size={18} />
        </button>
      </div>

      <div className="px-3">
        <button
          onClick={() => {
            nav('/new');
            onNavigate?.();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-control bg-beacon px-3 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-beacon-deep active:scale-[0.99]"
        >
          <PlusIcon size={17} /> New proposal
        </button>
        <button
          onClick={onSearch}
          className="mt-2 flex w-full items-center gap-2 rounded-control border border-rule bg-paper-raised px-3 py-2 text-[13px] text-ink-tertiary transition-colors hover:border-rule-strong hover:text-ink-secondary"
        >
          <SearchIcon size={16} />
          <span className="flex-1 text-left">Search or jump to…</span>
          <Kbd>Ctrl K</Kbd>
        </button>
      </div>

      <nav className="mt-4 px-3" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative mb-0.5 flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                isActive ? 'bg-paper-sunk text-ink before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-beacon' : 'text-ink-secondary hover:bg-paper-sunk/70 hover:text-ink'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="scroll-quiet mt-5 min-h-0 flex-1 overflow-y-auto px-3">
        <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">My open proposals</p>
        {mine.length === 0 && <p className="px-2.5 text-[12.5px] text-ink-muted">Nothing open. Start one above.</p>}
        {mine.map((p) => (
          <NavLink
            key={p.id}
            to={`/p/${p.id}`}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-control px-2.5 py-1.5 text-[13px] transition-colors ${isActive ? 'bg-paper-sunk text-ink' : 'text-ink-secondary hover:bg-paper-sunk/70 hover:text-ink'}`
            }
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_META[p.status].dot}`} />
            <span className="truncate">{p.title}</span>
          </NavLink>
        ))}
      </div>

      <div className="border-t border-rule p-2">
        <EngineBadge />
        <UserMenu />
      </div>
    </div>
  );
}

/** The collapsed sidebar: a slim icon rail. Used by default in the proposal editor so the document gets the room. */
function Rail({ onSearch, onExpand }: { onSearch: () => void; onExpand: () => void }) {
  const nav = useNavigate();
  const { user } = useStore();
  const { theme, toggle } = useTheme();
  const item = 'grid h-9 w-9 place-items-center rounded-control text-ink-tertiary transition-colors hover:bg-paper-sunk hover:text-ink';
  return (
    <div className="flex h-full flex-col items-center gap-1 py-3">
      <button onClick={onExpand} className={`${item} mb-1`} title="Expand sidebar (Ctrl \)" aria-label="Expand sidebar">
        <SidebarIcon size={18} />
      </button>
      <Link to="/" className="mb-2 grid h-9 w-9 place-items-center" title="Home" aria-label="Home">
        <img src="/bastion-mark.png" alt="" className="h-8 w-8" />
      </Link>
      <button onClick={() => nav('/new')} className="mb-1 grid h-9 w-9 place-items-center rounded-control border border-beacon/40 text-beacon hover:bg-beacon-wash" title="New proposal" aria-label="New proposal">
        <PlusIcon size={18} />
      </button>
      <button onClick={onSearch} className={item} title="Search (Ctrl K)" aria-label="Search">
        <SearchIcon size={18} />
      </button>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} title={label} aria-label={label} className={({ isActive }) => `${item} ${isActive ? 'bg-paper-sunk text-ink' : ''}`}>
          <Icon size={18} />
        </NavLink>
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        <EngineBadge variant="rail" />
        <button onClick={toggle} className={item} title="Toggle theme" aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
        {user && <Avatar initials={user.initials} size={30} tone={user.canApprove ? 'beacon' : 'rampart'} />}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  const { user } = useStore();
  const inEditor = loc.pathname.startsWith('/p/');
  // The reader's own choice wins. Until they make one, the editor starts collapsed (more room for the document).
  const [pref, setPref] = useState<'expanded' | 'collapsed' | null>(() => {
    try {
      const v = localStorage.getItem('bpg.sidebar');
      return v === 'expanded' || v === 'collapsed' ? v : null;
    } catch {
      return null;
    }
  });
  const collapsed = pref ? pref === 'collapsed' : inEditor;
  const setCollapsed = (c: boolean) => {
    const v = c ? 'collapsed' : 'expanded';
    setPref(v);
    try {
      localStorage.setItem('bpg.sidebar', v);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        if (window.matchMedia('(min-width: 1024px)').matches) document.getElementById('sidebar-toggle-proxy')?.click();
        else setMobileOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  return (
    <div className="flex h-dvh">
      {/* Hidden button the keyboard shortcut clicks, so it always uses the current state. */}
      <button id="sidebar-toggle-proxy" hidden onClick={() => setCollapsed(!collapsed)} />
      <aside
        className={`no-print hidden shrink-0 overflow-hidden border-r border-rule bg-sidebar transition-[width] duration-200 ease-[var(--ease-move)] lg:block ${collapsed ? 'w-[60px]' : 'w-[264px]'}`}
      >
        {collapsed ? (
          <Rail onSearch={() => setPaletteOpen(true)} onExpand={() => setCollapsed(false)} />
        ) : (
          <div className="h-full w-[264px]">
            <Sidebar onSearch={() => setPaletteOpen(true)} onCollapse={() => setCollapsed(true)} />
          </div>
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] border-r border-rule bg-sidebar shadow-2xl">
            <Sidebar onSearch={() => setPaletteOpen(true)} onNavigate={() => setMobileOpen(false)} onCollapse={() => setMobileOpen(false)} collapseLabel="Close menu" />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-12 shrink-0 items-center gap-3 border-b border-rule px-3 lg:hidden">
          <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="grid h-8 w-8 place-items-center rounded-control text-ink-secondary hover:bg-paper-sunk">
            <SidebarIcon />
          </button>
          <img src="/bastion-logo.png" alt="Bastion" className="logo-plate h-[20px]" />
          <span className="ml-auto">
            <EngineBadge variant="header" />
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-tertiary">
            <UsersIcon size={15} /> <span className="hidden sm:inline">{user?.name}</span>
          </span>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
