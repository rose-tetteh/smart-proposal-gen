import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { ProposalStatus } from '@/lib/types';
import { XIcon } from './icons';

// ─── Button ───────────────────────────────────────────────────────────────

type Variant = 'primary' | 'rampart' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-beacon text-white hover:bg-beacon-deep border border-transparent',
  rampart: 'bg-rampart text-white hover:bg-rampart-deep border border-transparent [:root[data-theme=dark]_&]:text-[#0e1116]',
  secondary: 'bg-paper-raised text-ink border border-rule-strong hover:bg-paper-inset',
  ghost: 'text-ink-secondary hover:bg-paper-sunk hover:text-ink border border-transparent',
  danger: 'text-bad border border-transparent hover:bg-bad-wash',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode }) {
  const sz = size === 'sm' ? 'h-8 px-2.5 text-[13px] gap-1.5' : size === 'lg' ? 'h-11 px-5 text-[15px] gap-2' : 'h-9 px-3.5 text-[13.5px] gap-2';
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center rounded-control font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${sz} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-tertiary transition-colors hover:bg-paper-sunk hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Status stamp ─────────────────────────────────────────────────────────

export const STATUS_META: Record<ProposalStatus, { label: string; cls: string; dot: string }> = {
  draft: { label: 'Draft', cls: 'text-muted bg-muted-wash', dot: 'bg-ink-muted' },
  review: { label: 'In review', cls: 'text-warn bg-warn-wash', dot: 'bg-amber' },
  submitted: { label: 'Submitted', cls: 'text-info bg-info-wash', dot: 'bg-rampart' },
  won: { label: 'Won', cls: 'text-ok bg-ok-wash', dot: 'bg-ok' },
  lost: { label: 'Lost', cls: 'text-bad bg-bad-wash', dot: 'bg-bad' },
};

export function StatusStamp({ status }: { status: ProposalStatus }) {
  const m = STATUS_META[status];
  return <span className={`stamp ${m.cls}`}>{m.label}</span>;
}

export function SourceTag({ source }: { source: 'public' | 'sample' }) {
  return source === 'public' ? (
    <span className="stamp text-ok" title="A confirmed company figure. All data in this demo is fictional.">Verified</span>
  ) : (
    <span className="stamp text-warn" title="Illustrative demo data: confirm before client use">Sample</span>
  );
}

// ─── Form bits ────────────────────────────────────────────────────────────

export function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px] font-semibold text-ink-secondary">
        {label}
        {hint && <span className="text-[11.5px] font-normal text-ink-tertiary">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-control border border-rule-strong bg-paper-raised px-3 py-2 text-[14px] text-ink placeholder:text-ink-muted transition-colors focus:border-rampart focus:outline-none focus:ring-2 focus:ring-rampart/15';

export function Chip({
  active,
  children,
  onClick,
  icon,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
        active
          ? 'border-rampart bg-rampart text-white [:root[data-theme=dark]_&]:text-[#0e1116]'
          : 'border-rule-strong bg-paper-raised text-ink-secondary hover:border-ink-muted hover:text-ink'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Progress ring ────────────────────────────────────────────────────────

export function ProgressRing({ value, size = 56, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 80 ? 'var(--color-ok)' : value >= 55 ? 'var(--color-amber)' : 'var(--color-beacon)';
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-rule)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: 'stroke-dashoffset 700ms var(--ease-enter), stroke 300ms' }}
        />
      </svg>
      <span className="tabular absolute text-[13px] font-bold text-ink" style={{ fontSize: size * 0.27 }}>
        {value}
      </span>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────

export function Sparkline({ data, width = 88, height = 26, color = 'var(--color-rampart)' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((d, i) => [(i / (data.length - 1)) * width, height - 2 - ((d - min) / (max - min || 1)) * (height - 4)]);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height, maxWidth: width * 1.6 }} aria-hidden="true">
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={color} opacity={0.08} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────

export function Avatar({ initials, size = 28, tone = 'rampart' }: { initials: string; size?: number; tone?: 'rampart' | 'beacon' }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ${tone === 'rampart' ? 'bg-rampart [:root[data-theme=dark]_&]:text-[#0e1116]' : 'bg-beacon'}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input,textarea,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 grid place-items-center bg-[#0b0e14]/45 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={`pop-in flex max-h-[88dvh] w-full ${width} flex-col overflow-hidden rounded-panel border border-rule-strong bg-paper-raised shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <h2 className="text-h4 font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <XIcon />
          </IconButton>
        </div>
        <div className="scroll-quiet overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-rule bg-paper-inset px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Misc ─────────────────────────────────────────────────────────────────

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-rule-strong bg-paper-inset px-1.5 py-px font-mono text-[10.5px] font-medium text-ink-tertiary">
      {children}
    </kbd>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-panel border border-rule bg-paper-raised ${className}`}>{children}</div>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">{children}</h2>
      {right}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
