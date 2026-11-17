/** Fact check results in the Checklist tab: claims the facts don't back up, with one-click "mark to confirm". */
import type { FactCheckResult, FactIssue } from '@/ai/factcheck';
import { AlertIcon, CheckIcon, ShieldIcon } from '@/components/icons';
import { Spinner } from '@/components/ui';
import { SECTION_TITLES } from '@/data/company';
import { timeAgo } from '@/lib/format';

/** A claim can be wrapped in a placeholder only if it is found as-is and doesn't cross existing markup. */
export const canMarkClaim = (body: string, quote: string) => body.includes(quote) && !/\[\[|\]\]|\|/.test(quote);

export function FactCheckCard({
  result,
  stale,
  running,
  live,
  dismissed,
  bodyFor,
  onRun,
  onJump,
  onMark,
  onDismiss,
}: {
  result: FactCheckResult | null;
  stale: boolean;
  running: boolean;
  /** Whether the live engine will do the check (otherwise the offline number check). */
  live: boolean;
  dismissed: string[];
  bodyFor: (key: FactIssue['sectionKey']) => string | undefined;
  onRun: () => void;
  onJump: (key: FactIssue['sectionKey']) => void;
  onMark: (issue: FactIssue) => void;
  onDismiss: (issue: FactIssue) => void;
}) {
  const open = result ? result.issues.filter((i) => !dismissed.includes(i.id)) : [];

  return (
    <section id="fact-check" className="rounded-panel border border-rule bg-paper-inset p-3">
      <div className="flex items-start gap-2.5">
        <ShieldIcon size={18} className="mt-0.5 shrink-0 text-rampart" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">Fact check</p>
          <p className="text-[12px] leading-snug text-ink-tertiary">
            {running
              ? live
                ? 'A second AI model is reading the draft against Bastion’s facts and the RFP…'
                : 'Checking every figure against Bastion’s facts and the RFP…'
              : result
                ? `${result.live ? `Checked by ${result.checkedBy}` : 'Offline number check'} · ${timeAgo(result.at)}`
                : live
                  ? 'A second AI model flags any claim Bastion’s facts and the RFP don’t back up.'
                  : 'Flags any figure that doesn’t appear in Bastion’s facts or the RFP. Connect AmaliAI for a full claim check.'}
          </p>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="flex shrink-0 items-center gap-1.5 rounded-control bg-rampart px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-rampart-deep disabled:opacity-50 [:root[data-theme=dark]_&]:text-[#0e1116]"
        >
          {running && <Spinner size={12} />}
          {result ? 'Re-run' : 'Run'}
        </button>
      </div>

      {result && !running && stale && <p className="mt-2 rounded-control bg-warn-wash px-2 py-1.5 text-[12px] text-warn">The draft has changed since this check. Re-run it before you export.</p>}

      {result && !running && open.length === 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-ok">
          <CheckIcon size={14} strokeWidth={2.5} /> {result.issues.length ? 'All flagged claims handled.' : 'Every claim checked is backed by Bastion’s facts.'}
        </p>
      )}

      {open.length > 0 && !running && (
        <ul className="mt-2.5 space-y-2">
          {open.map((issue) => {
            const body = bodyFor(issue.sectionKey);
            const markable = body !== undefined && canMarkClaim(body, issue.quote);
            return (
              <li key={issue.id} className="rounded-record border border-rule bg-paper-raised p-2.5">
                <button onClick={() => onJump(issue.sectionKey)} className="block w-full text-left">
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-tertiary">
                    <AlertIcon size={12} className={issue.kind === 'contradicted' ? 'text-bad' : 'text-warn'} />
                    {issue.kind === 'contradicted' ? 'Contradicts the facts' : 'Not backed up'} · {SECTION_TITLES[issue.sectionKey]}
                  </span>
                  <span className="mt-1 block text-[12.5px] font-medium leading-snug text-ink">“{issue.quote.replace(/\*\*/g, '')}”</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-ink-tertiary">{issue.problem}</span>
                </button>
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => onMark(issue)}
                    disabled={!markable}
                    title={markable ? 'Highlight it for the writer to confirm before sending' : 'Couldn’t find this exact text. Open the section to fix it by hand.'}
                    className="rounded-control border border-rule-strong px-2 py-0.5 text-[12px] font-semibold text-ink-secondary hover:text-ink disabled:opacity-40"
                  >
                    Mark to confirm
                  </button>
                  <button onClick={() => onDismiss(issue)} className="rounded-control px-2 py-0.5 text-[12px] font-semibold text-ink-tertiary hover:bg-paper-sunk hover:text-ink">
                    It’s correct
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
