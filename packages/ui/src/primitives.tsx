import clsx from 'clsx';
import { useId } from 'react';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

/** Focus ring: 2px --ghost, 2px offset, always visible (design steering section 9). */
export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-ghost focus-visible:outline-offset-2';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ghost text-bg hover:opacity-90',
  secondary: 'border border-lavender text-fg hover:bg-surface-2',
  quiet: 'border border-line text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'border border-high text-high-text hover:bg-surface-2',
};

/**
 * Button (design steering section 3): min height 44, radius 12, weight 600.
 * Never put two primary buttons in one view.
 */
export function Button({
  variant = 'primary',
  block = false,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; block?: boolean }) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control px-4 text-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        block && 'w-full',
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

/** Icon-only button: 44x44, radius 12, 1px --line, --muted icon. `label` is required. */
export function IconButton({
  label,
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line text-muted hover:bg-surface-2 hover:text-fg',
        focusRing,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Link({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={clsx(
        'inline-flex min-h-[44px] items-center text-ghost underline-offset-2 hover:underline',
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

const fieldClass =
  'min-h-[44px] w-full rounded-control border border-line bg-inset px-3 text-body text-fg placeholder:text-muted';

/** Text input with a visible label (design steering section 3). Keys use `mono`. */
export function TextInput({
  label,
  hint,
  mono = false,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; mono?: boolean }) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-small font-medium text-fg">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className={clsx(fieldClass, mono && 'font-mono', focusRing, className)}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  className,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className="space-y-1">
      <label htmlFor={selectId} className="block text-small font-medium text-fg">
        {label}
      </label>
      <select id={selectId} className={clsx(fieldClass, focusRing, className)} {...props}>
        {children}
      </select>
    </div>
  );
}

/** Search field with a screen-reader-only label. */
export function SearchField({
  label = 'Search',
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input type="search" className={clsx(fieldClass, focusRing, className)} {...props} />
    </label>
  );
}

export type CardVariant = 'default' | 'high' | 'medium' | 'ok' | 'dashed';

const CARD_BORDERS: Record<CardVariant, string> = {
  default: 'border border-line',
  high: 'border border-high',
  medium: 'border border-medium',
  ok: 'border border-ok',
  dashed: 'border border-dashed border-lavender',
};

/** Card: --surface, 1px border, radius 16, padding 16. Emphasis variants swap the border. */
export function Card({
  variant = 'default',
  className,
  children,
}: {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx('rounded-card bg-surface p-4', CARD_BORDERS[variant], className)}>
      {children}
    </div>
  );
}

/** Inset card: --inset, radius 12. For "what will be sent" previews and fallback notes. */
export function InsetCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('rounded-control bg-inset p-3', className)}>{children}</div>;
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h3 className="mb-3 text-h3 font-semibold text-fg">{title}</h3>
      {children}
    </Card>
  );
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <p className="text-small text-muted">{label}</p>
      <p className="font-display text-h2 text-fg">{value}</p>
    </Card>
  );
}

/** Simple horizontal tabs for full-page surfaces. The side panel uses PanelNav. */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'min-h-[44px] px-3 font-medium',
            active === t.id ? 'border-b-2 border-ghost text-ghost' : 'text-muted',
            focusRing,
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const ICON_PATHS = {
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 16.5h.01" />
    </>
  ),
  ghost: (
    <>
      <path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-1.6L14.3 20 12 18.4 9.7 20l-2.4-1.6L5 20z" />
      <path d="M9.5 11h.01M14.5 11h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8M16 7l2 2M14 9l2 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  page: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M10 13h6M10 17h6" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  ban: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8 8 8 8M16 8l-8 8" />
    </>
  ),
  puzzle: (
    <path d="M9 4h3a2 2 0 1 1 4 0h2v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H6v-4a2 2 0 1 0 0-4V4z" />
  ),
} as const;

export type IconName = keyof typeof ICON_PATHS;

/**
 * Inline stroke icon (design steering section 2): 24px viewBox, stroke 1.8,
 * round caps, no fill, shown at 20px. Decorative unless `label` is given.
 */
export function Icon({ name, label, size = 20 }: { name: IconName; label?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
