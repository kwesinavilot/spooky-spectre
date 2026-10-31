import { AppShell, Card, SearchField, StatCard } from '@specter/ui';
import { openTab } from '../../src/nav';

export default function App() {
  return (
    <AppShell title="The Graveyard" onHelp={() => openTab('help')}>
      <div className="space-y-4">
        <SearchField placeholder="Search your agreements" />
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Saved agreements" value="0" />
          <StatCard label="Trials ending soon" value="0" />
          <StatCard label="Policies changed" value="0" />
        </div>
        <Card>
          <p className="text-specter-muted">
            No saved agreements yet. Save one from the side panel.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
