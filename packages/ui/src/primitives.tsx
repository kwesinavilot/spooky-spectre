import clsx from 'clsx';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-specter-pale-violet focus-visible:outline-offset-2';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const styles: Record<string, string> = {
    primary: 'bg-specter-violet text-specter-ink hover:opacity-90',
    ghost: 'border border-specter-line text-specter-text hover:bg-specter-panel',
    danger: 'bg-specter-blood text-specter-ink hover:opacity-90',
  };
  return (
    <button
      className={clsx(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 font-medium transition-colors',
        styles[variant],
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export function Link({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={clsx(
        'inline-flex min-h-[44px] items-center text-specter-pale-violet underline-offset-2 hover:underline',
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'min-h-[44px] w-full rounded-md border border-specter-line bg-specter-panel px-3 text-specter-text placeholder:text-specter-muted',
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export function SearchField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="search"
      aria-label="Search"
      className={clsx(
        'min-h-[44px] w-full rounded-md border border-specter-line bg-specter-panel px-3 text-specter-text placeholder:text-specter-muted',
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('rounded-lg border border-specter-line bg-specter-panel p-4', className)}>
      {children}
    </div>
  );
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 font-display text-lg text-specter-text">{title}</h2>
      {children}
    </Card>
  );
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <p className="text-sm text-specter-muted">{label}</p>
      <p className="font-display text-2xl text-specter-text">{value}</p>
    </Card>
  );
}

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
    <div role="tablist" className="flex gap-1 border-b border-specter-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'min-h-[44px] px-3 font-medium',
            active === t.id
              ? 'border-b-2 border-specter-violet text-specter-pale-violet'
              : 'text-specter-muted',
            focusRing,
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className={clsx(
        'inline-flex h-11 w-11 items-center justify-center rounded-md text-specter-text hover:bg-specter-panel',
        focusRing,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const ICON_PATHS: Record<string, ReactNode> = {
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7" />
    </>
  ),
  ghost: <path d="M5 21V10a7 7 0 0 1 14 0v11l-2.5-1.8L14 21l-2-1.8L10 21l-2.5-1.8L5 21z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icon({
  name,
  label,
  size = 20,
}: {
  name: keyof typeof ICON_PATHS;
  label: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
