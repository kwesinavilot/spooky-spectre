import type { ReactNode } from 'react';
import { Icon } from './primitives';

/**
 * Shared layout for every surface: header with title and a "?" help affordance.
 * The "?" is a real focusable button (FR-SURF-08 / FR-A11Y-01). Surfaces pass an
 * `onHelp` callback so the side panel can open Help in a new tab instead of
 * navigating inside the narrow panel.
 */
export function AppShell({
  title,
  onHelp,
  children,
}: {
  title: string;
  onHelp?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-specter-ink text-specter-text">
      <header className="flex items-center justify-between border-b border-specter-line px-4 py-3">
        <h1 className="font-display text-xl text-specter-text">{title}</h1>
        {onHelp ? (
          <button
            type="button"
            onClick={onHelp}
            aria-label="Open Help Center"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-specter-muted hover:bg-specter-panel focus-visible:outline-2 focus-visible:outline-specter-pale-violet focus-visible:outline-offset-2"
          >
            <Icon name="help" label="Open Help Center" />
          </button>
        ) : null}
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
