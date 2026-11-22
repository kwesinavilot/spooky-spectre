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
  Toggle,
  type PanelTab,
} from '@specter/ui';
import { useSidePanel, type SidePanelTab } from '../../src/store/sidepanel';
import { openTab } from '../../src/nav';
import { getPrefs, setPrefs } from '../../src/prefs';
import { PageTab } from './PageTab';
import { FindingsTab } from './FindingsTab';
import { AskTab } from './AskTab';

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

function SettingsBody() {
  const [readLinked, setReadLinked] = useState(false);
  useEffect(() => {
    getPrefs().then((p) => setReadLinked(p.readLinkedPolicies));
  }, []);
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-fg">No account. Everything stays on this device.</p>
          <Chip variant="ok">Private</Chip>
        </div>
      </Card>
      <Card>
        <h3 className="mb-2 text-h4 font-semibold">Privacy</h3>
        <Toggle
          label="Read linked policies automatically"
          description="When you analyze a page that only links to its terms, Specter opens that one page without your cookies. Nothing is stored."
          checked={readLinked}
          onChange={(next) => {
            setReadLinked(next);
            void setPrefs({ readLinkedPolicies: next });
          }}
        />
      </Card>
      <Card>
        <p className="text-small text-muted">Site access, excluded sites and your data are in Options.</p>
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
