import { USERS } from '@/data/company';
import { fmtDate } from '@/lib/format';
import { parseMarkdown, splitInline } from '@/lib/markdown';
import type { Proposal } from '@/lib/types';

export const RAMPART = '0E4A52';
export const BEACON = 'C2410C';

export function fileName(p: Proposal, ext: string) {
  const base = p.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'Bastion_Proposal';
  return `Bastion_${base}.${ext}`;
}

export function coverMeta(p: Proposal) {
  const owner = USERS.find((u) => u.id === p.owner);
  return {
    date: fmtDate(p.dueDate) || fmtDate(new Date().toISOString()),
    preparedBy: owner ? `${owner.name}, ${owner.title}` : '',
    where: [p.site, p.location].filter(Boolean).join(' · '),
    what: `${p.workType} · ${p.industry}`,
  };
}

let logoCache: Promise<ArrayBuffer> | null = null;
export function loadLogo(): Promise<ArrayBuffer> {
  logoCache ??= fetch('/bastion-logo.png').then((r) => r.arrayBuffer());
  return logoCache;
}

export async function loadLogoDataUrl(): Promise<string> {
  const buf = await loadLogo();
  let bin = '';
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:image/png;base64,${btoa(bin)}`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inlineHtml(s: string) {
  return splitInline(s)
    .map((t) =>
      t.kind === 'bold' ? `<strong>${esc(t.text)}</strong>` : t.kind === 'placeholder' ? `<span style="background:#fff1c2">[${esc(t.text)}]</span>` : esc(t.text),
    )
    .join('');
}

/** Markdown subset → simple HTML (used for rich-text clipboard copies that paste nicely into Word/Outlook). */
export function mdToHtml(src: string) {
  return parseMarkdown(src)
    .map((b) => {
      if (b.type === 'h') return `<h3 style="color:#0E4A52;font-family:Arial">${inlineHtml(b.text)}</h3>`;
      if (b.type === 'list') return `<ul>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join('')}</ul>`;
      if (b.type === 'table')
        return `<table border="1" cellpadding="5" style="border-collapse:collapse;font-family:Arial;font-size:10pt"><tr>${b.head
          .map((h) => `<th style="background:#0E4A52;color:#fff;text-align:left">${inlineHtml(h)}</th>`)
          .join('')}</tr>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`).join('')}</table>`;
      return `<p>${b.lines.map(inlineHtml).join('<br>')}</p>`;
    })
    .join('\n');
}

export function proposalToHtml(p: Proposal) {
  return `<div style="font-family:Georgia,serif;font-size:11pt">${p.sections
    .map((s, i) => `<h2 style="color:#0E4A52;font-family:Arial">${String(i + 1).padStart(2, '0')} ${esc(s.title)}</h2>${mdToHtml(s.body)}`)
    .join('\n')}</div>`;
}

export function proposalToText(p: Proposal) {
  const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[\[(.+?)\]\]/g, '[$1]');
  return [`${p.title}\nProposal for ${p.client}\n`, ...p.sections.map((s, i) => `${String(i + 1).padStart(2, '0')} ${s.title.toUpperCase()}\n\n${plain(s.body)}`)].join('\n\n');
}

export async function copyRich(html: string, text: string) {
  try {
    if ('ClipboardItem' in window) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) }),
      ]);
      return true;
    }
  } catch {
    /* fall through to plain text */
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
