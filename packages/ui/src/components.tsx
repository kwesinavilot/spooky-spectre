import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Icon, focusRing, type IconName } from './primitives';

/* Components from design steering section 3. */

export type ChipVariant = 'neutral' | 'ghost' | 'high' | 'medium' | 'ok';

const CHIP_VARIANTS: Record<ChipVariant, string> = {
  neutral: 'border-muted text-muted',
  ghost: 'border-ghost text-ghost',
  // The base red is too dark for small text, so high chips use --high-text.
  high: 'border-high-text text-high-text',
  medium: 'border-medium text-medium',
  ok: 'border-ok text-ok',
};

/** Status chip: pill, 12px 600, text and border the same color. Always contains text. */
export function Chip({
  variant = 'neutral',
  className,
  children,
}: {
  variant?: ChipVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-caption font-semibold',
        CHIP_VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Switch: real <button role="switch">, 52x44 hit area, 44x26 track, visible label beside it. */
export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-body text-fg">{label}</p>
        {description ? <p className="text-caption text-muted">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'inline-flex h-11 w-[52px] shrink-0 items-center justify-center rounded-control disabled:opacity-50',
          focusRing,
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'relative h-[26px] w-11 rounded-full border transition-colors duration-100',
            checked ? 'border-lavender bg-lavender' : 'border-muted bg-transparent',
          )}
        >
          <span
            className={clsx(
              'absolute top-[3px] h-[18px] w-[18px] rounded-full transition-transform duration-100',
              checked ? 'translate-x-[21px] bg-fg' : 'translate-x-[3px] bg-muted',
            )}
          />
        </span>
      </button>
    </div>
  );
}

/** Radio option inside a bordered row. Selected: 1px --ghost border plus inset ring. */
export function OptionCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: ReactNode;
  description?: string;
}) {
  return (
    <label
      className={clsx(
        'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-control border p-3',
        checked ? 'border-ghost ring-1 ring-inset ring-ghost' : 'border-line',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className={clsx('mt-1 h-4 w-4 accent-[#C7A7FF]', focusRing)}
      />
      <span>
        <span className="block text-body font-semibold text-fg">{title}</span>
        {description ? <span className="block text-small text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

/**
 * Segmented control (Immersive / Subtle / Quiet). The steering asks for 40px
 * segments; they are 44px here so every target meets the 44px minimum.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col gap-1 rounded-control border border-line p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'min-h-[44px] rounded-[9px] px-3 text-small font-semibold',
            value === o.value ? 'bg-surface-2 text-fg ring-1 ring-inset ring-ghost' : 'text-muted',
            focusRing,
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Source quote with the matched passage in <mark>. Always rendered as text,
 * never HTML (design steering section 10). `mark` is [start, end) in `text`.
 */
export function SourceQuote({
  text,
  mark,
  cite,
}: {
  text: string;
  mark?: [number, number];
  cite?: string;
}) {
  const [start, end] = mark ?? [0, 0];
  const hasMark = mark !== undefined && end > start;
  return (
    <figure className="rounded-quote border border-line bg-inset p-3">
      <blockquote className="font-mono text-small text-fg">
        {hasMark ? (
          <>
            {text.slice(0, start)}
            <mark className="rounded-[3px] bg-[rgba(199,167,255,.22)] text-fg ring-1 ring-[rgba(199,167,255,.55)]">
              {text.slice(start, end)}
            </mark>
            {text.slice(end)}
          </>
        ) : (
          text
        )}
      </blockquote>
      {cite ? <figcaption className="mt-2 text-caption text-muted">{cite}</figcaption> : null}
    </figure>
  );
}

export interface DiffSegment {
  kind: 'same' | 'removed' | 'added';
  text: string;
}

/** Diff text: removed is struck through, added is underlined, so shape carries meaning, not only color. */
export function DiffText({ segments }: { segments: DiffSegment[] }) {
  return (
    <p className="text-body text-fg">
      {segments.map((s, i) =>
        s.kind === 'removed' ? (
          <del key={i} className="bg-[rgba(220,70,103,.2)] line-through">
            <span className="sr-only">Removed: </span>
            {s.text}
          </del>
        ) : s.kind === 'added' ? (
          <ins key={i} className="bg-[rgba(101,189,166,.2)] underline">
            <span className="sr-only">Added: </span>
            {s.text}
          </ins>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
  );
}

export type StepState = 'done' | 'running' | 'waiting';

/** Progress stepper: 6px bar plus a step list. Announced politely to screen readers. */
export function ProgressStepper({
  steps,
  reduceMotion = false,
}: {
  steps: { label: string; state: StepState; detail?: string }[];
  reduceMotion?: boolean;
}) {
  const done = steps.filter((s) => s.state === 'done').length;
  const pct = steps.length === 0 ? 0 : Math.round((done / steps.length) * 100);
  return (
    <div aria-live="polite">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 w-full overflow-hidden rounded-full bg-inset"
      >
        <div
          className={clsx('h-full rounded-full bg-ghost', !reduceMotion && 'transition-[width] duration-200')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={clsx(
                'inline-flex h-5 w-5 items-center justify-center rounded-full border',
                s.state === 'done' && 'border-ok text-ok',
                s.state === 'running' && 'border-dashed border-ghost',
                s.state === 'waiting' && 'border-muted',
              )}
            >
              {s.state === 'done' ? <Icon name="check" size={14} /> : null}
            </span>
            <span
              className={clsx(
                'flex-1 text-body',
                s.state === 'running' ? 'font-semibold text-fg' : s.state === 'done' ? 'text-fg' : 'text-muted',
              )}
            >
              {s.label}
              <span className="sr-only">
                {s.state === 'done' ? ' (done)' : s.state === 'running' ? ' (in progress)' : ' (waiting)'}
              </span>
            </span>
            {s.detail ? <span className="text-caption text-muted">{s.detail}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Eyebrow label: 12px, 600, uppercase, wide tracking, --ghost (design steering section 2). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-caption font-semibold uppercase tracking-[0.14em] text-ghost">{children}</p>;
}

/**
 * Fake browser frame (three dots and a mono URL) for onboarding and demo
 * imagery only, never in the real UI (design steering section 3).
 */
export function MiniChrome({
  url,
  actions,
  children,
  className,
}: {
  url: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={clsx('overflow-hidden rounded-card border border-line bg-surface', className)}>
      <div className="flex items-center gap-3 border-b border-line bg-inset px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-line" />
          <span className="h-3 w-3 rounded-full bg-line" />
          <span className="h-3 w-3 rounded-full bg-line" />
        </span>
        <span className="flex-1 truncate font-mono text-small text-muted">{url}</span>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Logo: ghost glyph in --ghost beside the word "Specter" in Fraunces. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-ghost">
      <Icon name="ghost" size={size} />
      <span className="font-display text-h3 font-semibold text-fg">Specter</span>
    </span>
  );
}

/** Side panel header: title or logo on the left, icon buttons on the right. */
export function PanelHeader({
  title,
  onBack,
  actions,
}: {
  title?: string;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-line p-3.5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={clsx(
            'inline-flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-fg',
            focusRing,
          )}
        >
          <Icon name="back" />
        </button>
      ) : null}
      <div className="flex-1">{title ? <h2 className="text-h3 font-semibold text-fg">{title}</h2> : <Logo />}</div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export interface PanelTab<T extends string> {
  id: T;
  label: string;
  icon: IconName;
}

/** Bottom nav: equal tabs, 64px high. Active tab: --ghost text and a 2px inset top line. */
export function PanelNav<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: PanelTab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav aria-label="Specter sections" className="border-t border-line bg-surface">
      <div role="tablist" className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={clsx(
                'flex h-16 flex-col items-center justify-center gap-1 text-caption font-semibold',
                isActive ? 'text-ghost shadow-[inset_0_2px_0_0_#C7A7FF]' : 'text-muted hover:text-fg',
                focusRing,
              )}
            >
              <Icon name={t.icon} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
