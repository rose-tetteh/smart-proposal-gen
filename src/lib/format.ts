export function fmtDate(iso: string | undefined, opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', opts);
}

export const fmtShort = (iso: string | undefined) => fmtDate(iso, { month: 'short', day: 'numeric' });

export function fmtNum(n: number) {
  return n.toLocaleString('en-US');
}

export function fmtMoney(n: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

export function daysUntil(iso: string | undefined) {
  if (!iso) return undefined;
  const d = new Date(`${iso}T23:59:00`);
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function addWeeks(iso: string, weeks: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d.toISOString().slice(0, 10);
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso, { month: 'short', day: 'numeric' });
}

export function listJoin(items: string[]) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function wordCount(s: string) {
  return (s.match(/[A-Za-z0-9’']+/g) ?? []).length;
}
