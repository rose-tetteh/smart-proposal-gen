/** Read-only view for share links. Works without signing in; content lives in the URL fragment. */
import { useEffect, useState } from 'react';
import { PrintIcon } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { Button, Spinner } from '@/components/ui';
import { readShareHash, type SharedProposal } from '@/export/share';
import { fmtDate } from '@/lib/format';

export function ShareView() {
  const [data, setData] = useState<SharedProposal | null | 'loading'>('loading');
  useEffect(() => {
    readShareHash(window.location.hash).then(setData);
  }, []);

  if (data === 'loading')
    return (
      <div className="grid h-full place-items-center text-ink-tertiary">
        <Spinner size={22} />
      </div>
    );
  if (!data)
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <img src="/bastion-logo.png" alt="Bastion" className="logo-plate mx-auto h-8" />
          <p className="mt-4 text-[15px] font-semibold text-ink">This share link is incomplete or damaged.</p>
          <p className="mt-1 text-[13px] text-ink-tertiary">Ask the sender to copy the link again.</p>
        </div>
      </div>
    );

  return (
    <div className="scroll-quiet h-full overflow-y-auto bg-desk print:bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-[820px] items-center gap-3 px-4 py-2.5">
          <img src="/bastion-logo.png" alt="Bastion" className="logo-plate h-6" />
          <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink-tertiary">
            Read-only copy shared by <strong className="text-ink-secondary">{data.owner}</strong> on {fmtDate(data.sharedAt)}
          </p>
          <Button size="sm" variant="secondary" icon={<PrintIcon size={15} />} onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      </div>
      <article className="sheet doc mx-auto my-8 max-w-[820px] rounded-[4px] print:my-0">
        <div className="relative px-12 pb-12 pt-12">
          <div className="absolute inset-x-0 top-0 h-2 bg-[#c2410c]" />
          <img src="/bastion-logo.png" alt="Bastion" className="h-10" />
          <p className="mt-24 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-[#c2410c]">Proposal for {data.client}</p>
          <h1 className="mt-3 font-sans text-[34px] font-bold leading-[1.12] tracking-tight text-[#0e4a52]">{data.title}</h1>
          <p className="mt-4 text-[16px] text-[#454b59]">
            {[data.site, data.location].filter(Boolean).join(' · ')}
            <br />
            {data.workType} · {data.industry}
          </p>
          <p className="mt-10 font-sans text-[12px] text-[#6b7280]">
            Prepared by {data.owner}, {data.ownerTitle}
          </p>
        </div>
        {data.sections.map((s, i) => (
          <section key={i} className="border-t border-[#eceef2] px-12 py-9">
            <h2 className="flex items-baseline gap-3">
              <span className="font-sans text-[13px] font-bold text-[#c2410c]">{String(i + 1).padStart(2, '0')}</span>
              {s.title}
            </h2>
            <div className="mt-3">
              <Markdown source={s.body} />
            </div>
          </section>
        ))}
        <footer className="border-t-2 border-[#c2410c] px-12 py-5 font-sans text-[11px] text-[#9aa1ae]">Bastion · Confidential proposal for {data.client}</footer>
      </article>
    </div>
  );
}
