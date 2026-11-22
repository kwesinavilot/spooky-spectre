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
.specter-fly{position:absolute;animation:specter-fly var(--dur,6s) ease-in-out var(--delay,0s) 1 both;}
@keyframes specter-fly{from{left:var(--x0);opacity:0}15%{opacity:.8}85%{opacity:.8}to{left:var(--x1);opacity:0}}
.specter-rise{position:absolute;animation:specter-rise 7s ease-out var(--delay,0s) 1 both;}
@keyframes specter-rise{from{top:110%;opacity:0}20%{opacity:.7}to{top:-10%;opacity:0}}
.specter-shimmer{animation:specter-shimmer .6s ease-out 1 both;}
@keyframes specter-shimmer{0%{box-shadow:0 0 0 0 rgba(199,167,255,0)}50%{box-shadow:0 0 0 4px rgba(199,167,255,.45)}100%{box-shadow:0 0 0 2px rgba(199,167,255,.25)}}
.specter-pulse{animation:specter-pulse 1.2s ease-out 2;}
@keyframes specter-pulse{from{box-shadow:0 0 0 0 rgba(220,70,103,.6)}to{box-shadow:0 0 0 10px rgba(220,70,103,0)}}
.specter-rise-in{animation:specter-rise-in .6s ease-out 1 both;}
@keyframes specter-rise-in{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
.specter-vignette{position:fixed;inset:0;pointer-events:none;z-index:0;animation:specter-vignette 2.4s ease-in-out 1 both;background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.55) 100%);}
@keyframes specter-vignette{0%{opacity:0}40%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion: reduce){
  .specter-fly,.specter-rise,.specter-vignette{display:none !important;}
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

function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

export type WaveKind = 'fly' | 'rise';

/**
 * Ghosts across the whole screen. `fly` crosses left to right; `rise` floats up
 * from the bottom. `still` keeps them in place (Quiet, or reduced motion).
 * Each ghost plays once. Give the parent a new key to start a new wave.
 */
export function AmbientGhosts({ count, kind, still }: { count: number; kind: WaveKind; still: boolean }) {
  const reduce = usePrefersReducedMotion();
  if (count <= 0) return null;
  const moving = !still && !reduce;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const size = 26 + ((i * 7) % 18);
        const lane = 12 + ((i * 29) % 70);
        const delay = `${(i * 0.7).toFixed(1)}s`;
        const glyph = <GhostGlyph size={size} className="text-ghost" />;

        if (!moving) {
          const style: CSSProperties =
            kind === 'fly'
              ? { position: 'absolute', top: `${lane}%`, left: `${lane}%` }
              : { position: 'absolute', left: `${lane}%`, bottom: `${10 + ((i * 13) % 40)}%` };
          return (
            <div key={i} style={style} className="opacity-30">
              {glyph}
            </div>
          );
        }
        if (kind === 'fly') {
          return (
            <div
              key={i}
              className="specter-fly"
              style={vars({ top: `${lane}%`, '--x0': '-10vw', '--x1': '110vw', '--delay': delay, '--dur': '6s' })}
            >
              {glyph}
            </div>
          );
        }
        return (
          <div key={i} className="specter-rise" style={vars({ left: `${lane}%`, '--delay': delay })}>
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
 * Quiet: two still ghosts. Subtle: one ghost rises once. Immersive: a pulse
 * on the selected card (see selectedCardFx), an edge vignette, and three
 * ghosts drifting across. Parent keys this by level so each choice replays.
 */
export function LevelFx({ level }: { level: Level }) {
  const reduce = usePrefersReducedMotion();
  if (reduce || level === 'quiet') {
    return <AmbientGhosts count={2} kind="fly" still />;
  }
  if (level === 'subtle') {
    return <AmbientGhosts count={1} kind="rise" still={false} />;
  }
  return (
    <>
      <div aria-hidden="true" className="specter-vignette" />
      <AmbientGhosts count={3} kind="fly" still={false} />
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
