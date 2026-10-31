import { AppShell, Button } from '@specter/ui';
import { openTab } from '../../src/nav';

export default function App() {
  return (
    <AppShell title="Welcome" onHelp={() => openTab('help')}>
      <div className="space-y-6 py-10 text-center">
        <h2 className="font-display text-3xl text-specter-text">
          See what haunts your digital life.
        </h2>
        <p className="mx-auto max-w-md text-specter-muted">
          Specter reads the agreements you are about to accept, shows the clauses that matter,
          and remembers what changed.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => openTab('graveyard')}>Begin</Button>
          <Button variant="ghost" onClick={() => openTab('help')}>
            How Specter works
          </Button>
        </div>
        <p className="text-xs text-specter-muted">The full seven-screen flow arrives in Spec 7.</p>
      </div>
    </AppShell>
  );
}
