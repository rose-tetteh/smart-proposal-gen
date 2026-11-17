/** The "Bastion Assist is writing" moment: sections are drafted one by one while the user watches. */
import { useEffect, useRef, useState } from 'react';
import { ai } from '@/ai/provider';
import { EngineChip } from '@/components/EngineBadge';
import { CheckIcon, SparkIcon } from '@/components/icons';
import { Button, Spinner } from '@/components/ui';
import { SECTION_TITLES, statById, templateById } from '@/data/company';
import { uid } from '@/lib/format';
import { toPlain } from '@/lib/markdown';
import { useStore } from '@/lib/store';
import type { ProposalDraft, Section } from '@/lib/types';
import { useToast } from '@/lib/ui-state';

export function Generating({ draft, onDone, onCancel }: { draft: ProposalDraft; onDone: (id: string) => void; onCancel: () => void }) {
  const { user, projects, blocks, createProposal } = useStore();
  const toast = useToast();
  const keys = templateById(draft.template).sections;
  const [done, setDone] = useState<Section[]>([]);
  const [typing, setTyping] = useState('');
  const cancelled = useRef(false);
  // Kept across StrictMode's double-mount, so each section is requested (and billed) once.
  const pending = useRef<Promise<string>[] | null>(null);

  useEffect(() => {
    // One token per effect run, so React StrictMode's double-mount can't start two writers.
    const run = { alive: true };
    const stop = () => !run.alive || cancelled.current;
    const ctx = {
      author: user!,
      projects: draft.selectedProjectIds.map((id) => projects.find((p) => p.id === id)).filter((p) => p !== undefined),
      stats: draft.selectedStatIds.map(statById).filter((s) => s !== undefined),
      blocks,
    };
    (async () => {
      const out: Section[] = [];
      // Start every section at once (the live engine caps how many run in parallel), then reveal them in order.
      const bodies = (pending.current ??= keys.map((key) => ai.draft(key, draft, ctx)));
      for (const [i, key] of keys.entries()) {
        const body = await bodies[i];
        if (stop()) return;
        // Type out the opening of each section, so progress feels alive.
        const plain = toPlain(body).replace(/\|/g, ' ').replace(/\s+/g, ' ').slice(0, 260);
        for (let i = 0; i <= plain.length; i += 9) {
          if (stop()) return;
          setTyping(plain.slice(0, i));
          await new Promise((r) => setTimeout(r, 12));
        }
        out.push({ id: uid('s'), key, title: SECTION_TITLES[key], body, generatedAt: new Date().toISOString() });
        setDone([...out]);
      }
      if (stop()) return;
      const p = createProposal(draft, out);
      toast('Draft ready. Review the highlighted items, then send for review.', 'ok');
      setTimeout(() => onDone(p.id), 450);
    })();
    return () => {
      run.alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = keys[done.length];
  const pct = Math.round((done.length / keys.length) * 100);

  return (
    <div className="scroll-quiet h-full overflow-y-auto bg-desk">
      <div className="mx-auto grid max-w-[1100px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[320px_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-paper-raised px-3 py-1 text-[12px] font-semibold text-beacon ring-1 ring-rule">
            <SparkIcon size={14} /> Bastion Assist is writing
          </span>
          <EngineChip className="ml-2" />
          <h1 className="mt-3 text-[24px] font-semibold leading-tight tracking-tight text-ink">{draft.title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-secondary">
            {keys.length} sections for {draft.client}, drawing on {draft.selectedProjectIds.length} past projects and {draft.selectedStatIds.length} live stats.
          </p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
            <div className="h-full rounded-full bg-beacon transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <ol className="mt-5 space-y-1">
            {keys.map((k, i) => {
              const isDone = i < done.length;
              const isCur = i === done.length;
              return (
                <li key={k} className={`flex items-center gap-2.5 rounded-control px-2 py-1.5 text-[13.5px] ${isCur ? 'bg-paper-raised font-semibold text-ink ring-1 ring-rule' : isDone ? 'text-ink-secondary' : 'text-ink-muted'}`}>
                  <span className="grid h-5 w-5 place-items-center">
                    {isDone ? <CheckIcon size={16} className="text-ok" strokeWidth={2.5} /> : isCur ? <Spinner size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-ink-muted/50" />}
                  </span>
                  {SECTION_TITLES[k]}
                </li>
              );
            })}
          </ol>
          <Button
            variant="ghost"
            className="mt-5"
            onClick={() => {
              cancelled.current = true;
              onCancel();
            }}
          >
            Cancel
          </Button>
        </div>

        <div className="sheet doc min-h-[560px] rounded-[4px] px-10 py-10">
          <div className="flex items-center justify-between border-b-2 border-[#c2410c] pb-3">
            <img src="/bastion-logo.png" alt="" className="h-6" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6b7280]">Proposal · Draft</span>
          </div>
          {done.slice(-2).map((s) => (
            <div key={s.id} className="mt-6 opacity-50">
              <h2>{s.title}</h2>
              <p className="line-clamp-3">{toPlain(s.body).replace(/\|/g, ' ')}</p>
            </div>
          ))}
          {current && (
            <div className="mt-6">
              <h2>{SECTION_TITLES[current]}</h2>
              <p className="caret">{typing}</p>
              <div className="mt-3 space-y-2">
                <div className="shimmer h-3 w-[92%] rounded" />
                <div className="shimmer h-3 w-[84%] rounded" />
                <div className="shimmer h-3 w-[70%] rounded" />
              </div>
            </div>
          )}
          {!current && (
            <div className="mt-16 text-center font-sans">
              <CheckIcon size={36} className="mx-auto text-[#1c6b3f]" strokeWidth={2.4} />
              <p className="mt-2 text-[15px] font-semibold text-[#14171f]">Draft complete. Opening the editor…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
