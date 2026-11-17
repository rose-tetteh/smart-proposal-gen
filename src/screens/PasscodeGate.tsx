/**
 * Team passcode screen, shown before sign-in when the server has APP_PASSCODE
 * set (the hosted demo). It stops a shared link from spending the AI key.
 *
 * The real check happens on the server (server/core.ts): every AI request
 * needs the signed cookie this screen obtains. When there is no backend at all
 * (a static preview) or no passcode is configured, the gate stays open.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { checkEngine } from '@/ai/engine';
import { Spinner } from '@/components/ui';

type Gate = 'checking' | 'locked' | 'open';

export function PasscodeGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>('checking');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/auth')
      .then((r) => (r.ok ? r.json() : { required: false, ok: true }))
      .catch(() => ({ required: false, ok: true }))
      .then((j: { required?: boolean; ok?: boolean }) => {
        if (live) setGate(j.required && !j.ok ? 'locked' : 'open');
      });
    return () => {
      live = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? 'That passcode is not right.');
        setCode('');
      } else {
        setGate('open');
        // The AI engine was checked before the passcode was entered; check again now it is allowed.
        checkEngine();
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (gate === 'open') return <>{children}</>;

  return (
    <main className="blueprint grid min-h-dvh place-items-center bg-paper px-4 py-10">
      {gate === 'checking' ? (
        <Spinner size={22} />
      ) : (
        <form onSubmit={submit} className="fade-up w-full max-w-[380px] rounded-panel border border-rule bg-paper-raised px-7 py-9 text-center shadow-2xl">
          <img src="/bastion-logo.png" alt="Bastion" className="logo-plate mx-auto h-[38px] w-auto" />
          <h1 className="mt-6 text-h2 font-semibold tracking-tight text-ink">Team access</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">This demo is for the project team. Enter the passcode you were given.</p>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Passcode"
            aria-label="Team passcode"
            className="mt-6 w-full rounded-control border border-rule-strong bg-paper-raised px-3.5 py-2.5 text-center text-[15px] tracking-wide text-ink placeholder:text-ink-muted focus:border-rampart focus:outline-none focus:ring-2 focus:ring-rampart/15"
          />
          {error && (
            <p role="alert" className="mt-3 rounded-record bg-bad-wash px-3 py-2 text-[13px] text-bad">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!code.trim() || busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-control bg-beacon px-4 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-beacon-deep disabled:opacity-50"
          >
            {busy && <Spinner size={15} />} Unlock
          </button>
          <p className="mt-5 text-caption text-ink-tertiary">You’ll stay unlocked on this browser for 14 days.</p>
        </form>
      )}
    </main>
  );
}
