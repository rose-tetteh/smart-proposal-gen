/** Word export: a branded, fully editable .docx built from the same Markdown the editor shows. */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { parseMarkdown, splitInline } from '@/lib/markdown';
import type { Proposal } from '@/lib/types';
import { coverMeta, BEACON, fileName, loadLogo, RAMPART } from './shared';

const FONT = 'Calibri';

function runs(text: string, opts: { color?: string; bold?: boolean; size?: number } = {}) {
  return splitInline(text).map(
    (t) =>
      new TextRun({
        text: t.kind === 'placeholder' ? `[${t.text}]` : t.text,
        bold: opts.bold || t.kind === 'bold',
        highlight: t.kind === 'placeholder' ? 'yellow' : undefined,
        color: opts.color,
        size: opts.size,
        font: FONT,
      }),
  );
}

function tableFrom(head: string[], rows: string[][]) {
  const thin = { style: BorderStyle.SINGLE, size: 4, color: 'E3E5EA' };
  const cell = (text: string, header: boolean, zebra: boolean) =>
    new TableCell({
      children: [new Paragraph({ children: runs(text, { color: header ? 'FFFFFF' : '1D2230', bold: header, size: 18 }) })],
      shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: RAMPART } : zebra ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F7F8FB' } : undefined,
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      borders: { top: thin, bottom: thin, left: thin, right: thin },
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h) => cell(h, true, false)) }),
      ...rows.map((r, i) => new TableRow({ children: head.map((_, j) => cell(r[j] ?? '', false, i % 2 === 1)) })),
    ],
  });
}

function body(md: string) {
  const out: (Paragraph | Table)[] = [];
  for (const b of parseMarkdown(md)) {
    if (b.type === 'h')
      out.push(new Paragraph({ children: runs(b.text, { color: RAMPART, bold: true, size: 24 }), spacing: { before: 240, after: 80 } }));
    else if (b.type === 'list') b.items.forEach((i) => out.push(new Paragraph({ children: runs(i), bullet: { level: 0 }, spacing: { after: 60 } })));
    else if (b.type === 'table') {
      out.push(tableFrom(b.head, b.rows));
      out.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    } else
      out.push(
        new Paragraph({
          children: b.lines.flatMap((l, i) => (i ? [new TextRun({ break: 1 }), ...runs(l)] : runs(l))),
          spacing: { after: 140, line: 300 },
        }),
      );
  }
  return out;
}

export async function exportDocx(p: Proposal) {
  const logo = await loadLogo();
  const meta = coverMeta(p);

  const cover = [
    new Paragraph({ children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 170, height: 38 } })], spacing: { after: 3200 } }),
    new Paragraph({ children: [new TextRun({ text: `PROPOSAL FOR ${p.client.toUpperCase()}`, bold: true, color: BEACON, size: 22, font: FONT, characterSpacing: 40 })] }),
    new Paragraph({ children: [new TextRun({ text: p.title, bold: true, color: RAMPART, size: 56, font: FONT })], spacing: { before: 160, after: 240 } }),
    new Paragraph({ children: [new TextRun({ text: meta.where, color: '454B59', size: 26, font: FONT })] }),
    new Paragraph({ children: [new TextRun({ text: meta.what, color: '454B59', size: 26, font: FONT })], spacing: { after: 2400 } }),
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'E3E5EA', space: 8 } },
      children: [
        new TextRun({ text: 'Date: ', bold: true, color: '6B7280', size: 18, font: FONT }),
        new TextRun({ text: meta.date, size: 18, font: FONT }),
        new TextRun({ text: '     Prepared by: ', bold: true, color: '6B7280', size: 18, font: FONT }),
        new TextRun({ text: meta.preparedBy, size: 18, font: FONT }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: 'Bastion · Hold the Line · bastion.example', color: '6B7280', size: 18, font: FONT })] }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Contents', color: RAMPART, bold: true, size: 32, font: FONT })], spacing: { after: 200 } }),
    ...p.sections.map(
      (s, i) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${String(i + 1).padStart(2, '0')}   `, bold: true, color: BEACON, font: FONT }),
            new TextRun({ text: s.title, font: FONT }),
          ],
          spacing: { after: 100 },
        }),
    ),
  ];

  const sections = p.sections.flatMap((s, i) => [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: i === 0,
      keepNext: true,
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BEACON, space: 4 } },
      spacing: { before: 480, after: 200 },
      children: [
        new TextRun({ text: `${String(i + 1).padStart(2, '0')}  `, bold: true, color: BEACON, size: 30, font: FONT }),
        new TextRun({ text: s.title, bold: true, color: RAMPART, size: 30, font: FONT }),
      ],
    }),
    ...body(s.body),
  ]);

  const doc = new Document({
    creator: 'Bastion Proposal Generator',
    title: p.title,
    description: `Proposal for ${p.client}`,
    styles: { default: { document: { run: { font: FONT, size: 22, color: '1D2230' } } } },
    sections: [
      {
        properties: {
          titlePage: true,
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, bottom: 1300, left: 1300, right: 1300 } },
        },
        headers: {
          first: new Header({ children: [] }),
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `Bastion  ·  Proposal for ${p.client}`, color: '9AA1AE', size: 16, font: FONT })],
              }),
            ],
          }),
        },
        footers: {
          first: new Footer({ children: [] }),
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: BEACON, space: 6 } },
                children: [
                  new TextRun({ text: 'Bastion · Confidential  ·  Page ', color: '9AA1AE', size: 16, font: FONT }),
                  new TextRun({ children: [PageNumber.CURRENT], color: '9AA1AE', size: 16, font: FONT }),
                  new TextRun({ text: ' of ', color: '9AA1AE', size: 16, font: FONT }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: '9AA1AE', size: 16, font: FONT }),
                ],
              }),
            ],
          }),
        },
        children: [...cover, ...sections],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName(p, 'docx'));
}
