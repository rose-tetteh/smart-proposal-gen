/**
 * Landing / sign-in. In this demo you pick a simulated Bastion profile; the
 * production build would replace the list with "Sign in with Microsoft"
 * (Entra ID via MSAL).
 */
import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui';
import { ChevronRight, MoonIcon, SunIcon } from '@/components/icons';
import { USERS } from '@/data/company';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/ui-state';

const PHRASES = [
  'RFP read in seconds',
  '92% experience match',
  'Turnaround bid drafted',
  '31 zero-recordable sites',
  'Requirements: 14 of 14 covered',
  'Scaffold · Insulation · Coatings',
  '62% less standby labor',
  'Exported to Word',
  '65+ years of results',
  'Bastion Lens · 3D planned',
];

/** Blueprint-office background: a drafting grid, scaffold bays being drawn, and floating "proof" tags. */
function BlueprintBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let W = 0;
    let H = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dark = theme === 'dark';
    const ink = dark ? '108,198,207' : '14,74,82';
    const red = dark ? '251,138,76' : '194,65,12';

    type Tag = { text: string; x: number; y: number; vy: number; life: number; max: number };
    const tags: Tag[] = [];
    type Bay = { x: number; base: number; cols: number; rows: number; w: number; h: number; t: number; speed: number };
    let bays: Bay[] = [];

    const resize = () => {
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bays = [];
      const n = Math.max(2, Math.round(W / 420));
      for (let i = 0; i < n; i++) {
        bays.push({
          x: (W / n) * i + 40 + Math.random() * 60,
          base: H - 30,
          cols: 3 + Math.floor(Math.random() * 3),
          rows: 4 + Math.floor(Math.random() * 4),
          w: 46 + Math.random() * 12,
          h: 44 + Math.random() * 10,
          t: Math.random() * 0.6,
          speed: 0.0009 + Math.random() * 0.0007,
        });
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // drafting grid
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 28) {
        ctx.strokeStyle = `rgba(${ink},${x % 140 === 0 ? 0.07 : 0.03})`;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 28) {
        ctx.strokeStyle = `rgba(${ink},${y % 140 === 0 ? 0.07 : 0.03})`;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.stroke();
      }

      // scaffold bays being "drawn" then fading, on a loop
      for (const b of bays) {
        b.t += b.speed;
        if (b.t > 1.35) b.t = 0;
        const p = Math.min(1, b.t);
        const fade = b.t > 1 ? 1 - (b.t - 1) / 0.35 : 1;
        const totalSegs = (b.cols + 1) * b.rows + b.cols * b.rows * 2;
        let drawn = Math.floor(totalSegs * p);
        ctx.strokeStyle = `rgba(${ink},${0.22 * fade})`;
        ctx.lineWidth = 1.4;
        const seg = (x1: number, y1: number, x2: number, y2: number, accent = false) => {
          if (drawn-- <= 0) return;
          ctx.strokeStyle = accent ? `rgba(${red},${0.28 * fade})` : `rgba(${ink},${0.2 * fade})`;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        };
        for (let r = 0; r < b.rows; r++) {
          const y0 = b.base - r * b.h;
          for (let c = 0; c <= b.cols; c++) seg(b.x + c * b.w, y0, b.x + c * b.w, y0 - b.h); // standards
          for (let c = 0; c < b.cols; c++) {
            seg(b.x + c * b.w, y0 - b.h, b.x + (c + 1) * b.w, y0 - b.h, r === b.rows - 1); // ledgers
            seg(b.x + c * b.w, y0, b.x + (c + 1) * b.w, y0 - b.h); // braces
          }
        }
      }

      // floating proof tags
      if (frame % 110 === 0 && tags.length < 6) {
        tags.push({
          text: PHRASES[Math.floor(Math.random() * PHRASES.length)],
          x: 30 + Math.random() * (W - 260),
          y: H * (0.25 + Math.random() * 0.6),
          vy: -0.18 - Math.random() * 0.12,
          life: 0,
          max: 420 + Math.random() * 200,
        });
      }
      ctx.font = '600 12px Geist, system-ui, sans-serif';
      for (let i = tags.length - 1; i >= 0; i--) {
        const t = tags[i];
        t.life++;
        t.y += t.vy;
        const a = Math.min(1, t.life / 60, (t.max - t.life) / 60);
        if (t.life > t.max) {
          tags.splice(i, 1);
          continue;
        }
        const w = ctx.measureText(t.text).width + 26;
        ctx.fillStyle = dark ? `rgba(23,27,34,${0.85 * a})` : `rgba(255,255,255,${0.9 * a})`;
        ctx.strokeStyle = `rgba(${ink},${0.18 * a})`;
        ctx.beginPath();
        ctx.roundRect(t.x, t.y, w, 26, 13);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = `rgba(${red},${a})`;
        ctx.beginPath();
        ctx.arc(t.x + 12, t.y + 13, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dark ? `rgba(236,238,242,${0.85 * a})` : `rgba(20,23,31,${0.78 * a})`;
        ctx.fillText(t.text, t.x + 21, t.y + 17);
      }

      raf = requestAnimationFrame(draw);
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      bays.forEach((b) => (b.t = 1));
      draw();
      cancelAnimationFrame(raf);
    } else draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export function SignIn() {
  const { signIn } = useStore();
  const { theme, toggle } = useTheme();
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-paper px-4 py-10">
      <BlueprintBackground />
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-control border border-rule-strong bg-paper-raised text-ink-secondary hover:text-ink"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="fade-up relative z-10 w-full max-w-[440px] rounded-panel border border-rule bg-paper-raised px-7 py-9 shadow-2xl sm:px-9">
        <div className="flex flex-col items-center text-center">
          <img src="/bastion-logo.png" alt="Bastion" className="logo-plate h-[40px] w-auto" />
          <div className="mt-6 flex items-center gap-2">
            <span className="stamp text-beacon">Bastion Assist</span>
          </div>
          <h1 className="mt-3 text-h1 font-semibold tracking-tight text-ink">Proposal Generator</h1>
          <p className="mt-2.5 max-w-[22rem] text-[15px] leading-[1.65] text-ink-secondary">
            Turn an RFP into a client-ready Bastion proposal, backed by our own past projects, safety record and live performance data.
          </p>
        </div>

        <div className="mt-7">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Continue as (demo profiles)</p>
          <ul className="overflow-hidden rounded-record border border-rule">
            {USERS.map((u) => (
              <li key={u.id} className="border-b border-rule last:border-b-0">
                <button
                  onClick={() => signIn(u)}
                  className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-paper-inset"
                >
                  <Avatar initials={u.initials} size={34} tone={u.canApprove ? 'beacon' : 'rampart'} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink">{u.name}</span>
                    <span className="block truncate text-[12.5px] text-ink-tertiary">
                      {u.title} · {u.unit}
                    </span>
                  </span>
                  {u.canApprove && <span className="stamp text-ok">Approver</span>}
                  <ChevronRight className="text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-center text-caption leading-relaxed text-ink-tertiary">
          Demo mode: data stays in this browser. Microsoft Entra sign-in will be connected with the backend.
        </p>
      </div>
    </main>
  );
}
