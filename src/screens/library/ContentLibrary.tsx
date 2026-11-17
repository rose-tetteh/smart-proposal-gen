/** Approved boilerplate: edit once here, and every new proposal uses the latest wording. */
import { useState } from 'react';
import { CheckIcon, CopyIcon, EditIcon } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { Button, Card } from '@/components/ui';
import { copyRich, mdToHtml } from '@/export/shared';
import { fmtDate, todayIso } from '@/lib/format';
import { toPlain } from '@/lib/markdown';
import { useStore } from '@/lib/store';
import type { ContentBlock } from '@/lib/types';
import { useToast } from '@/lib/ui-state';

const CATS: ContentBlock['category'][] = ['Company', 'Safety', 'Quality', 'Workforce', 'Technology', 'Commercial'];

function BlockCard({ b }: { b: ContentBlock }) {
  const { upsertBlock, user } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(b.body);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-ink">{b.title}</h3>
          {b.approved ? <span className="stamp text-ok">Approved</span> : <span className="stamp text-warn">Needs approval</span>}
        </div>
        <div className="flex items-center gap-1">
          {!editing && (
            <>
              <button
                aria-label="Copy"
                title="Copy"
                onClick={async () => {
                  await copyRich(mdToHtml(b.body), toPlain(b.body));
                  toast(`Copied “${b.title}”`, 'ok');
                }}
                className="grid h-8 w-8 place-items-center rounded-control text-ink-tertiary hover:bg-paper-sunk hover:text-ink"
              >
                <CopyIcon size={15} />
              </button>
              <Button size="sm" variant="ghost" icon={<EditIcon size={14} />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            </>
          )}
          {!b.approved && user?.canApprove && !editing && (
            <Button size="sm" variant="secondary" icon={<CheckIcon size={14} />} onClick={() => upsertBlock({ ...b, approved: true, updatedAt: todayIso() })}>
              Approve
            </Button>
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        {editing ? (
          <>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(16, text.split('\n').length + 3)} className="w-full rounded-control border border-rule-strong bg-paper-inset p-3 font-mono text-[12.5px] leading-relaxed text-ink focus:border-rampart focus:outline-none" aria-label={`${b.title} text`} />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setText(b.body); setEditing(false); }}>Cancel</Button>
              <Button
                size="sm"
                variant="rampart"
                onClick={() => {
                  upsertBlock({ ...b, body: text, updatedAt: todayIso(), approved: !!user?.canApprove });
                  setEditing(false);
                  toast(user?.canApprove ? 'Saved and approved' : 'Saved. An approver will review the change.', 'ok');
                }}
              >
                Save
              </Button>
            </div>
          </>
        ) : (
          <div className="doc rounded-record bg-white px-4 py-2 text-[14px] ring-1 ring-rule">

            <Markdown source={b.body} />
          </div>
        )}
        <p className="mt-2 text-[11.5px] text-ink-tertiary">Updated {fmtDate(b.updatedAt)}</p>
      </div>
    </Card>
  );
}

export function ContentLibrary() {
  const { blocks } = useStore();
  return (
    <div className="scroll-quiet h-full overflow-y-auto">
      <div className="mx-auto max-w-[920px] px-5 pb-16 pt-6 sm:px-8">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">Content library</h1>
        <p className="max-w-2xl text-[13.5px] text-ink-tertiary">
          Bastion’s approved wording for the parts of every proposal that rarely change. Bastion Assist always uses the latest approved version. All content describes a fictional demo company.
        </p>
        <div className="mt-6 space-y-8">
          {CATS.map((c) => {
            const items = blocks.filter((b) => b.category === c);
            if (!items.length) return null;
            return (
              <section key={c}>
                <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">{c}</h2>
                <div className="space-y-3">
                  {items.map((b) => (
                    <BlockCard key={b.id} b={b} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
