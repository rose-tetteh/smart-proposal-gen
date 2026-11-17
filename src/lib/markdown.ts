/** Parser for the generator's Markdown subset. Shared by the preview and the exporters. */

export type MdBlock =
  | { type: 'p'; lines: string[] }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] };

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

export function parseMarkdown(src: string): MdBlock[] {
  const lines = src.replace(/\r/g, '').split('\n');
  const out: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    if (l.startsWith('### ') || l.startsWith('## ')) {
      out.push({ type: 'h', text: l.replace(/^#+\s*/, '') });
      i++;
      continue;
    }
    if (/^\s*[-*•]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ''));
      out.push({ type: 'list', items });
      continue;
    }
    if (l.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const r = cells(lines[i++]);
        if (r.every((c) => /^:?-{2,}:?$/.test(c))) continue;
        rows.push(r);
      }
      if (rows.length) out.push({ type: 'table', head: rows[0], rows: rows.slice(1) });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(###? |\s*[-*•]\s+|\s*\|)/.test(lines[i])) para.push(lines[i++]);
    out.push({ type: 'p', lines: para });
  }
  return out;
}

export type InlineTok = { kind: 'text' | 'bold' | 'placeholder'; text: string };

export function splitInline(s: string): InlineTok[] {
  const out: InlineTok[] = [];
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ kind: 'text', text: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'bold', text: m[1] });
    else out.push({ kind: 'placeholder', text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ kind: 'text', text: s.slice(last) });
  return out;
}

/** Plain text (for clipboard / word counts). */
export function toPlain(src: string) {
  return src.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[\[(.+?)\]\]/g, '[$1]');
}
