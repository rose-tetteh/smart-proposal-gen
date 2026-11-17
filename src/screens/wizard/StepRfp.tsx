import { useRef, useState, type DragEvent } from 'react';
import { ai } from '@/ai/provider';
import type { RfpExtraction } from '@/ai/extract';
import { ChevronRight, ClipboardIcon, SparkIcon, UploadIcon } from '@/components/icons';
import { Button, Spinner } from '@/components/ui';
import { SAMPLE_RFP } from '@/data/sampleRfp';
import type { ProposalDraft } from '@/lib/types';
import { useToast } from '@/lib/ui-state';

const LOOKS_FOR = ['Client & site', 'Work type & industry', 'Services in scope', 'Start, duration & due date', 'Peak headcount', 'Contract basis', 'Every “shall / must” requirement'];

export function StepRfp({
  draft,
  onExtracted,
  onSkip,
}: {
  draft: ProposalDraft;
  onExtracted: (x: RfpExtraction, text: string) => void;
  onSkip: () => void;
}) {
  const [text, setText] = useState(draft.rfpText);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const read = async (t = text) => {
    if (t.trim().length < 40) {
      toast('Paste a bit more of the RFP so Bastion Assist has something to read', 'warn');
      return;
    }
    setBusy(true);
    const x = await ai.extract(t);
    setBusy(false);
    toast(`Bastion Assist filled in ${x.found.length} items from the RFP`, 'ok');
    onExtracted(x, t);
  };

  const loadFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(txt|md|csv|text)$/i.test(f.name) && !f.type.startsWith('text/')) {
      toast('For Word or PDF RFPs, open the file and paste the text here for now', 'warn');
      return;
    }
    const t = await f.text();
    setText(t);
    toast(`Loaded ${f.name}`, 'info');
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    loadFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-beacon">Step 1</p>
      <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Got an RFP? Let Bastion Assist read it.</h2>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">
        Paste the client’s request below. Bastion Assist pulls out the details and turns every requirement into a checklist, so nothing gets missed.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative mt-6 overflow-hidden rounded-panel border-2 border-dashed transition-colors ${drag ? 'border-rampart bg-rampart-wash' : 'border-rule-strong bg-paper-raised'}`}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Paste the RFP, scope of work or client email here…\n\nOr drop a .txt file onto this box.'}
          className="scroll-quiet block h-[320px] w-full resize-y bg-transparent p-5 font-mono text-[13px] leading-relaxed text-ink placeholder:font-sans placeholder:text-[14px] placeholder:text-ink-muted focus:outline-none"
          aria-label="RFP text"
          disabled={busy}
        />
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-paper-raised/80 backdrop-blur-[1px]">
            <div className="pointer-events-none absolute inset-x-0 h-16 animate-[scan_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-beacon/10 to-transparent" />
            <div className="flex items-center gap-2.5 rounded-full border border-rule bg-paper-raised px-4 py-2 text-[13.5px] font-semibold text-ink shadow-lg">
              <Spinner /> Reading the RFP…
            </div>
          </div>
        )}
        <style>{`@keyframes scan{0%{top:-4rem}100%{top:100%}}`}</style>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="rampart" size="lg" icon={<SparkIcon size={18} />} onClick={() => read()} disabled={busy || !text.trim()}>
          Read RFP & fill in details
        </Button>
        <input ref={file} type="file" accept=".txt,.md,.csv,text/plain" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
        <Button variant="secondary" size="lg" icon={<UploadIcon size={17} />} onClick={() => file.current?.click()} disabled={busy}>
          Upload file
        </Button>
        <Button
          variant="ghost"
          size="lg"
          icon={<ClipboardIcon size={17} />}
          disabled={busy}
          onClick={() => {
            setText(SAMPLE_RFP);
            read(SAMPLE_RFP);
          }}
        >
          Try a sample RFP
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="rounded-panel border border-rule bg-paper-inset p-4">
          <p className="text-[12.5px] font-semibold text-ink">Bastion Assist looks for</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LOOKS_FOR.map((l) => (
              <span key={l} className="rounded-full border border-rule bg-paper-raised px-2.5 py-1 text-[12px] text-ink-secondary">
                {l}
              </span>
            ))}
          </div>
        </div>
        <button onClick={onSkip} className="group flex items-center gap-1 justify-self-start text-[14px] font-semibold text-rampart hover:underline sm:justify-self-end">
          No RFP? Answer a few questions instead <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
