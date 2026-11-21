import { useEffect, useState } from 'react';
import { Button, Chip, Icon, IconButton, Link, Logo } from '@specter/ui';
import { describePage, type PageInfo } from '../../src/pageInfo';
import { openTab } from '../../src/nav';

/**
 * Toolbar popup (design steering 6B). Opening it from the toolbar grants
 * activeTab for the current tab, so the side panel it opens can read the page
 * when the user asks. Detection state arrives with Spec 2 Phase 5; until then
 * the popup says plainly that the page has not been checked.
 */
export default function App() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setTabId(tab?.id ?? null);
      setInfo(describePage(tab?.url));
    });
  }, []);

  // sidePanel.open must run inside the click handler (a user gesture), so the
  // tab id is looked up ahead of time.
  const openSpecter = () => {
    if (tabId === null) return;
    chrome.sidePanel.open({ tabId }).then(() => window.close());
  };

  return (
    <div className="bg-surface text-fg">
      <header className="flex items-center justify-between border-b border-line p-3">
        <Logo size={24} />
        <IconButton label="Settings" onClick={() => openTab('options')}>
          <Icon name="settings" />
        </IconButton>
      </header>

      <main className="space-y-3 p-4" aria-live="polite">
        {info ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-small text-muted">{info.host || 'This page'}</span>
              <StatusChip info={info} />
            </div>
            <Body info={info} />
            {info.access === 'supported' ? (
              <Button block onClick={openSpecter} disabled={tabId === null}>
                Open Specter
              </Button>
            ) : null}
            {info.access === 'excluded' ? (
              <Button block variant="secondary" onClick={() => openTab('options')}>
                Manage excluded sites
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-muted">Checking this tab.</p>
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-line px-4 py-1 text-caption text-muted">
        <span>On-device</span>
        <span className="flex gap-3">
          <Link href="#" onClick={(e) => { e.preventDefault(); openTab('graveyard'); }}>
            Graveyard
          </Link>
          <Link href="#" onClick={(e) => { e.preventDefault(); openTab('help'); }}>
            Help
          </Link>
        </span>
      </footer>
    </div>
  );
}

function StatusChip({ info }: { info: PageInfo }) {
  if (info.access === 'excluded') return <Chip>Excluded</Chip>;
  if (info.access === 'unsupported') return <Chip>Unsupported page</Chip>;
  return <Chip>Not checked</Chip>;
}

function Body({ info }: { info: PageInfo }) {
  if (info.access === 'excluded') {
    return (
      <div>
        <h1 className="text-h3 font-semibold">Specter is off on this site</h1>
        <p className="text-small text-muted">
          This site is on your excluded list, so Specter does not read it.
        </p>
      </div>
    );
  }
  if (info.access === 'unsupported') {
    return (
      <div>
        <h1 className="text-h3 font-semibold">Specter can't read this page</h1>
        <p className="text-small text-muted">{info.reason}</p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-h3 font-semibold">Nothing has been read yet</h1>
      <p className="text-small text-muted">
        Open Specter to look for agreements on this page. Nothing is sent anywhere unless you analyze.
      </p>
    </div>
  );
}
