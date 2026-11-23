import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  PanelHeader,
  PanelNav,
  Segmented,
  Toggle,
  type PanelTab,
} from '@specter/ui';
import { DEFAULT_EXCLUDED_DOMAINS, shouldAnalyze } from '@specter/core';
import { useSidePanel, type SidePanelTab } from '../../src/store/sidepanel';
import { openTab } from '../../src/nav';
import { getPrefs, setPrefs, type SpecterPrefs } from '../../src/prefs';
import { sendToTab } from '../../src/messaging';
import { PageTab } from './PageTab';
import { FindingsTab } from './FindingsTab';
import { AskTab } from './AskTab';
import { AiConnectivity } from './AiConnectivity';

type NavId = SidePanelTab | 'history';

const TABS: PanelTab<NavId>[] = [
  { id: 'page', label: 'Page', icon: 'page' },
  { id: 'findings', label: 'Findings', icon: 'list' },
  { id: 'ask', label: 'Ask', icon: 'chat' },
  { id: 'history', label: 'History', icon: 'history' },
];

/**
 * Side panel shell (design steering 6C): header, scrolling body, bottom nav.
 * History opens the Graveyard in a new tab and leaves the panel as it was.
 * Tab bodies stay mounted while hidden, so each keeps its state.
 */
export default function App() {
  const tab = useSidePanel((s) => s.tab);
  const drill = useSidePanel((s) => s.drill);
  const setTab = useSidePanel((s) => s.setTab);
  const openDrill = useSidePanel((s) => s.openDrill);
  const back = useSidePanel((s) => s.back);

  // "Open in Specter" on the page asks the panel to show the Findings tab.
  useEffect(() => {
    const listener = (raw: unknown) => {
      const m = raw as { type?: string };
      if (m.type === 'focus-finding') useSidePanel.getState().setTab('findings');
      return false;
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const onNav = (id: NavId) => {
    if (id === 'history') openTab('graveyard');
    else setTab(id);
  };

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      {drill ? (
        <DrillIn title={drill === 'settings' ? 'Settings' : 'AI connectivity'} onBack={back}>
          {drill === 'settings' ? <SettingsBody /> : <AiConnectivity />}
        </DrillIn>
      ) : (
        <PanelHeader
          actions={
            <>
              <IconButton label="AI connectivity" onClick={() => openDrill('ai')}>
                <Icon name="key" />
              </IconButton>
              <IconButton label="Settings and profile" onClick={() => openDrill('settings')}>
                <Icon name="user" />
              </IconButton>
            </>
          }
        />
      )}
      <main className="flex-1 overflow-y-auto p-4" hidden={drill !== null}>
        <section hidden={tab !== 'page'} aria-label="Page">
          <PageTab />
        </section>
        <section hidden={tab !== 'findings'} aria-label="Findings">
          <FindingsTab />
        </section>
        <section hidden={tab !== 'ask'} aria-label="Ask">
          <AskTab />
        </section>
      </main>
      {drill ? null : <PanelNav tabs={TABS} active={tab} onChange={onNav} />}
    </div>
  );
}

function DrillIn({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  // Drill-in screens move focus to the screen heading (design steering section 9).
  useEffect(() => {
    const h = wrap.current?.querySelector('h2') as HTMLElement | null;
    h?.setAttribute('tabindex', '-1');
    h?.focus();
  }, [title]);
  return (
    <>
      <div ref={wrap}>
        <PanelHeader title={title} onBack={onBack} />
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </>
  );
}

const EFFECT_OPTIONS: { value: SpecterPrefs['effectLevel']; label: string }[] = [
  { value: 'immersive', label: 'Immersive' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'quiet', label: 'Quiet' },
];

const EFFECT_NOTE: Record<SpecterPrefs['effectLevel'], string> = {
  immersive: 'Edge shading, pulsing outlines and ghosts that drift once during a moment of agreement.',
  subtle: 'Outlines pulse once and a ghost marker rises beside each clause. Recommended.',
  quiet: 'Outlines and ghost markers stay still. Nothing moves.',
};

/** Accepts "example.com", "www.example.com/terms" or "https://example.com". Returns the bare host, or null. */
export function normalizeDomain(input: string): string | null {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split(/[/?#]/)[0]!
    .split(':')[0]!
    .replace(/^www\./, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

/**
 * Settings drill-in (Spec 6 task 16; design steering 6C). Reads and writes the chrome.storage preferences
 * the page reads, so a change reaches the next analysis and the next page load. Built-in excluded sites
 * cannot be removed.
 */
function SettingsBody() {
  const [prefs, setLocal] = useState<SpecterPrefs | null>(null);
  const [tabInfo, setTabInfo] = useState<{ id: number; host: string | null } | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPrefs().then(setLocal);
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
      if (t?.id === undefined) return;
      let host: string | null = null;
      try {
        host = t.url ? new URL(t.url).hostname : null;
      } catch {
        host = null;
      }
      setTabInfo({ id: t.id, host });
    });
  }, []);

  if (!prefs) {
    return (
      <p className="text-muted" aria-live="polite">
        Loading settings.
      </p>
    );
  }

  const update = async (patch: Partial<SpecterPrefs>) => {
    setLocal(await setPrefs(patch));
  };

  // Built-in exclusions always stay in the list, even if the stored list was edited elsewhere.
  const builtIn: string[] = [...DEFAULT_EXCLUDED_DOMAINS];
  const userDomains = prefs.excludedDomains.filter((d) => !builtIn.includes(d));
  const host = tabInfo?.host ?? null;
  const siteBuiltIn = host !== null && !shouldAnalyze(host, builtIn);
  const siteExcluded = host !== null && !shouldAnalyze(host, prefs.excludedDomains);
  const sitePaused = host !== null && prefs.pausedDomains.includes(host);

  const toggleSite = async (on: boolean) => {
    if (!host) return;
    const rest = prefs.pausedDomains.filter((d) => d !== host);
    await update({ pausedDomains: on ? rest : [...rest, host] });
    // Pausing stops the markers and outline already on this page. Detection stops on the next load.
    if (!on && tabInfo) void sendToTab(tabInfo.id, { type: 'clear-highlight' });
  };

  const addDomain = async () => {
    const d = normalizeDomain(draft);
    if (!d) {
      setError('Enter a site name such as example.com.');
      return;
    }
    if (prefs.excludedDomains.includes(d)) {
      setError(`${d} is already excluded.`);
      return;
    }
    await update({ excludedDomains: [...builtIn, ...userDomains, d] });
    setDraft('');
    setError(null);
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-fg">No account. Everything stays on this device.</p>
          <Chip variant="ok">Private</Chip>
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 text-h4 font-semibold">Appearance</h3>
        <p className="mb-2 text-small text-muted">Effect level</p>
        <Segmented
          label="Effect level"
          options={EFFECT_OPTIONS}
          value={prefs.effectLevel}
          onChange={(v) => void update({ effectLevel: v })}
        />
        <p className="mt-2 text-caption text-muted">{EFFECT_NOTE[prefs.effectLevel]}</p>
        <div className="mt-4">
          <Toggle
            label="Respect system reduced motion"
            description="When your system asks for reduced motion, Specter uses the Quiet look. Turn this off to keep the effect level you chose."
            checked={prefs.respectReducedMotion}
            onChange={(next) => void update({ respectReducedMotion: next })}
          />
        </div>
        <p className="mt-3 text-caption text-muted">Theme: dark. Light theme later.</p>
      </Card>

      <Card>
        <h3 className="mb-2 text-h4 font-semibold">This site</h3>
        {host === null ? (
          <p className="text-small text-muted">Open a web page to change Specter's settings for that site.</p>
        ) : siteBuiltIn ? (
          <p className="text-small text-muted">
            <span className="font-mono text-fg">{host}</span> is excluded by default (banks, health and email).
            Specter does not read these sites.
          </p>
        ) : siteExcluded ? (
          <p className="text-small text-muted">
            <span className="font-mono text-fg">{host}</span> is on your excluded list. Remove it below to turn Specter
            on here.
          </p>
        ) : (
          <Toggle
            label="Specter on this site"
            description={`${host}. Changes apply when the page next loads.`}
            checked={!sitePaused}
            onChange={(next) => void toggleSite(next)}
          />
        )}
      </Card>

      <Card>
        <h3 className="mb-2 text-h4 font-semibold">Excluded sites</h3>
        <p className="text-small text-muted">Specter never reads these sites, including their subdomains.</p>

        <h4 className="mt-3 text-small font-semibold text-fg">Built in</h4>
        <ul className="mt-1 space-y-1">
          {builtIn.map((d) => (
            <li key={d} className="flex items-center justify-between gap-2">
              <span className="font-mono text-small text-muted">{d}</span>
              <Chip>Built in</Chip>
            </li>
          ))}
        </ul>

        <h4 className="mt-3 text-small font-semibold text-fg">Added by you</h4>
        {userDomains.length === 0 ? (
          <p className="mt-1 text-small text-muted">No sites added.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {userDomains.map((d) => (
              <li key={d} className="flex items-center justify-between gap-2">
                <span className="font-mono text-small text-fg">{d}</span>
                <button
                  type="button"
                  aria-label={`Remove ${d} from excluded sites`}
                  onClick={() => void update({ excludedDomains: [...builtIn, ...userDomains.filter((x) => x !== d)] })}
                  className="min-h-[44px] min-w-[44px] rounded-control border border-line px-3 text-small text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ghost"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addDomain();
          }}
        >
          <label htmlFor="exclude-domain" className="block text-small font-semibold text-fg">
            Add a site to exclude
          </label>
          <div className="flex gap-2">
            <input
              id="exclude-domain"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              placeholder="example.com"
              autoComplete="off"
              aria-invalid={error !== null}
              aria-describedby={error ? 'exclude-domain-error' : undefined}
              className="min-h-[44px] min-w-0 flex-1 rounded-control border border-line bg-inset px-3 font-mono text-small text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ghost"
            />
            <Button variant="secondary" type="submit">
              Add
            </Button>
          </div>
          {error ? (
            <p id="exclude-domain-error" role="alert" className="text-caption text-high-text">
              {error}
            </p>
          ) : null}
        </form>
      </Card>

      <Card>
        <Toggle
          label="Read linked policies automatically"
          description="When you analyze a page that only links to its terms, Specter opens that one page without your cookies. Nothing is stored."
          checked={prefs.readLinkedPolicies}
          onChange={(next) => void update({ readLinkedPolicies: next })}
        />
      </Card>

      <Card>
        <p className="text-small text-muted">Site access and your data are in Options.</p>
        <Button className="mt-3" variant="secondary" onClick={() => openTab('options')}>
          Open Options
        </Button>
      </Card>
    </div>
  );
}
