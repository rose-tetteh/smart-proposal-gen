/** Bastion Assist chat: ask for changes in plain English; proposed edits are previewed before they are applied. */
import { useEffect, useRef, useState } from 'react';
import type { AssistReply } from '@/ai/provider';
import { EngineChip } from '@/components/EngineBadge';
import { CheckIcon, SendIcon, SparkIcon, XIcon } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { Spinner } from '@/components/ui';
import { SECTION_TITLES } from '@/data/company';
import type { SectionKey } from '@/lib/types';

export interface ChatMsg {
  id: number;
  role: 'user' | 'ai';
  text: string;
  edit?: AssistReply['edit'];
  status?: 'applied' | 'discarded';
  suggestions?: string[];
}

export function AssistPanel({
  messages,
  thinking,
  focusKey,
  onSend,
  onApply,
  onDiscard,
}: {
  messages: ChatMsg[];
  thinking: boolean;
  focusKey: SectionKey | undefined;
  onSend: (text: string) => void;
  onApply: (m: ChatMsg) => void;
  onDiscard: (m: ChatMsg) => void;
}) {
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  // Braces matter: newer Chromium returns a Promise from scrollIntoView, and an effect must not return one.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);

  const send = (t = text) => {
    if (!t.trim() || thinking) return;
    onSend(t.trim());
    setText('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-quiet min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="ml-8 rounded-record rounded-br-[3px] bg-rampart px-3 py-2 text-[13px] text-white [:root[data-theme=dark]_&]:text-[#0e1116]">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="mr-2">
              <div className="flex gap-2">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-beacon-wash text-beacon">
                  <SparkIcon size={13} />
                </span>
                <div className="chat-md min-w-0 flex-1 text-[13px] leading-relaxed text-ink-secondary">
                  <Markdown source={m.text} placeholders={false} />
                </div>
              </div>
              {m.edit && (
                <div className="ml-8 mt-2 overflow-hidden rounded-record border border-rule-strong bg-paper-raised">
                  <p className="border-b border-rule bg-paper-inset px-3 py-1.5 text-[11.5px] font-semibold text-ink-tertiary">Proposed: {m.edit.summary}</p>
                  <div className="doc scroll-quiet max-h-56 overflow-y-auto bg-white px-3 py-2 text-[12.5px] [&_h3]:text-[12.5px] [&_table]:text-[11px]">
                    <Markdown source={m.edit.body} />
                  </div>
                  {m.status ? (
                    <p className={`border-t border-rule px-3 py-2 text-[12px] font-semibold ${m.status === 'applied' ? 'text-ok' : 'text-ink-tertiary'}`}>
                      {m.status === 'applied' ? '✓ Applied to the document' : 'Discarded'}
                    </p>
                  ) : (
                    <div className="flex gap-1.5 border-t border-rule p-2">
                      <button onClick={() => onApply(m)} className="flex flex-1 items-center justify-center gap-1 rounded-control bg-rampart py-1.5 text-[12.5px] font-semibold text-white hover:bg-rampart-deep [:root[data-theme=dark]_&]:text-[#0e1116]">
                        <CheckIcon size={14} /> Apply
                      </button>
                      <button onClick={() => onDiscard(m)} className="flex items-center justify-center gap-1 rounded-control px-3 py-1.5 text-[12.5px] font-semibold text-ink-secondary hover:bg-paper-sunk">
                        <XIcon size={14} /> Discard
                      </button>
                    </div>
                  )}
                </div>
              )}
              {m.suggestions && (
                <div className="ml-8 mt-2 flex flex-wrap gap-1.5">
                  {m.suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-rule-strong bg-paper-raised px-2.5 py-1 text-left text-[12px] text-ink-secondary hover:border-rampart hover:text-rampart">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {thinking && (
          <div className="flex items-center gap-2 pl-8 text-[12.5px] text-ink-tertiary">
            <Spinner size={13} /> Thinking…
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="border-t border-rule p-2.5">
        <div className="mb-1.5 flex items-center gap-2 px-1">
          {focusKey && <p className="min-w-0 truncate text-[11px] text-ink-tertiary">Focused on: <strong className="font-semibold text-ink-secondary">{SECTION_TITLES[focusKey]}</strong></p>}
          <EngineChip className="ml-auto shrink-0" />
        </div>
        <div className="flex items-end gap-1.5 rounded-record border border-rule-strong bg-paper-raised p-1.5 focus-within:border-rampart focus-within:ring-2 focus-within:ring-rampart/15">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Bastion Assist… e.g. “make safety more persuasive”"
            className="min-h-[38px] flex-1 resize-none bg-transparent px-1.5 py-1 text-[13px] text-ink placeholder:text-ink-muted focus:outline-none"
            aria-label="Message Bastion Assist"
          />
          <button onClick={() => send()} disabled={!text.trim() || thinking} aria-label="Send" className="grid h-8 w-8 place-items-center rounded-control bg-beacon text-white hover:bg-beacon-deep disabled:opacity-40">
            <SendIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
