import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// ─── Theme ────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem('bpg.theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.setItem('bpg.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

// ─── Toasts ───────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'info' | 'warn';
  action?: { label: string; run: () => void };
}

const ToastCtx = createContext<(text: string, tone?: Toast['tone'], action?: Toast['action']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok', action?: Toast['action']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pop-in pointer-events-auto flex items-center gap-3 rounded-record border border-rule-strong bg-ink px-4 py-2.5 text-[13px] font-medium text-paper shadow-xl"
          >
            <span
              className={`h-2 w-2 rounded-full ${t.tone === 'ok' ? 'bg-[#4ade91]' : t.tone === 'warn' ? 'bg-amber' : 'bg-[#6cc6cf]'}`}
            />
            {t.text}
            {t.action && (
              <button
                className="ml-1 rounded px-2 py-0.5 font-semibold text-[#ffb3bd] hover:bg-white/10"
                onClick={() => {
                  t.action!.run();
                  setToasts((all) => all.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
