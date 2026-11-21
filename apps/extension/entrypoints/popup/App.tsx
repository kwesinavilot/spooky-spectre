import { useEffect, useState } from 'react';
import { Button, Chip, Icon, IconButton, Link, Logo, Toggle } from '@specter/ui';
import { describePage, type PageInfo } from '../../src/pageInfo';
import { openTab } from '../../src/nav';
import { sendMessage, type TabState } from '../../src/messaging';
import { DEFAULT_PREFS, getPrefs, setPrefs, type SpecterPrefs } from '../../src/prefs';
import { disableSite, enableSite, hasBackgroundAccess, hasSiteAccess } from '../../src/access';
import { kindsSentence } from '../../src/labels';

interface Tab {
  id: number;
  url: string;
}

/**
 * Toolbar popup (design steering 6B). Opening it grants activeTab for the
 * current tab, so the side panel it opens can read the page when asked.
 */
export default function App() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [state, setState] = useState<TabState | null>(null);
  const [prefs, setPrefsState] = useState<SpecterPrefs>(DEFAULT_PREFS);
  const [background, setBackground] = useState(false);
  const [siteAccess, setSiteAccess] = useState(false);

  useEffect(() => {
    (async () => {
      const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
      const p = await getPrefs();
      setPrefsState(p);
      const pageInfo = describePage(t?.url, p.excludedDomains);
      setInfo(pageInfo);
      if (t?.id === undefined || !t.url) return;
      setTab({ id: t.id, url: t.url });
      setBackground(await hasBackgroundAccess());
      if (pageInfo.access === 'supported') setSiteAccess(await hasSiteAccess(t.url));
      const reply = await sendMessage({ type: 'get-tab-state', tabId: t.id });
      if (reply?.type === 'tab-state') setState(reply.state);
    })();
  }, []);

  const paused = info !== null && prefs.pausedDomains.includes(info.host);
  const siteOn = !paused && (background || siteAccess);

  // sidePanel.open must run inside the click (a user gesture).
  const openSpecter = () => {
    if (!tab) return;
    chrome.sidePanel.open({ tabId: tab.id }).then(() => window.close());
  };

  const toggleSite = async (next: boolean) => {
    if (!tab || !info) return;
    if (background) {
      // With background detection on, "off" pauses this one site.
      const pausedDomains = next
        ? prefs.pausedDomains.filter((d) => d !== info.host)
        : [...new Set([...prefs.pausedDomains, info.host])];
      setPrefsState(await setPrefs({ pausedDomains }));
    } else if (next) {
      setSiteAccess(await enableSite(tab.url));
    } else {
      await disableSite(tab.url);
      setSiteAccess(false);
    }
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
              <StatusChip info={info} state={state} paused={paused} />
            </div>
            <Body info={info} state={state} paused={paused} />
            {info.access === 'supported' && !paused ? (
              <Button block onClick={openSpecter} disabled={!tab}>
                Open Specter
              </Button>
            ) : null}
            {info.access === 'supported' ? (
              <Toggle
                label="Specter on this site"
                description={background ? 'Background detection is on.' : 'Lets Specter check this site when it loads.'}
                checked={siteOn}
                onChange={(next) => void toggleSite(next)}
              />
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
        <span>{state?.result ? 'Last scan: on-device' : 'On-device'}</span>
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

function StatusChip({ info, state, paused }: { info: PageInfo; state: TabState | null; paused: boolean }) {
  if (info.access === 'excluded') return <Chip>Excluded</Chip>;
  if (info.access === 'unsupported') return <Chip>Unsupported page</Chip>;
  if (paused) return <Chip>Paused</Chip>;
  if (state?.result && state.result.kinds.length > 0) return <Chip variant="medium">Review available</Chip>;
  if (state?.result) return <Chip>Quiet</Chip>;
  return <Chip>Not checked</Chip>;
}

function Body({ info, state, paused }: { info: PageInfo; state: TabState | null; paused: boolean }) {
  if (info.access === 'excluded') {
    return (
      <div>
        <h1 className="text-h3 font-semibold">Specter is off on this site</h1>
        <p className="text-small text-muted">This site is on your excluded list, so Specter does not read it.</p>
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
  if (paused) {
    return (
      <div>
        <h1 className="text-h3 font-semibold">Paused on this site</h1>
        <p className="text-small text-muted">Turn Specter back on below when you want it to look here.</p>
      </div>
    );
  }
  if (state?.result && state.result.kinds.length > 0) {
    return (
      <div>
        <h1 className="text-h3 font-semibold">Agreement detected</h1>
        <p className="text-small text-muted">
          {kindsSentence(state.result.kinds)}. Open Specter to review it. Nothing has been sent anywhere.
        </p>
      </div>
    );
  }
  if (state?.result) {
    return (
      <div>
        <h1 className="text-h3 font-semibold">Nothing found</h1>
        <p className="text-small text-muted">Specter found no agreement on this page.</p>
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
