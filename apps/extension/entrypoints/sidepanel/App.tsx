import { AppShell, Button, Card, Tabs } from '@specter/ui';
import { useSidePanel, type SidePanelTab } from '../../src/store/sidepanel';
import { openTab } from '../../src/nav';

export default function App() {
  const status = useSidePanel((s) => s.status);
  const activeTab = useSidePanel((s) => s.activeTab);
  const setActiveTab = useSidePanel((s) => s.setActiveTab);
  const setStatus = useSidePanel((s) => s.setStatus);

  return (
    <AppShell title="Specter" onHelp={() => openTab('help')}>
      {status === 'idle' ? (
        <div className="space-y-4">
          <p className="text-muted">No agreement detected on this page.</p>
          <Button onClick={() => setStatus('analyzing')}>Analyze this page anyway</Button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Button variant="ghost" onClick={() => setStatus('idle')}>
              Back
            </Button>
          </div>
          <Tabs
            tabs={[
              { id: 'findings', label: 'Findings' },
              { id: 'evidence', label: 'Evidence' },
              { id: 'ask', label: 'Ask Specter' },
            ]}
            active={activeTab}
            onChange={(id) => setActiveTab(id as SidePanelTab)}
          />
          <Card className="mt-4">
            <p className="text-muted">
              {activeTab === 'ask'
                ? 'Ask Specter about the clauses on this page.'
                : 'No findings yet.'}
            </p>
          </Card>
        </>
      )}
    </AppShell>
  );
}