import { useState, type CSSProperties } from 'react';
import { GhostGlyph } from '@specter/ui';
import type { SpecterPrefs } from '../../src/prefs';

/**
 * Onboarding haunts (design steering section 5). The effects play on the
 * onboarding screen itself, so the user feels each mode before choosing it.
 * Nothing loops: each ghost plays its path once. Quiet and reduced motion keep
 * ghosts still. Every mode effect is keyed by the chosen level, so it replays
 * when the user picks another one.
 */

type Level = SpecterPrefs['effectLevel'];

const CSS = `
.specter-path{position:absolute;animation:specter-path var(--dur,7s) cubic-bezier(.45,.05,.55,.95) var(--delay,0s) 1 both;}
@keyframes specter-path{
  0%{left:var(--ax);top:var(--ay);opacity:0}
  12%{opacity:var(--o)}
  30%{left:var(--bx);top:var(--by)}
  55%{left:var(--cx);top:var(--cy)}
  80%{left:var(--dx);top:var(--dy)}
  88%{opacity:var(--o)}
  100%{left:var(--ex);top:var(--ey);opacity:0}
}
.specter-tour{position:absolute;animation:specter-tour var(--tour-dur,6s) cubic-bezier(.45,.05,.55,.95) var(--tour-delay,3s) 1 both,specter-fade var(--fade-dur,.1s) linear var(--fade-delay,0s) 1 both;}
@keyframes specter-tour{0%{left:var(--ax);top:var(--ay)}25%{left:var(--bx);top:var(--by)}50%{left:var(--cx);top:var(--cy)}75%{left:var(--dx);top:var(--dy)}100%{left:var(--ex);top:var(--ey)}}
@keyframes specter-fade{from{opacity:1}to{opacity:var(--fade-to,1)}}
.specter-enter-pop{position:absolute;inset:0;animation:specter-pop 1.2s ease-out var(--pop-delay,0s) 1 both;}
@keyframes specter-pop{from{transform:translate(0,0)}to{transform:translate(var(--popx),var(--popy))}}
.specter-enter-grow{position:absolute;inset:0;animation:specter-grow 1.4s ease-out var(--pop-delay,0s) 1 both;}
@keyframes specter-grow{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
.specter-eye{transform-box:fill-box;transform-origin:center;animation:specter-blink .5s ease-in-out var(--blink-delay,1s) 2 both;}
@keyframes specter-blink{0%,85%,100%{transform:scaleY(1)}92%{transform:scaleY(.1)}}
.specter-sway{animation:specter-sway 2.4s ease-in-out 2 both;transform-origin:50% 100%;}
@keyframes specter-sway{0%{transform:skewX(0deg)}50%{transform:skewX(var(--sway,6deg))}100%{transform:skewX(0deg)}}
.specter-rise-in{animation:specter-rise-in .6s ease-out 1 both;}
@keyframes specter-rise-in{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
.specter-shimmer{animation:specter-shimmer .6s ease-out 1 both;}
@keyframes specter-shimmer{0%{box-shadow:0 0 0 0 rgba(199,167,255,0)}50%{box-shadow:0 0 0 4px rgba(199,167,255,.45)}100%{box-shadow:0 0 0 2px rgba(199,167,255,.25)}}
.specter-pulse{animation:specter-pulse 1.2s ease-out 2;}
@keyframes specter-pulse{from{box-shadow:0 0 0 0 rgba(220,70,103,.6)}to{box-shadow:0 0 0 10px rgba(220,70,103,0)}}
.specter-vignette{position:fixed;inset:0;pointer-events:none;z-index:0;animation:specter-vignette 2.4s ease-in-out 1 both;background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.55) 100%);}
@keyframes specter-vignette{0%{opacity:0}40%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion: reduce){
  .specter-path,.specter-tour,.specter-enter-pop,.specter-enter-grow,.specter-vignette{display:none !important;}
  .specter-eye,.specter-sway,.specter-shimmer,.specter-pulse,.specter-rise-in{animation:none !important;}
}
`;

/** Put once in the onboarding page. The keyframes are scoped by the specter- prefix. */
export function HauntStyles() {
  return <style>{CSS}</style>;
}

/** Whether the system asks for reduced motion. Reduced motion forces the Quiet look (design steering 5.1). */
export function usePrefersReducedMotion(): boolean {
  const [reduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  return reduce;
}

function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

type Point = { x: number; y: number };

/** Small seeded generator: the same seed gives the same layout, so a step looks the same on re-render. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A ghost with eyes that can blink. Its stroke stays thin at any size. */
function GhostWithEyes({ size, blinkDelay }: { size: number; blinkDelay: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-ghost"
      style={vars({ '--blink-delay': blinkDelay })}
    >
      <path d="M5 21V11a7 7 0 0 1 14 0v10l-2.33-1.6L14.33 21 12 19.4 9.67 21 7.33 19.4Z" />
      <ellipse className="specter-eye" cx="9.5" cy="11" rx="0.9" ry="1.1" fill="currentColor" stroke="none" />
      <ellipse className="specter-eye" cx="14.5" cy="11" rx="0.9" ry="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ---------- regular ghosts ---------- */

type Side = 'left' | 'right' | 'bottom';
type Pattern = 'beeline' | 'zigzag' | 'wander';

interface GhostPlan {
  size: number;
  giant: boolean;
  opacity: number;
  dur: number;
  delay: number;
  /** When the eyes blink, in seconds from the step opening. */
  blink: number;
  /** Lean to the right, in degrees. Zero for upright ghosts. */
  tilt: number;
  /** Hem sway in degrees, or 0 for none. */
  sway: number;
  /** Start, three waypoints, and end, in percent of the viewport. */
  path: [Point, Point, Point, Point, Point];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Plans one regular ghost: where it enters, how it moves, how fast, how big,
 * how it leans, and when it blinks. Most are small or medium; about one in
 * twelve is a giant. Speeds vary. About half lean right, and some sway.
 */
function planGhost(i: number, r: () => number): GhostPlan {
  const sides: Side[] = ['left', 'right', 'bottom'];
  const side = sides[(i + Math.floor(r() * 3)) % 3] ?? 'left';

  const roll = r();
  const pattern: Pattern = roll < 0.35 ? 'beeline' : roll < 0.7 ? 'zigzag' : 'wander';

  let start: Point;
  let end: Point;
  if (side === 'bottom') {
    const x0 = 8 + r() * 84;
    start = { x: x0, y: 108 };
    end = { x: clamp(x0 + (r() - 0.5) * 50, 4, 96), y: -8 };
  } else {
    const y0 = 8 + r() * 70;
    start = { x: side === 'left' ? -8 : 108, y: y0 };
    end = { x: side === 'left' ? 108 : -8, y: clamp(y0 + (r() - 0.5) * 60, 4, 92) };
  }

  const at = (t: number): Point => ({
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  });
  const across = (p: Point, d: number): Point => (side === 'bottom' ? { x: p.x + d, y: p.y } : { x: p.x, y: p.y + d });

  const m = 10 + r() * 14;
  let b = at(0.3);
  let c = at(0.55);
  let d = at(0.8);
  if (pattern === 'zigzag') {
    b = across(b, m);
    c = across(c, -m);
    d = across(d, m);
  } else if (pattern === 'wander') {
    b = across(b, (r() - 0.5) * 16);
    c = across(c, (r() - 0.5) * 16);
    d = across(d, (r() - 0.5) * 16);
  }

  const giant = r() < 0.08;
  const big = !giant && r() < 0.18;
  const size = giant
    ? 120 + Math.floor(r() * 70)
    : big
      ? 46 + Math.floor(r() * 20)
      : 14 + Math.floor(r() * r() * 34);

  const tier = r();
  const dur = giant
    ? 11 + r() * 3
    : tier < 0.25
      ? 3.5 + r() * 1.5
      : tier < 0.75
        ? 6 + r() * 2
        : 9 + r() * 3;

  const delay = r() * 2.2;
  const leans = r() < 0.5;
  const tilt = leans ? 6 + r() * (giant ? 12 : 24) : 0;
  const sway = leans && r() < 0.6 ? 4 + r() * 8 : 0;
  // Blink somewhere in the middle of the flight, so each ghost blinks while it crosses.
  const blink = delay + dur * (0.3 + r() * 0.4);

  return {
    size,
    giant,
    opacity: giant ? 0.3 : big ? 0.55 : 0.85,
    dur,
    delay,
    blink,
    tilt,
    sway,
    path: [start, b, c, d, end],
  };
}

/** One regular ghost: leans, sways at the hem if it does, and blinks. */
function GhostFigure({ g, still }: { g: GhostPlan; still: boolean }) {
  return (
    <span style={{ display: 'block', transform: `rotate(${g.tilt.toFixed(1)}deg)` }}>
      <span
        className={g.sway ? 'specter-sway block' : 'block'}
        style={g.sway ? vars({ '--sway': `${g.sway}deg` }) : undefined}
      >
        <GhostWithEyes size={g.size} blinkDelay={still ? '600s' : `${g.blink.toFixed(2)}s`} />
      </span>
    </span>
  );
}

/**
 * Ghosts across the whole screen. Each one enters from the left, the right or
 * the bottom, at its own size, speed and lean, and blinks as it goes. `still`
 * keeps them in place (Quiet, or reduced motion). `seed` sets the layout.
 */
export function AmbientGhosts({ count, still, seed = 1 }: { count: number; still: boolean; seed?: number }) {
  const reduce = usePrefersReducedMotion();
  if (count <= 0) return null;
  const moving = !still && !reduce;
  const r = rng(seed * 7919 + count);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const g = planGhost(i, r);

        if (!moving) {
          const [, , c] = g.path;
          return (
            <div
              key={i}
              style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, opacity: g.opacity * 0.5 }}
            >
              <GhostFigure g={g} still />
            </div>
          );
        }

        const [a, b, c, d, e] = g.path;
        const style = vars({
          '--ax': `${a.x}%`,
          '--ay': `${a.y}%`,
          '--bx': `${b.x}%`,
          '--by': `${b.y}%`,
          '--cx': `${c.x}%`,
          '--cy': `${c.y}%`,
          '--dx': `${d.x}%`,
          '--dy': `${d.y}%`,
          '--ex': `${e.x}%`,
          '--ey': `${e.y}%`,
          '--o': `${g.opacity}`,
          '--dur': `${g.dur.toFixed(2)}s`,
          '--delay': `${g.delay.toFixed(2)}s`,
        });
        return (
          <div key={i} className="specter-path" style={style}>
            <GhostFigure g={g} still={false} />
          </div>
        );
      })}
    </div>
  );
}

/* ---------- the peeking giants ---------- */

type Edge = 'left' | 'right' | 'top' | 'bottom';

/** How a giant comes in. */
type Entry =
  | { kind: 'edge'; side: Edge; along: number }
  | { kind: 'grow'; x: number; y: number };

interface Peek {
  /** Seconds after the step opens before the entrance starts. */
  at: number;
  size: number;
  entry: Entry;
  /** Waypoints after the entrance, in percent of the viewport. */
  route: Point[];
  /** Where it leaves, off screen, or 'fade' to vanish where the route ends. */
  exit: Point | 'fade';
  /** Seconds the flight takes. */
  tourDur: number;
  /** Lean to the right, in degrees. */
  tilt: number;
}

/**
 * The giants that come out of the screen for a user who lingers on a step.
 * Each one enters another way and leaves another way: pop out of an edge, grow
 * out of the page, dive from the top, or peek from the side and vanish. Each is
 * bigger than the one before, and the gaps between them grow. None loops.
 */
const PEEKS: Peek[] = [
  {
    at: 12,
    size: 170,
    entry: { kind: 'edge', side: 'left', along: 30 },
    route: [
      { x: 40, y: 14 },
      { x: 62, y: 34 },
      { x: 84, y: 6 },
    ],
    exit: { x: 112, y: -10 },
    tourDur: 6.5,
    tilt: 9,
  },
  {
    at: 30,
    size: 150,
    entry: { kind: 'grow', x: 20, y: 64 },
    route: [
      { x: 44, y: 50 },
      { x: 58, y: 22 },
    ],
    exit: 'fade',
    tourDur: 7,
    tilt: 6,
  },
  {
    at: 50,
    size: 300,
    entry: { kind: 'edge', side: 'top', along: 70 },
    route: [
      { x: 58, y: 40 },
      { x: 32, y: 62 },
    ],
    exit: { x: -20, y: 112 },
    tourDur: 7.5,
    tilt: 11,
  },
  {
    at: 70,
    size: 200,
    entry: { kind: 'edge', side: 'right', along: 85 },
    route: [{ x: 88, y: 84 }],
    exit: 'fade',
    tourDur: 5,
    tilt: 4,
  },
  {
    at: 92,
    size: 380,
    entry: { kind: 'edge', side: 'bottom', along: 20 },
    route: [
      { x: 30, y: 60 },
      { x: 72, y: 34 },
      { x: 50, y: 10 },
    ],
    exit: { x: 50, y: -40 },
    tourDur: 8.5,
    tilt: 13,
  },
  {
    at: 118,
    size: 120,
    entry: { kind: 'grow', x: 80, y: 30 },
    route: [
      { x: 60, y: 60 },
      { x: 30, y: 30 },
      { x: 10, y: 50 },
    ],
    exit: { x: -15, y: 60 },
    tourDur: 6,
    tilt: 8,
  },
];

/** Evenly samples points along a route, so any route fits the four keyframe stops. */
function sample(pts: Point[], n: number): Point[] {
  const last = pts[pts.length - 1] ?? { x: 50, y: 50 };
  return Array.from({ length: n }, (_, i) => {
    if (pts.length === 1) return pts[0] ?? last;
    const t = (i / (n - 1)) * (pts.length - 1);
    const a = Math.floor(t);
    const b = Math.min(pts.length - 1, a + 1);
    const f = t - a;
    const pa = pts[a] ?? last;
    const pb = pts[b] ?? last;
    return { x: pa.x + (pb.x - pa.x) * f, y: pa.y + (pb.y - pa.y) * f };
  });
}

/**
 * One giant. Its outer element flies the route on one timeline. Its body
 * enters on another: it pops out of an edge, or grows out of the page. Its
 * eyes blink while it hovers. At the end it leaves the screen, or fades out
 * where its route ends.
 */
function Peeker({ p }: { p: Peek }) {
  const s = p.size;
  const e = p.entry;
  const grows = e.kind === 'grow';

  let origin: { x: string; y: string };
  let popX = '0%';
  let popY = '0%';
  if (e.kind === 'grow') {
    origin = { x: `${e.x}%`, y: `${e.y}%` };
  } else if (e.side === 'left') {
    origin = { x: `-${s}px`, y: `${e.along}%` };
    popX = '60%';
  } else if (e.side === 'right') {
    origin = { x: '100%', y: `${e.along}%` };
    popX = '-60%';
  } else if (e.side === 'top') {
    origin = { x: `${e.along}%`, y: `-${s}px` };
    popY = '60%';
  } else {
    origin = { x: `${e.along}%`, y: '100%' };
    popY = '-60%';
  }

  const enterDur = grows ? 1.4 : 1.2;
  const blinkAt = p.at + enterDur;
  const tourDelay = p.at + enterDur + 1.6;
  const fades = p.exit === 'fade';
  const pts = fades ? p.route : [...p.route, p.exit];
  const [m1, m2, m3, m4] = sample(pts, 4) as [Point, Point, Point, Point];

  const tour = vars({
    '--ax': origin.x,
    '--ay': origin.y,
    '--bx': `${m1.x}%`,
    '--by': `${m1.y}%`,
    '--cx': `${m2.x}%`,
    '--cy': `${m2.y}%`,
    '--dx': `${m3.x}%`,
    '--dy': `${m3.y}%`,
    '--ex': `${m4.x}%`,
    '--ey': `${m4.y}%`,
    '--tour-delay': `${tourDelay.toFixed(2)}s`,
    '--tour-dur': `${p.tourDur}s`,
    '--fade-delay': fades ? `${(tourDelay + p.tourDur * 0.7).toFixed(2)}s` : '0s',
    '--fade-dur': fades ? `${(p.tourDur * 0.3).toFixed(2)}s` : '0.1s',
    '--fade-to': fades ? '0' : '1',
  });
  const body = vars({
    '--popx': popX,
    '--popy': popY,
    '--pop-delay': `${p.at.toFixed(2)}s`,
  });

  return (
    <div className="specter-tour" style={{ ...tour, width: s, height: s }}>
      <div className={grows ? 'specter-enter-grow' : 'specter-enter-pop'} style={body}>
        <div style={{ width: s, height: s, transform: `rotate(${p.tilt}deg)` }}>
          <GhostWithEyes size={s} blinkDelay={`${blinkAt.toFixed(2)}s`} />
        </div>
      </div>
    </div>
  );
}

/** The giants for one step. Nothing moves under reduced motion. */
export function Haunter() {
  const reduce = usePrefersReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {PEEKS.map((p, i) => (
        <Peeker key={i} p={p} />
      ))}
    </div>
  );
}

/* ---------- mode effects (step 4) ---------- */

export function LevelGhost({ level }: { level: Level }) {
  const reduce = usePrefersReducedMotion();
  const lift = level === 'subtle' && !reduce ? 'specter-rise-in' : '';
  return (
    <span className={`inline-block shrink-0 text-ghost ${lift}`}>
      <GhostGlyph size={36} />
    </span>
  );
}

/**
 * Page-wide effects for the chosen level, played on the onboarding screen.
 * Quiet: two still ghosts. Subtle: one ghost. Immersive: an edge vignette and
 * three ghosts crossing. These are separate from the regular waves, and the
 * parent keys this by level so each choice replays.
 */
export function LevelFx({ level }: { level: Level }) {
  const reduce = usePrefersReducedMotion();
  if (reduce || level === 'quiet') {
    return <AmbientGhosts count={2} still seed={11} />;
  }
  if (level === 'subtle') {
    return <AmbientGhosts count={1} still={false} seed={12} />;
  }
  return (
    <>
      <div aria-hidden="true" className="specter-vignette" />
      <AmbientGhosts count={3} still={false} seed={13} />
    </>
  );
}

/**
 * The overlay drawn on the selected option card in step 4. Quiet: a static
 * outline. Subtle: a shimmer, once. Immersive: a pulse, twice. Reduced motion
 * shows the Quiet look.
 */
export function cardEffect(level: Level, reduce: boolean): { className: string; style?: CSSProperties } {
  const shown: Level = reduce ? 'quiet' : level;
  if (shown === 'immersive') return { className: 'specter-pulse rounded-[16px]' };
  if (shown === 'subtle') return { className: 'specter-shimmer rounded-[16px]' };
  return {
    className: 'rounded-[16px]',
    style: { outline: '2px solid #DC4667', outlineOffset: 2, borderRadius: 16 },
  };
}
