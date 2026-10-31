import { AppShell, Button, SectionCard, TextInput } from '@specter/ui';
import { useSettings } from '../../src/store/settings';
import { openTab } from '../../src/nav';
import { DEFAULT_EXCLUDED_DOMAINS } from '@specter/core';

export default function App() {
  const providerId = useSettings((s) => s.providerId);
  const setProviderId = useSettings((s) => s.setProviderId);

  return (
    <AppShell title="Options" onHelp={() => openTab('help')}>
      <div className="space-y-4">
        <SectionCard title="AI provider">
          <p className="mb-2 text-specter-muted">
            Choose a provider and add your key. The key stays only in this browser.
          </p>
          <TextInput
            value={providerId ?? ''}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="anthropic, openai, google, ollama, or none"
          />
        </SectionCard>
        <SectionCard title="Haunting level">
          <p className="text-specter-muted">Immersive, Subtle, or Quiet (set up in onboarding).</p>
        </SectionCard>
        <SectionCard title="Site access">
          <p className="text-specter-muted">
            Ask me on each site (default). Chrome asks for permission when needed.
          </p>
        </SectionCard>
        <SectionCard title="Excluded domains">
          <ul className="list-inside list-disc text-specter-muted">
            {DEFAULT_EXCLUDED_DOMAINS.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Data export">
          <Button variant="ghost">Export (JSON)</Button>
        </SectionCard>
        <SectionCard title="Delete all">
          <Button variant="danger">Delete all data</Button>
        </SectionCard>
        <SectionCard title="Replay onboarding">
          <Button variant="ghost" onClick={() => openTab('onboarding')}>
            Replay onboarding
          </Button>
        </SectionCard>
      </div>
    </AppShell>
  );
}
