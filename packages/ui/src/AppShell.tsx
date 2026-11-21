import type { ReactNode } from 'react';
import { Icon, IconButton } from './primitives';
import { Logo } from './components';

/**
 * Layout for full-page surfaces (Graveyard, Options, Onboarding, Help): logo,
 * page title, and a "?" help button (FR-SURF-08). The side panel uses
 * PanelHeader and PanelNav instead.
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
    <div className="min-h-full bg-bg text-fg">
      <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-3">
        <div className="flex items-center gap-4">
          <Logo />
          <span aria-hidden="true" className="h-6 w-px bg-line" />
          <h1 className="font-display text-h3 font-semibold text-fg">{title}</h1>
        </div>
        {onHelp ? (
          <IconButton label="Open Help Center" onClick={onHelp}>
            <Icon name="help" />
          </IconButton>
        ) : null}
      </header>
      <main className="mx-auto max-w-[960px] p-6">{children}</main>
    </div>
  );
}
