/**
 * Renders the small Markdown subset the generator writes. Kept in-house so the
 * on-screen preview, Word and PDF exports all parse the same thing the same way
 * (see lib/markdown.ts).
 */
import { Fragment, type ReactNode } from 'react';
import { parseMarkdown, splitInline } from '@/lib/markdown';

function Inline({ text, placeholders }: { text: string; placeholders: boolean }) {
  return (
    <>
      {splitInline(text).map((tok, i) => {
        if (tok.kind === 'bold') return <strong key={i}>{tok.text}</strong>;
        if (tok.kind === 'placeholder')
          return placeholders ? (
            <mark
              key={i}
              title="Needs your input before sending"
              className="rounded-[3px] bg-[#fff1c2] px-1 py-px font-sans text-[0.86em] font-semibold text-[#7a4b00] ring-1 ring-[#f0c552]"
            >
              {tok.text}
            </mark>
          ) : (
            <span key={i}>[{tok.text}]</span>
          );
        return <Fragment key={i}>{tok.text}</Fragment>;
      })}
    </>
  );
}

export function Markdown({ source, placeholders = true }: { source: string; placeholders?: boolean }) {
  const blocks = parseMarkdown(source);
  const out: ReactNode[] = blocks.map((b, i) => {
    switch (b.type) {
      case 'h':
        return (
          <h3 key={i}>
            <Inline text={b.text} placeholders={placeholders} />
          </h3>
        );
      case 'list':
        return (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>
                <Inline text={it} placeholders={placeholders} />
              </li>
            ))}
          </ul>
        );
      case 'table':
        return (
          <table key={i}>
            <thead>
              <tr>
                {b.head.map((h, j) => (
                  <th key={j}>
                    <Inline text={h} placeholders={placeholders} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>
                  {r.map((c, k) => (
                    <td key={k}>
                      <Inline text={c} placeholders={placeholders} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return (
          <p key={i}>
            {b.lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline text={l} placeholders={placeholders} />
              </Fragment>
            ))}
          </p>
        );
    }
  });
  return <>{out}</>;
}
