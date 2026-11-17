/** PDF export: print-ready, Bastion-branded, US Letter. Built with jsPDF so it downloads directly. */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseMarkdown, splitInline, type InlineTok } from '@/lib/markdown';
import type { Proposal } from '@/lib/types';
import { coverMeta, fileName, loadLogoDataUrl } from './shared';

const RAMPART: [number, number, number] = [14, 74, 82];
const BEACON: [number, number, number] = [194, 65, 12];
const INK: [number, number, number] = [29, 34, 48];
const GREY: [number, number, number] = [107, 114, 128];

const PAGE_W = 612;
const PAGE_H = 792;
const M = 64;
const TOP = 72;
const BOTTOM = PAGE_H - 70;

/** Standard PDF fonts only cover Latin-1, so normalise typographic characters. */
const clean = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/†/g, '*')
    .replace(/×/g, 'x')
    .replace(/[·•]/g, '-')
    .replace(/≈/g, '~')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

type Seg = { text: string; bold: boolean; ph: boolean };

function wrap(doc: jsPDF, toks: InlineTok[], maxW: number, size: number): Seg[][] {
  const lines: Seg[][] = [[]];
  let w = 0;
  for (const t of toks) {
    const bold = t.kind === 'bold';
    const ph = t.kind === 'placeholder';
    const text = clean(ph ? `[${t.text}]` : t.text);
    doc.setFont('helvetica', bold || ph ? 'bold' : 'normal').setFontSize(size);
    for (const word of text.split(/(\s+)/)) {
      if (!word) continue;
      const ww = doc.getTextWidth(word);
      if (w + ww > maxW && word.trim() && w > 0) {
        lines.push([]);
        w = 0;
      }
      if (w === 0 && !word.trim()) continue;
      lines[lines.length - 1].push({ text: word, bold, ph });
      w += ww;
    }
  }
  return lines;
}

class Writer {
  y = TOP;
  constructor(public doc: jsPDF) {}

  ensure(h: number) {
    if (this.y + h > BOTTOM) {
      this.doc.addPage();
      this.y = TOP;
    }
  }

  rich(text: string, opts: { x?: number; width?: number; size?: number; color?: [number, number, number]; gapAfter?: number } = {}) {
    const { x = M, width = PAGE_W - M * 2, size = 10.5, color = INK, gapAfter = 7 } = opts;
    const lh = size * 1.5;
    for (const line of wrap(this.doc, splitInline(text), width, size)) {
      this.ensure(lh);
      let cx = x;
      for (const s of line) {
        this.doc.setFont('helvetica', s.bold || s.ph ? 'bold' : 'normal').setFontSize(size);
        const w = this.doc.getTextWidth(s.text);
        if (s.ph) {
          this.doc.setFillColor(255, 241, 194);
          this.doc.rect(cx - 1, this.y - size + 1.5, w + 2, size + 3, 'F');
          this.doc.setTextColor(122, 75, 0);
        } else this.doc.setTextColor(...color);
        this.doc.text(s.text, cx, this.y);
        cx += w;
      }
      this.y += lh;
    }
    this.y += gapAfter;
  }

  markdown(md: string) {
    for (const b of parseMarkdown(md)) {
      if (b.type === 'h') {
        this.ensure(34);
        this.y += 6;
        this.doc.setFont('helvetica', 'bold').setFontSize(11.5).setTextColor(...RAMPART);
        this.doc.text(clean(b.text), M, this.y);
        this.y += 15;
      } else if (b.type === 'list') {
        for (const it of b.items) {
          this.ensure(16);
          this.doc.setFillColor(...BEACON);
          this.doc.rect(M + 2, this.y - 6.5, 4, 4, 'F');
          this.rich(it, { x: M + 14, width: PAGE_W - M * 2 - 14, gapAfter: 2 });
        }
        this.y += 5;
      } else if (b.type === 'table') {
        this.ensure(40);
        const strip = (s: string) => clean(s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[\[(.+?)\]\]/g, '[$1]'));
        autoTable(this.doc, {
          startY: this.y - 4,
          head: [b.head.map(strip)],
          body: b.rows.map((r) => b.head.map((_, i) => strip(r[i] ?? ''))),
          margin: { left: M, right: M, top: TOP, bottom: PAGE_H - BOTTOM },
          styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: INK, lineColor: [227, 229, 234], lineWidth: 0.5 },
          headStyles: { fillColor: RAMPART, textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [247, 248, 251] },
          theme: 'grid',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.y = (this.doc as any).lastAutoTable.finalY + 16;
      } else {
        b.lines.forEach((l, i) => this.rich(l, { gapAfter: i === b.lines.length - 1 ? 7 : 0 }));
      }
    }
  }
}

export async function exportPdf(p: Proposal) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const logo = await loadLogoDataUrl();
  const meta = coverMeta(p);

  // Cover
  doc.setFillColor(...BEACON);
  doc.rect(0, 0, PAGE_W, 10, 'F');
  doc.addImage(logo, 'PNG', M, 60, 156, 35);
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...BEACON);
  doc.text(clean(`PROPOSAL FOR ${p.client.toUpperCase()}`), M, 420, { charSpace: 1.2 });
  doc.setFontSize(28).setTextColor(...RAMPART);
  const titleLines = doc.splitTextToSize(clean(p.title), PAGE_W - M * 2);
  doc.text(titleLines, M, 456, { lineHeightFactor: 1.15 });
  let cy = 456 + titleLines.length * 32 + 10;
  doc.setFont('helvetica', 'normal').setFontSize(13).setTextColor(69, 75, 89);
  if (meta.where) {
    doc.text(clean(meta.where), M, cy);
    cy += 18;
  }
  doc.text(clean(meta.what), M, cy);
  doc.setDrawColor(227, 229, 234).setLineWidth(0.8);
  doc.line(M, 680, PAGE_W - M, 680);
  doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(154, 161, 174);
  doc.text('DATE', M, 700);
  doc.text('PREPARED BY', M + 170, 700);
  doc.text('BASTION', M + 360, 700);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK);
  doc.text(clean(meta.date), M, 716);
  doc.text(doc.splitTextToSize(clean(meta.preparedBy), 180), M + 170, 716);
  doc.text('Hold the Line', M + 360, 716);

  // Contents
  doc.addPage();
  const w = new Writer(doc);
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...RAMPART);
  doc.text('Contents', M, w.y);
  w.y += 30;
  p.sections.forEach((s, i) => {
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...BEACON);
    doc.text(String(i + 1).padStart(2, '0'), M, w.y);
    doc.setFont('helvetica', 'normal').setTextColor(...INK);
    doc.text(clean(s.title), M + 28, w.y);
    w.y += 20;
  });

  // Sections
  p.sections.forEach((s, i) => {
    if (i === 0) {
      doc.addPage();
      w.y = TOP;
    } else w.ensure(80);
    w.y += i === 0 ? 0 : 18;
    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...BEACON);
    const num = String(i + 1).padStart(2, '0');
    doc.text(num, M, w.y);
    doc.setTextColor(...RAMPART);
    doc.text(clean(s.title), M + 28, w.y);
    w.y += 8;
    doc.setDrawColor(...BEACON).setLineWidth(1.4);
    doc.line(M, w.y, PAGE_W - M, w.y);
    w.y += 20;
    w.markdown(s.body);
  });

  // Running header and footer (not on the cover)
  const n = doc.getNumberOfPages();
  for (let i = 2; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(154, 161, 174);
    doc.text(clean(`Bastion  -  Proposal for ${p.client}`), PAGE_W - M, 40, { align: 'right' });
    doc.setDrawColor(...BEACON).setLineWidth(0.8);
    doc.line(M, PAGE_H - 48, PAGE_W - M, PAGE_H - 48);
    doc.setTextColor(...GREY);
    doc.text('Bastion  -  Confidential', M, PAGE_H - 34);
    doc.text(`Page ${i - 1} of ${n - 1}`, PAGE_W - M, PAGE_H - 34, { align: 'right' });
  }

  doc.setProperties({ title: p.title, subject: `Proposal for ${p.client}`, creator: 'Bastion Proposal Generator' });
  doc.save(fileName(p, 'pdf'));
}
