/**
 * Proposal workspace: outline on the left, the document in the middle,
 * Bastion Assist and the readiness checklist on the right.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEngine } from '@/ai/engine';
import { CONFIRM_PREFIX, draftSignature, type FactCheckResult, type FactIssue } from '@/ai/factcheck';
import { ai, type DraftContext } from '@/ai/provider';
import { assessReadiness } from '@/ai/quality';
import { REWRITE_OPS, type RewriteOp } from '@/ai/rewrite';
import {
  ChevronDown,
  ChevronLeft,
  CopyIcon,
  DotsIcon,
  DownloadIcon,
  EditIcon,
  FileIcon,
  LinkIcon,
  PrintIcon,
  SettingsIcon,
  SparkIcon,
  TrashIcon,
} from '@/components/icons';
import { Button, Modal, ProgressRing, Spinner, STATUS_META, StatusStamp } from '@/components/ui';
import { SECTION_TITLES, statById } from '@/data/company';
import { copyRich, mdToHtml, proposalToHtml, proposalToText } from '@/export/shared';
import { makeShareUrl } from '@/export/share';
import { daysUntil, fmtShort, timeAgo, uid } from '@/lib/format';
import { toPlain } from '@/lib/markdown';
import { useStore } from '@/lib/store';
import type { Proposal, ProposalStatus, SectionKey } from '@/lib/types';
import { useToast } from '@/lib/ui-state';
import { ChecklistPanel, fillPlaceholder, type PlaceholderRef } from './ChecklistPanel';
import { AssistPanel, type ChatMsg } from './AssistPanel';
import { DetailsDrawer } from './DetailsDrawer';
import { DocumentView } from './DocumentView';
import { canMarkClaim, FactCheckCard } from './FactCheckCard';
import { Outline } from './Outline';

type Undo = { label: string; sections: Proposal['sections'] };
type ExportKind = 'docx' | 'pdf' | 'copy' | 'share' | 'print';
/** A fact check and the draft it checked; `sig` tells whether the draft has changed since. */
type FactState = { result: FactCheckResult; sig: string; dismissed: string[] };

export function Editor() {
  const { id } = useParams();
  const { getProposal, updateProposal, deleteProposal, duplicateProposal, user, projects, blocks } = useStore();
  const p = getProposal(id!);
  const nav = useNavigate();
  const toast = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'assist' | 'checklist'>('assist');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<'export' | 'more' | 'status' | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [fact, setFact] = useState<FactState | null>(null);
  const [checking, setChecking] = useState(false);
  const [gate, setGate] = useState<ExportKind | null>(null);
  const engine = useEngine();
  const undoStack = useRef<Undo[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const readiness = useMemo(() => (p ? assessReadiness(p) : null), [p]);
  const ctx: DraftContext | null = useMemo(
    () =>
      p && user
        ? {
            author: user,
            projects: p.selectedProjectIds.map((x) => projects.find((pp) => pp.id === x)).filter((x) => x !== undefined),
            stats: p.selectedStatIds.map(statById).filter((x) => x !== undefined),
            blocks,
          }
        : null,
    [p, user, projects, blocks],
  );

  // Greeting from Bastion Assist when a proposal opens.
  useEffect(() => {
    if (!p) return;
    const r = assessReadiness(p);
    const open = r.checks.filter((c) => !c.ok).length;
    setChat([
      {
        id: 1,
        role: 'ai',
        text: `This draft is at **${r.score}/100** readiness${open ? ` with ${open} item${open > 1 ? 's' : ''} to finish` : ''}. ${r.placeholders ? `There are **${r.placeholders} highlighted facts** for you to confirm. Open **Checklist** to fill them in quickly.` : 'All facts are confirmed.'}\n\nTell me what to change, or pick one:`,
        suggestions: ["What's missing?", 'Make the executive summary more persuasive', 'Add a proof point to safety', 'Shorten the cover letter'],
      },
    ]);
    setActiveId(p.sections[0]?.id ?? null);
    undoStack.current = [];
    setFact(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pushUndo = useCallback(
    (label: string) => {
      if (!p) return;
      undoStack.current = [{ label, sections: p.sections }, ...undoStack.current].slice(0, 25);
    },
    [p],
  );

  const undo = useCallback(() => {
    const last = undoStack.current.shift();
    if (!last || !p) return;
    updateProposal(p.id, { sections: last.sections }, `Undid: ${last.label}`);
    toast(`Undone: ${last.label}`, 'info');
  }, [p, updateProposal, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && tag !== 'TEXTAREA' && tag !== 'INPUT') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  if (!p || !readiness || !ctx) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <p className="text-[15px] font-semibold text-ink">This proposal could not be found.</p>
          <Link to="/proposals" className="mt-2 inline-block text-[13px] font-semibold text-rampart hover:underline">
            Back to proposals
          </Link>
        </div>
      </div>
    );
  }

  const setBody = (sid: string, body: string, label?: string) => {
    if (label) pushUndo(label);
    updateProposal(p.id, (cur) => ({ sections: cur.sections.map((s) => (s.id === sid ? { ...s, body, edited: true } : s)) }), label);
  };

  const jump = (sid: string) => {
    setActiveId(sid);
    document.getElementById(`sec-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const rewrite = async (sid: string, op: RewriteOp) => {
    const s = p.sections.find((x) => x.id === sid)!;
    setBusyId(sid);
    const body = await ai.rewrite(s.body, op, s.key, p, ctx.projects);
    setBusyId(null);
    const label = `${REWRITE_OPS.find((o) => o.id === op)!.label}: ${s.title}`;
    setBody(sid, body, label);
    toast(label, 'ok', { label: 'Undo', run: undo });
  };

  const regenerate = async (sid: string) => {
    const s = p.sections.find((x) => x.id === sid)!;
    setBusyId(sid);
    const body = await ai.draft(s.key, p, ctx);
    setBusyId(null);
    pushUndo(`Regenerate ${s.title}`);
    updateProposal(p.id, (cur) => ({ sections: cur.sections.map((x) => (x.id === sid ? { ...x, body, edited: false, generatedAt: new Date().toISOString() } : x)) }), `Regenerated ${s.title}`);
    toast(`Regenerated ${s.title}`, 'ok', { label: 'Undo', run: undo });
  };

  const copySection = async (sid: string) => {
    const s = p.sections.find((x) => x.id === sid)!;
    const ok = await copyRich(`<h2>${s.title}</h2>${mdToHtml(s.body)}`, `${s.title}\n\n${toPlain(s.body)}`);
    toast(ok ? `Copied “${s.title}”` : 'Copy failed: your browser blocked clipboard access', ok ? 'ok' : 'warn');
  };

  const move = (sid: string, dir: -1 | 1) => {
    const i = p.sections.findIndex((s) => s.id === sid);
    const j = i + dir;
    if (j < 0 || j >= p.sections.length) return;
    pushUndo('Reorder sections');
    const next = [...p.sections];
    [next[i], next[j]] = [next[j], next[i]];
    updateProposal(p.id, { sections: next });
  };

  const remove = (sid: string) => {
    const s = p.sections.find((x) => x.id === sid)!;
    pushUndo(`Remove ${s.title}`);
    updateProposal(p.id, { sections: p.sections.filter((x) => x.id !== sid) }, `Removed section ${s.title}`);
    toast(`Removed “${s.title}”`, 'info', { label: 'Undo', run: undo });
  };

  const add = async (key: SectionKey) => {
    const body = await ai.draft(key, p, ctx);
    const sec = { id: uid('s'), key, title: SECTION_TITLES[key], body, generatedAt: new Date().toISOString() };
    pushUndo(`Add ${sec.title}`);
    updateProposal(p.id, (cur) => ({ sections: [...cur.sections, sec] }), `Added section ${sec.title}`);
    setTimeout(() => jump(sec.id), 80);
  };

  const sendChat = async (text: string) => {
    const focus = p.sections.find((s) => s.id === activeId)?.key;
    setChat((c) => [...c, { id: Date.now(), role: 'user', text }]);
    setThinking(true);
    const reply = await ai.assist(text, p, focus, ctx);
    setThinking(false);
    setChat((c) => [...c, { id: Date.now() + 1, role: 'ai', text: reply.text, edit: reply.edit, suggestions: reply.suggestions }]);
    if (reply.edit) {
      const s = p.sections.find((x) => x.key === reply.edit!.sectionKey);
      if (s) jump(s.id);
    }
  };

  const applyEdit = (m: ChatMsg) => {
    const s = p.sections.find((x) => x.key === m.edit!.sectionKey);
    if (!s) return;
    setBody(s.id, m.edit!.body, m.edit!.summary);
    setChat((c) => c.map((x) => (x.id === m.id ? { ...x, status: 'applied' } : x)));
    toast('Applied to the document', 'ok', { label: 'Undo', run: undo });
  };

  const fill = (ph: PlaceholderRef, value: string) => {
    const s = p.sections.find((x) => x.id === ph.sectionId)!;
    setBody(s.id, fillPlaceholder(s.body, ph.text, ph.nth, value), `Filled “${ph.text}”`);
  };

  const onFix = (fix: string) => {
    if (fix === 'evidence' || fix === 'stats') setDrawer(true);
    else if (fix === 'placeholders') document.getElementById('fill-in')?.scrollIntoView({ behavior: 'smooth' });
    else if (fix === 'requirements') document.getElementById('coverage')?.scrollIntoView({ behavior: 'smooth' });
    else if (fix === 'generate') {
      const empty = p.sections.find((s) => s.body.trim().length < 20);
      if (empty) regenerate(empty.id);
    }
  };

  const setStatus = (s: ProposalStatus) => {
    if (s === 'submitted' && !user?.canApprove) {
      toast('Only an approver can mark a proposal as submitted. Send it for review first.', 'warn');
      return;
    }
    updateProposal(p.id, { status: s }, `Moved to ${STATUS_META[s].label}`);
    setMenu(null);
    toast(`Status: ${STATUS_META[s].label}`, 'ok');
  };

  const sig = draftSignature(p.sections);
  const factStale = !!fact && fact.sig !== sig;
  const openIssues = fact ? fact.result.issues.filter((i) => !fact.dismissed.includes(i.id)) : [];

  const runFactCheck = async () => {
    setPanel('checklist');
    setChecking(true);
    const checkedSig = draftSignature(p.sections);
    const result = await ai.factCheck(p, ctx);
    setChecking(false);
    setFact({ result, sig: checkedSig, dismissed: [] });
    toast(result.issues.length ? `Fact check flagged ${result.issues.length} claim${result.issues.length > 1 ? 's' : ''}` : 'Fact check: no problems found', result.issues.length ? 'warn' : 'ok');
    return result;
  };

  /** Wraps a flagged claim in a [[Confirm: …]] placeholder, so it can't go out unchecked. */
  const markClaim = (issue: FactIssue) => {
    const s = p.sections.find((x) => x.key === issue.sectionKey);
    if (!s || !canMarkClaim(s.body, issue.quote)) return;
    const body = s.body.replace(issue.quote, `[[${CONFIRM_PREFIX}${issue.quote.replace(/\*\*/g, '')}]]`);
    setBody(s.id, body, `Marked a claim to confirm in ${s.title}`);
    // The check still holds for the rest of the draft: move it onto the edited text.
    setFact((f) => f && { ...f, sig: draftSignature(p.sections.map((x) => (x.id === s.id ? { ...x, body } : x))), dismissed: [...f.dismissed, issue.id] });
  };

  const dismissIssue = (issue: FactIssue) => setFact((f) => f && { ...f, dismissed: [...f.dismissed, issue.id] });

  /** Exports straight away only when a current fact check has nothing open; otherwise asks first. */
  const requestExport = (kind: ExportKind) => {
    setMenu(null);
    if (fact && !factStale && openIssues.length === 0) doExport(kind);
    else setGate(kind);
  };

  const doExport = async (kind: ExportKind) => {
    setMenu(null);
    if (readiness.placeholders && (kind === 'docx' || kind === 'pdf'))
      toast(`Heads-up: ${readiness.placeholders} item(s) still marked for input`, 'warn');
    try {
      setExporting(kind);
      if (kind === 'docx') await (await import('@/export/docx')).exportDocx(p);
      if (kind === 'pdf') await (await import('@/export/pdf')).exportPdf(p);
      if (kind === 'copy') {
        const ok = await copyRich(proposalToHtml(p), proposalToText(p));
        toast(ok ? 'Whole proposal copied. Paste into Word or Outlook.' : 'Copy failed', ok ? 'ok' : 'warn');
      }
      if (kind === 'share') setShare(await makeShareUrl(p));
      if (kind === 'print') window.print();
      if (kind === 'docx' || kind === 'pdf') {
        updateProposal(p.id, {}, `Exported ${kind === 'docx' ? 'Word' : 'PDF'}`);
        toast(`${kind === 'docx' ? 'Word' : 'PDF'} downloaded`, 'ok');
      }
    } catch (e) {
      console.error(e);
      toast('Export failed. Please try again.', 'warn');
    } finally {
      setExporting(null);
    }
  };

  const regenerateUntouched = async (np: Proposal) => {
    const targets = np.sections.filter((s) => !s.edited);
    if (!targets.length) return toast('Every section has manual edits, so none were refreshed', 'info');
    pushUndo('Refresh sections');
    const nctx: DraftContext = {
      ...ctx,
      projects: np.selectedProjectIds.map((x) => projects.find((pp) => pp.id === x)).filter((x) => x !== undefined),
      stats: np.selectedStatIds.map(statById).filter((x) => x !== undefined),
    };
    for (const s of targets) {
      setBusyId(s.id);
      const body = await ai.draft(s.key, np, nctx);
      updateProposal(p.id, (cur) => ({ sections: cur.sections.map((x) => (x.id === s.id ? { ...x, body, generatedAt: new Date().toISOString() } : x)) }));
    }
    setBusyId(null);
    updateProposal(p.id, {}, `Refreshed ${targets.length} sections`);
    toast(`Refreshed ${targets.length} section${targets.length > 1 ? 's' : ''}`, 'ok', { label: 'Undo', run: undo });
  };

  const due = daysUntil(p.dueDate);
  const focusKey = p.sections.find((s) => s.id === activeId)?.key;
  const nextStatus: { s: ProposalStatus; label: string } | null =
    p.status === 'draft' ? { s: 'review', label: 'Send for review' } : p.status === 'review' ? { s: 'submitted', label: user?.canApprove ? 'Approve & mark submitted' : 'Awaiting approval' } : null;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="no-print flex h-14 shrink-0 items-center gap-2 border-b border-rule bg-paper px-3 sm:px-4">
        <button onClick={() => nav('/proposals')} aria-label="Back to proposals" className="grid h-8 w-8 place-items-center rounded-control text-ink-tertiary hover:bg-paper-sunk hover:text-ink">
          <ChevronLeft />
        </button>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              defaultValue={p.title}
              onBlur={(e) => {
                updateProposal(p.id, { title: e.target.value || p.title }, 'Renamed proposal');
                setEditingTitle(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full rounded-control border border-rampart bg-paper-raised px-2 py-1 text-[14.5px] font-semibold text-ink focus:outline-none"
              aria-label="Proposal title"
            />
          ) : (
            <button onClick={() => setEditingTitle(true)} className="group flex max-w-full items-center gap-1.5 text-left" title="Rename">
              <span className="truncate text-[14.5px] font-semibold text-ink">{p.title}</span>
              <EditIcon size={13} className="shrink-0 text-ink-muted opacity-0 group-hover:opacity-100" />
            </button>
          )}
          <p className="flex items-center gap-2 truncate text-[12px] text-ink-tertiary">
            <span>{p.client}</span>·
            <span className={due !== undefined && due <= 3 ? 'font-semibold text-beacon' : ''}>
              Due {fmtShort(p.dueDate)}
              {due !== undefined && ` (${due < 0 ? `${-due}d overdue` : `${due}d left`})`}
            </span>
            ·<span className="hidden sm:inline">Saved {timeAgo(p.updatedAt)}</span>
          </p>
        </div>

        {/* Status */}
        <div className="relative hidden md:block">
          <button onClick={() => setMenu(menu === 'status' ? null : 'status')} className="flex items-center gap-1 rounded-control px-1.5 py-1 hover:bg-paper-sunk" aria-label="Change status">
            <StatusStamp status={p.status} /> <ChevronDown size={14} className="text-ink-muted" />
          </button>
          {menu === 'status' && (
            <Dropdown onClose={() => setMenu(null)}>
              {(Object.keys(STATUS_META) as ProposalStatus[]).map((s) => (
                <DropItem key={s} onClick={() => setStatus(s)} active={p.status === s}>
                  <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} /> {STATUS_META[s].label}
                </DropItem>
              ))}
            </Dropdown>
          )}
        </div>

        {nextStatus && (
          <Button
            variant="secondary"
            size="sm"
            className="hidden lg:inline-flex"
            disabled={nextStatus.s === 'submitted' && !user?.canApprove}
            onClick={() => setStatus(nextStatus.s)}
          >
            {nextStatus.label}
          </Button>
        )}

        <Button variant="ghost" size="sm" icon={<SettingsIcon size={15} />} onClick={() => setDrawer(true)} className="hidden sm:inline-flex">
          Details
        </Button>

        {/* Export */}
        <div className="relative">
          <Button variant="primary" size="sm" icon={exporting ? <Spinner size={14} /> : <DownloadIcon size={15} />} onClick={() => setMenu(menu === 'export' ? null : 'export')}>
            Export <ChevronDown size={13} />
          </Button>
          {menu === 'export' && (
            <Dropdown onClose={() => setMenu(null)} wide>
              <DropItem onClick={() => requestExport('docx')} icon={<FileIcon size={16} />} hint="Editable, Bastion-branded .docx">Word document</DropItem>
              <DropItem onClick={() => requestExport('pdf')} icon={<DownloadIcon size={16} />} hint="Print-ready, US Letter">PDF</DropItem>
              <div className="my-1 border-t border-rule" />
              <DropItem onClick={() => requestExport('copy')} icon={<CopyIcon size={16} />} hint="Paste into Word or Outlook with formatting">Copy all text</DropItem>
              <DropItem onClick={() => requestExport('share')} icon={<LinkIcon size={16} />} hint="Read-only link to this version">Share link</DropItem>
              <DropItem onClick={() => requestExport('print')} icon={<PrintIcon size={16} />} hint="Uses your browser's print dialog">Print</DropItem>
            </Dropdown>
          )}
        </div>

        <div className="relative">
          <button aria-label="More actions" onClick={() => setMenu(menu === 'more' ? null : 'more')} className="grid h-8 w-8 place-items-center rounded-control text-ink-tertiary hover:bg-paper-sunk hover:text-ink">
            <DotsIcon />
          </button>
          {menu === 'more' && (
            <Dropdown onClose={() => setMenu(null)}>
              <DropItem
                onClick={() => {
                  const c = duplicateProposal(p.id);
                  setMenu(null);
                  if (c) {
                    nav(`/p/${c.id}`);
                    toast('Duplicated. You are now editing the copy.', 'ok');
                  }
                }}
              >
                Duplicate as new draft
              </DropItem>
              <DropItem onClick={() => { setMenu(null); setDrawer(true); }}>Edit details & evidence</DropItem>
              <DropItem onClick={() => { setMenu(null); undo(); }}>Undo last change</DropItem>
              <div className="my-1 border-t border-rule" />
              <DropItem danger onClick={() => { setMenu(null); setConfirmDelete(true); }}>
                <TrashIcon size={15} /> Delete proposal
              </DropItem>
            </Dropdown>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Outline */}
        <aside className="no-print hidden w-[230px] shrink-0 border-r border-rule bg-sidebar xl:block">
          <Outline p={p} activeId={activeId} onJump={jump} onMove={move} onRemove={remove} onAdd={add} />
        </aside>

        {/* Document */}
        <div ref={scroller} className="scroll-quiet min-w-0 flex-1 overflow-y-auto bg-desk px-3 py-8 sm:px-8">
          <DocumentView
            p={p}
            activeId={activeId}
            busyId={busyId}
            setActive={setActiveId}
            onChange={(sid, body) => setBody(sid, body)}
            onRewrite={rewrite}
            onRegenerate={regenerate}
            onCopy={copySection}
          />
          <p className="no-print mx-auto mt-4 max-w-[820px] text-center text-[12px] text-ink-tertiary">
            Double-click any section to edit · <kbd className="font-mono">Ctrl Z</kbd> to undo Bastion Assist changes
          </p>
        </div>

        {/* Right panel */}
        <aside className="no-print hidden w-[340px] shrink-0 flex-col border-l border-rule bg-paper lg:flex">
          <div className="flex items-center gap-1 border-b border-rule px-2 pt-1.5">
            <TabBtn on={panel === 'assist'} onClick={() => setPanel('assist')}>
              <SparkIcon size={15} className="text-beacon" /> Bastion Assist
            </TabBtn>
            <TabBtn on={panel === 'checklist'} onClick={() => setPanel('checklist')}>
              <ProgressRing value={readiness.score} size={20} stroke={2.5} /> Checklist
              {readiness.placeholders > 0 && <span className="tabular rounded-full bg-[#fff1c2] px-1.5 text-[10.5px] font-bold text-[#7a4b00]">{readiness.placeholders}</span>}
            </TabBtn>
          </div>
          <div className="min-h-0 flex-1">
            {panel === 'assist' ? (
              <AssistPanel
                messages={chat}
                thinking={thinking}
                focusKey={focusKey}
                onSend={sendChat}
                onApply={applyEdit}
                onDiscard={(m) => setChat((c) => c.map((x) => (x.id === m.id ? { ...x, status: 'discarded' } : x)))}
              />
            ) : (
              <ChecklistPanel
                p={p}
                r={readiness}
                onJumpSection={jump}
                onFill={fill}
                onFix={onFix}
                factCheck={
                  <FactCheckCard
                    result={fact?.result ?? null}
                    stale={factStale}
                    running={checking}
                    live={engine.mode === 'live'}
                    dismissed={fact?.dismissed ?? []}
                    bodyFor={(key) => p.sections.find((s) => s.key === key)?.body}
                    onRun={runFactCheck}
                    onJump={(key) => {
                      const s = p.sections.find((x) => x.key === key);
                      if (s) jump(s.id);
                    }}
                    onMark={markClaim}
                    onDismiss={dismissIssue}
                  />
                }
              />
            )}
          </div>
        </aside>
      </div>

      {drawer && (
        <DetailsDrawer
          p={p}
          open
          onClose={() => setDrawer(false)}
          onSave={(patch, regen) => {
            const np = { ...p, ...patch };
            updateProposal(p.id, patch, 'Updated details');
            setDrawer(false);
            toast('Details saved', 'ok');
            if (regen) regenerateUntouched(np);
          }}
        />
      )}

      <Modal
        open={!!share}
        onClose={() => setShare(null)}
        title="Share a read-only copy"
        footer={
          <>
            <Button variant="ghost" onClick={() => window.open(share!, '_blank')}>
              Open preview
            </Button>
            <Button
              variant="rampart"
              icon={<CopyIcon size={15} />}
              onClick={async () => {
                await navigator.clipboard.writeText(share!).catch(() => {});
                toast('Link copied', 'ok');
              }}
            >
              Copy link
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-secondary">
          Anyone with this link can read this version of the proposal. The content is packed into the link itself, so nothing is uploaded, and later edits won’t appear in it.
        </p>
        <input readOnly value={share ?? ''} onFocus={(e) => e.target.select()} className="mt-3 w-full truncate rounded-control border border-rule-strong bg-paper-inset px-3 py-2 font-mono text-[12px] text-ink-secondary" aria-label="Share link" />
        {readiness.placeholders > 0 && (
          <p className="mt-3 rounded-record bg-warn-wash px-3 py-2 text-[12.5px] text-warn">
            {readiness.placeholders} highlighted item(s) are still waiting for input and will show in the shared copy.
          </p>
        )}
      </Modal>

      <Modal
        open={!!gate}
        onClose={() => setGate(null)}
        title={fact && !factStale ? `${openIssues.length} claim${openIssues.length > 1 ? 's' : ''} not backed up yet` : 'Fact-check before you export?'}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                const k = gate!;
                setGate(null);
                doExport(k);
              }}
            >
              Export anyway
            </Button>
            {fact && !factStale ? (
              <Button
                variant="rampart"
                onClick={() => {
                  setGate(null);
                  setPanel('checklist');
                  setTimeout(() => document.getElementById('fact-check')?.scrollIntoView({ behavior: 'smooth' }), 50);
                }}
              >
                Review claims
              </Button>
            ) : (
              <Button
                variant="rampart"
                icon={checking ? <Spinner size={14} /> : undefined}
                disabled={checking}
                onClick={async () => {
                  const k = gate!;
                  const result = await runFactCheck();
                  setGate(null);
                  if (!result.issues.length) doExport(k);
                }}
              >
                Run fact check
              </Button>
            )}
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-secondary">
          {fact && !factStale
            ? 'The fact check found claims that Bastion’s facts and the RFP don’t back up. Review them before this goes to the client, or export anyway if you have confirmed them yourself.'
            : engine.mode === 'live'
              ? 'A second AI model reads the draft against Bastion’s facts and the RFP and flags any claim it can’t back up. It takes about a minute. If nothing is flagged, the export continues.'
              : 'The offline check flags any figure that doesn’t appear in Bastion’s facts or the RFP. If nothing is flagged, the export continues.'}
        </p>
        {factStale && <p className="mt-3 rounded-record bg-warn-wash px-3 py-2 text-[12.5px] text-warn">The draft has changed since the last fact check.</p>}
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this proposal?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                deleteProposal(p.id);
                nav('/proposals');
                toast('Proposal deleted', 'info');
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-ink-secondary">“{p.title}” will be removed from this browser. This can’t be undone.</p>
      </Modal>
    </div>
  );
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-semibold ${on ? 'border-beacon text-ink' : 'border-transparent text-ink-tertiary hover:text-ink'}`}>
      {children}
    </button>
  );
}

function Dropdown({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className={`pop-in absolute right-0 top-full z-40 mt-1.5 ${wide ? 'w-72' : 'w-56'} overflow-hidden rounded-record border border-rule-strong bg-paper-raised py-1 shadow-xl`}>{children}</div>
    </>
  );
}

function DropItem({ children, onClick, icon, hint, active, danger }: { children: ReactNode; onClick: () => void; icon?: ReactNode; hint?: string; active?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-paper-inset ${danger ? 'text-bad' : 'text-ink'} ${active ? 'bg-paper-inset' : ''}`}>
      {icon && <span className="mt-0.5 text-ink-tertiary">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[13px] font-medium">{children}</span>
        {hint && <span className="block text-[11.5px] text-ink-tertiary">{hint}</span>}
      </span>
    </button>
  );
}
