import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  InsetCard,
  PanelHeader,
  PanelNav,
  type PanelTab,
} from '@specter/ui';
import { useSidePanel, type SidePanelTab } from '../../src/store/sidepanel';
import { describePage, type PageInfo } from '../../src/pageInfo';
import { openTab } from '../../src/nav';

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
 * Drill-in screens replace the body, show a back arrow and take focus.
 */
export default function App() {
  const tab = useSidePanel((s) => s.tab);
  const drill = useSidePanel((s) => s.drill);
  const setTab = useSidePanel((s) => s.setTab);
  const openDrill = useSidePanel((s) => s.openDrill);
  const back = useSidePanel((s) => s.back);

  const onNav = (id: NavId) => {
    if (id === 'history') openTab('graveyard');
    else setTab(id);
  };

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      {drill ? (
        <DrillIn title={drill === 'settings' ? 'Settings' : 'AI connectivity'} onBack={back}>
          {drill === 'settings' ? <SettingsBody /> : <AiBody />}
        </DrillIn>
      ) : (
        <>
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
          <main className="flex-1 overflow-y-auto p-4">
            {tab === 'page' ? <PageTab /> : tab === 'findings' ? <FindingsTab /> : <AskTab />}
          </main>
          <PanelNav tabs={TABS} active={tab} onChange={onNav} />
        </>
      )}
    </div>
  );
}

function DrillIn({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const heading = useRef<HTMLDivElement>(null);
  // Drill-in screens move focus to the screen heading (design steering section 9).
  useEffect(() => {
    heading.current?.querySelector('h2')?.setAttribute('tabindex', '-1');
    (heading.current?.querySelector('h2') as HTMLElement | null)?.focus();
  }, [title]);
  return (
    <>
      <div ref={heading}>
        <PanelHeader title={title} onBack={onBack} />
      </div>
      <main className="flex-1 overflow-y-auto p-4">{children}</main>
    </>
  );
}

function usePageInfo(): PageInfo | null {
  const [info, setInfo] = useState<PageInfo | null>(null);
  useEffect(() => {
    const load = () =>
      chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => setInfo(describePage(t?.url)));
    load();
    const onActivated = () => load();
    chrome.tabs.onActivated.addListener(onActivated);
    return () => chrome.tabs.onActivated.removeListener(onActivated);
  }, []);
  return info;
}

function PageTab() {
  const info = usePageInfo();
  if (!info) return <p className="text-muted">Checking this tab.</p>;
  return (
    <div className="space-y-3">
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-small text-muted">{info.host || 'This page'}</span>
          {info.access === 'excluded' ? (
            <Chip>Excluded</Chip>
          ) : info.access === 'unsupported' ? (
            <Chip>Unsupported page</Chip>
          ) : (
            <Chip>Quiet</Chip>
          )}
        </div>
        {info.access === 'excluded' ? (
          <>
            <h3 className="text-h3 font-semibold">Specter is turned off on this site</h3>
            <p className="mt-1 text-small text-muted">This site is on your excluded list.</p>
            <Button className="mt-3" variant="secondary" onClick={() => openTab('options')}>
              Manage excluded sites
            </Button>
          </>
        ) : info.access === 'unsupported' ? (
          <>
            <h3 className="text-h3 font-semibold">Specter can't read this page</h3>
            <p className="mt-1 text-small text-muted">{info.reason}</p>
          </>
        ) : (
          <>
            <h3 className="text-h3 font-semibold">No agreement detected on this page.</h3>
            <p className="mt-1 text-small text-muted">Nothing has been read or sent yet.</p>
            {/* Wired to detection and extraction in Spec 2 Phase 5. */}
            <Button className="mt-3" block disabled>
              Analyze this page anyway
            </Button>
          </>
        )}
      </Card>
      <InsetCard>
        <p className="text-caption text-muted">
          On-device scan is free. AI analysis sends selected excerpts to your provider, and only when you ask.
        </p>
      </InsetCard>
    </div>
  );
}

function FindingsTab() {
  return (
    <div className="space-y-3">
      <h2 className="text-h3 font-semibold">Findings</h2>
      <Card>
        <p className="text-muted">No findings yet. Analyze an agreement on the Page tab.</p>
      </Card>
    </div>
  );
}

function AskTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold">Ask Specter</h2>
        <Chip>Not connected</Chip>
      </div>
      <Card>
        <p className="text-fg">Connect an AI model to ask questions</p>
        <p className="mt-1 text-small text-muted">Answers use only the excerpts of this agreement.</p>
        <Button className="mt-3" variant="secondary" onClick={() => useSidePanel.getState().openDrill('ai')}>
          AI connectivity
        </Button>
      </Card>
      <p className="text-caption text-muted">Informational assistance, not legal advice.</p>
    </div>
  );
}

function SettingsBody() {
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-fg">No account. Everything stays on this device.</p>
          <Chip variant="ok">Private</Chip>
        </div>
      </Card>
      <Card>
        <p className="text-small text-muted">
          Effects, privacy, this site and your data move here in Spec 2 Phase 6. For now they are in Options.
        </p>
        <Button className="mt-3" variant="secondary" onClick={() => openTab('options')}>
          Open Options
        </Button>
      </Card>
    </div>
  );
}

function AiBody() {
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-fg">AI model</p>
          <Chip>Not connected</Chip>
        </div>
        <p className="mt-2 text-small text-muted">Provider setup arrives in Spec 4.</p>
      </Card>
      <InsetCard>
        <p className="text-caption text-muted">
          No model or offline? Specter falls back to on-device scanning and labels results as limited.
        </p>
      </InsetCard>
    </div>
  );
}
