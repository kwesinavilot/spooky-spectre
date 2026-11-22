import { useState, type CSSProperties } from 'react';
import { GhostGlyph } from '@specter/ui';
import type { SpecterPrefs } from '../../src/prefs';

/**
 * Onboarding haunts (design steering section 5). The effects play on the
 * onboarding screen itself, so the user feels each mode before choosing it.
 * Ghosts cross the screen once; nothing loops. Quiet and reduced motion keep
 * ghosts still. Every effect is keyed by the chosen level, so it replays when
 * the user picks another one.
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
.specter-peek{position:absolute;animation:specter-peek-fly var(--fly-dur,6.5s) cubic-bezier(.45,.05,.55,.95) var(--fly-delay,3s) 1 both;}
@keyframes specter-peek-fly{from{left:var(--px0);top:var(--py0)}to{left:var(--px1);top:var(--py1)}}
.specter-peek-body{position:absolute;inset:0;animation:specter-pop 1.2s ease-out var(--pop-delay,0s) 1 both;}
@keyframes specter-pop{from{transform:translate(0,0)}to{transform:translate(var(--popx),var(--popy))}}
.specter-eye{transform-box:fill-box;transform-origin:center;animation:specter-blink .5s ease-in-out var(--blink-delay,1s) 2 both;}
@keyframes specter-blink{0%,85%,100%{transform:scaleY(1)}92%{transform:scaleY(.1)}}
@media (prefers-reduced-motion: reduce){
  .specter-path,.specter-vignette,.specter-peek{display:none !important;}
  .specter-eye{animation:none !important;}
  .specter-sway,.specter-shimmer,.specter-pulse,.specter-rise-in{animation:none !important;}
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

/* ---------- ghost paths ---------- */

type Side = 'left' | 'right' | 'bottom';
type Pattern = 'beeline' | 'zigzag' | 'wander';
type Point = { x: number; y: number };

/** Small seeded generator: the same seed gives the same layout, so a step looks the same on re-render. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface GhostPlan {
  side: Side;
  pattern: Pattern;
  giant: boolean;
  size: number;
  opacity: number;
  dur: number;
  delay: number;
  /** Lean of the whole ghost, in degrees. Zero for upright ghosts. */
  tilt: number;
  /** Hem sway in degrees, or 0 for none. Gives the flowing bottom. */
  sway: number;
  /** Start, three waypoints, and end, in percent of the viewport. */
  path: [Point, Point, Point, Point, Point];
}

/**
 * Plans one ghost: where it enters, how it moves, how fast, how big, and how
 * it leans. Most ghosts are small or medium; about one in twelve is a giant,
 * drifting slowly and faintly. Speeds vary: fast, normal and slow. About half
 * the ghosts lean, and some of those sway at the hem.
 */
function planGhost(i: number, r: () => number): GhostPlan {
  const sides: Side[] = ['left', 'right', 'bottom'];
  const side = sides[(i + Math.floor(r() * 3)) % 3] ?? 'left';

  const roll = r();
  const pattern: Pattern = roll < 0.35 ? 'beeline' : roll < 0.7 ? 'zigzag' : 'wander';

  // Start and end on opposite edges of the screen.
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
  // Offset across the line of travel: vertical for side entries, horizontal for bottom entries.
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

  // Giants drift slowly and faintly. Everything else is small or medium, mostly small.
  const giant = r() < 0.08;
  const big = !giant && r() < 0.18;
  const size = giant
    ? 120 + Math.floor(r() * 70)
    : big
      ? 46 + Math.floor(r() * 20)
      : 14 + Math.floor(r() * r() * 34);

  // Speed: a quarter fast, half normal, a quarter slow. Giants are slow.
  const tier = r();
  const dur = giant
    ? 11 + r() * 3
    : tier < 0.25
      ? 3.5 + r() * 1.5
      : tier < 0.75
        ? 6 + r() * 2
        : 9 + r() * 3;

  // About half lean; the rest stay upright. Giants lean a little less.
  const leans = r() < 0.5;
  // Positive is clockwise, so the ghost leans to the right.
  const tilt = leans ? 6 + r() * (giant ? 12 : 24) : 0;
  // Some leaning ghosts also sway at the hem, which reads as a flowing bottom.
  const sway = leans && r() < 0.6 ? 4 + r() * 8 : 0;

  return {
    side,
    pattern,
    giant,
    size,
    opacity: giant ? 0.3 : big ? 0.55 : 0.85,
    dur,
    delay: r() * 2.2,
    tilt,
    sway,
    path: [start, b, c, d, end],
  };
}

/* ---------- components ---------- */

function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

/** One ghost: the glyph leans by `tilt` and its hem sways if `sway` is set. */
function GhostFigure({ g }: { g: GhostPlan }) {
  const glyph = (
    <span
      className={g.sway ? 'specter-sway block' : 'block'}
      style={g.sway ? vars({ '--sway': `${g.sway}deg` }) : undefined}
    >
      <GhostGlyph size={g.size} className="text-ghost" />
    </span>
  );
  return <span style={{ display: 'block', transform: `rotate(${g.tilt.toFixed(1)}deg)` }}>{glyph}</span>;
}

/**
 * Ghosts across the whole screen. Each one enters from the left, the right or
 * the bottom, at its own size, speed and lean. `still` keeps them in place
 * (Quiet, or reduced motion). Each ghost plays once. `seed` sets the layout;
 * give a new seed to change it.
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
          // Still: the middle of the path, inside the screen.
          const [, , c] = g.path;
          return (
            <div
              key={i}
              style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, opacity: g.opacity * 0.5 }}
            >
              <GhostFigure g={g} />
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
            <GhostFigure g={g} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * The ghost beside the step 4 headline. Subtle lifts it once; Quiet and
 * Immersive show it still. Keyed by level in the parent so it replays on change.
 */
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

/* ---------- the peeking giants ---------- */

interface PeekPlan {
  /** Seconds after the step opens before the ghost pops its head out. */
  at: number;
  size: number;
  /** The edge or corner it pops out from. */
  origin: 'left' | 'right' | 'bottomRight';
  /** Height along the edge, in percent (left and right only). */
  oy?: number;
  /** Where it ends up, in percent of the viewport. */
  target: Point;
  /** Lean to the right, in degrees. */
  tilt: number;
}

/**
 * The haunt for a user who lingers on a step. Each ghost is bigger than the
 * last: it pops its head out, blinks twice, then flies slowly across the screen.
 * Timings are CSS delays from when the step opens, so leaving the step resets them.
 */
const PEEKS: PeekPlan[] = [
  { at: 12, size: 170, origin: 'left', oy: 30, target: { x: 84, y: 6 }, tilt: 9 },
  { at: 34, size: 230, origin: 'bottomRight', target: { x: 45, y: 4 }, tilt: 7 },
  { at: 60, size: 300, origin: 'right', oy: 55, target: { x: 8, y: 22 }, tilt: 12 },
];

/** A ghost with eyes that can blink. Its stroke stays thin at any size. */
function PeekGhost({ size, blinkDelay }: { size: number; blinkDelay: string }) {
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

/**
 * One peeking ghost. It starts fully off screen at its origin. The body pops
 * inward so the head and eyes show, the eyes blink, and then the whole ghost
 * flies to its target. Pop and fly are separate animations on separate elements.
 */
function Peeker({ p }: { p: PeekPlan }) {
  const s = p.size;
  const from =
    p.origin === 'left'
      ? { x0: `-${s}px`, y0: `${p.oy ?? 30}%`, popX: '60%', popY: '0%' }
      : p.origin === 'right'
        ? { x0: '100%', y0: `${p.oy ?? 50}%`, popX: '-60%', popY: '0%' }
        : { x0: `calc(100% - ${Math.round(s * 0.4)}px)`, y0: '100%', popX: '0%', popY: '-60%' };

  const outer = vars({
    '--px0': from.x0,
    '--py0': from.y0,
    '--px1': `${p.target.x}%`,
    '--py1': `${p.target.y}%`,
    '--fly-delay': `${(p.at + 2.8).toFixed(1)}s`,
    '--fly-dur': '6.5s',
  });
  const body = vars({
    '--popx': from.popX,
    '--popy': from.popY,
    '--pop-delay': `${p.at.toFixed(1)}s`,
  });

  return (
    <div className="specter-peek" style={{ ...outer, width: s, height: s }}>
      <div className="specter-peek-body" style={body}>
        <div style={{ width: s, height: s, transform: `rotate(${p.tilt}deg)` }}>
          <PeekGhost size={s} blinkDelay={`${(p.at + 1.2).toFixed(1)}s`} />
        </div>
      </div>
    </div>
  );
}

/** The peeking ghosts for one step. Nothing moves under reduced motion. */
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
