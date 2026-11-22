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
.specter-rise-in{animation:specter-rise-in .6s ease-out 1 both;}
@keyframes specter-rise-in{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
.specter-shimmer{animation:specter-shimmer .6s ease-out 1 both;}
@keyframes specter-shimmer{0%{box-shadow:0 0 0 0 rgba(199,167,255,0)}50%{box-shadow:0 0 0 4px rgba(199,167,255,.45)}100%{box-shadow:0 0 0 2px rgba(199,167,255,.25)}}
.specter-pulse{animation:specter-pulse 1.2s ease-out 2;}
@keyframes specter-pulse{from{box-shadow:0 0 0 0 rgba(220,70,103,.6)}to{box-shadow:0 0 0 10px rgba(220,70,103,0)}}
.specter-vignette{position:fixed;inset:0;pointer-events:none;z-index:0;animation:specter-vignette 2.4s ease-in-out 1 both;background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.55) 100%);}
@keyframes specter-vignette{0%{opacity:0}40%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion: reduce){
  .specter-path,.specter-vignette{display:none !important;}
  .specter-shimmer,.specter-pulse,.specter-rise-in{animation:none !important;}
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
  size: number;
  opacity: number;
  dur: number;
  delay: number;
  /** Start, three waypoints, and end, in percent of the viewport. */
  path: [Point, Point, Point, Point, Point];
}

/**
 * Plans one ghost: where it enters, how it moves, how big it is. Sizes skew
 * small, with the odd large ghost. Paths are beelines, zigzags or wanders.
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

  const big = r() < 0.18;
  const size = big ? 46 + Math.floor(r() * 20) : 14 + Math.floor(r() * r() * 34);
  return {
    side,
    pattern,
    size,
    opacity: big ? 0.55 : 0.85,
    dur: 5 + r() * 4,
    delay: r() * 2.2,
    path: [start, b, c, d, end],
  };
}

/* ---------- components ---------- */

function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

/**
 * Ghosts across the whole screen. Each one enters from the left, the right or
 * the bottom, in its own size and on its own path. `still` keeps them in place
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
        const glyph = <GhostGlyph size={g.size} className="text-ghost" />;

        if (!moving) {
          // Still: the middle of the path, inside the screen.
          const [, , c] = g.path;
          return (
            <div
              key={i}
              style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, opacity: g.opacity * 0.5 }}
            >
              {glyph}
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
            {glyph}
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
