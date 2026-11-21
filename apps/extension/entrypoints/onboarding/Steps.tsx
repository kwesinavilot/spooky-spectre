import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Chip,
  Eyebrow,
  Icon,
  InsetCard,
  MiniChrome,
  OptionCard,
  Select,
  TextInput,
  Toggle,
  type IconName,
} from '@specter/ui';
import type { SpecterPrefs } from '../../src/prefs';
import { disableBackground, enableBackground } from '../../src/access';
import {
  hasSavedKey,
  PROVIDERS,
  removeKey,
  STATUS_LABEL,
  testConnection,
  type ConnectionStatus,
  type ProviderId,
} from '../../src/aiConnect';
import { useSettings } from '../../src/store/settings';
import type { OnboardingState } from './App';

function Headline({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-h1 font-semibold text-fg outline-none lg:text-[56px] lg:leading-[1.08]">{children}</h1>;
}

function Point({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 text-ghost">
        <Icon name={icon} />
      </span>
      <span>
        <span className="block text-h3 font-semibold text-fg">{title}</span>
        <span className="block text-body text-muted">{children}</span>
      </span>
    </li>
  );
}

/* ---------- 1. Welcome ---------- */

export function Step1({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return (
    <>
      <div className="relative space-y-6">
        <span aria-hidden="true" className="specter-rise pointer-events-none absolute -left-6 -top-10 text-ghost opacity-10">
          <Icon name="ghost" size={160} />
        </span>
        <Eyebrow>Your digital sixth sense</Eyebrow>
        <Headline>Reveal what haunts your digital agreements.</Headline>
        <p className="max-w-[560px] text-[18px] leading-relaxed text-muted">
          Specter reads the terms you are about to accept, surfaces the consequential parts in plain language, and links
          every claim to the exact words on the page.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onStart}>
            Get started <Icon name="arrow" />
          </Button>
          <Button variant="quiet" onClick={onDemo}>
            Try the demo page
          </Button>
        </div>
        <p className="text-body text-muted">No account. Nothing leaves your browser unless you choose to analyze.</p>
      </div>

      <div className="relative">
        <MiniChrome url="streamly.example/terms">
          <p className="text-small text-muted">4.2 Subscription and renewal</p>
          <p className="mt-2 text-body leading-relaxed text-fg">
            Your free trial lasts 14 days.{' '}
            <mark className="rounded-[3px] bg-[rgba(199,167,255,.22)] text-fg ring-2 ring-ghost">
              After the trial ends, your subscription renews automatically at $14.99 per month until you cancel.
            </mark>{' '}
            You may cancel at any time from your account settings, subject to Section 7.
          </p>
          <div className="h-16" />
        </MiniChrome>
        <div aria-hidden="true" className="relative -mt-16 ml-8 rounded-card border border-line bg-surface p-5 shadow-float">
          <div className="flex items-center justify-between gap-2">
            <Chip variant="high">High impact</Chip>
            <Chip variant="ok">
              <Icon name="check" size={14} /> <span className="ml-1">Source verified</span>
            </Chip>
          </div>
          <p className="mt-3 text-h3 font-semibold">Auto-renews after the trial</p>
          <p className="text-body text-muted">May result in recurring charges unless you cancel first.</p>
        </div>
        <p className="sr-only">
          Example: Specter highlights the renewal clause of a fictional streaming service and labels it high impact,
          source verified.
        </p>
      </div>
    </>
  );
}

/* ---------- 2. Privacy promise ---------- */

export function Step2() {
  return (
    <>
      <div className="space-y-8">
        <Eyebrow>Privacy first</Eyebrow>
        <Headline>Specter stays quiet until you ask.</Headline>
        <ul className="space-y-6">
          <Point icon="shield" title="Detection happens on your device">
            Spotting terms links and cookie banners uses simple on-page rules. No page content is uploaded.
          </Point>
          <Point icon="clock" title="No AI runs while you browse">
            AI is off until you connect a provider and ask for an analysis. Showing exactly what will be sent first is
            still being built.
          </Point>
          <Point icon="ban" title="Specter never clicks Accept for you">
            You make every choice with the website's own buttons.
          </Point>
        </ul>
      </div>
      <div className="space-y-5">
        <Card variant="ok" className="p-6">
          <p className="flex items-center gap-3 text-h3 font-semibold">
            <span className="text-ok">
              <Icon name="lock" />
            </span>
            Stays on this device
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-body text-muted">
            <li>Banner and terms detection</li>
            <li>Text extraction and evidence checks</li>
            <li>Saved snapshots and consent ledger</li>
          </ul>
        </Card>
        <Card variant="dashed" className="p-6">
          <p className="flex items-center gap-3 text-h3 font-semibold">
            <span className="text-ghost">
              <Icon name="external" />
            </span>
            Leaves only if you analyze with AI
          </p>
          <p className="mt-3 text-body text-muted">
            Excerpts go to the AI provider you choose, with your own key, and only when you ask. A linked policy page is
            read only during an analysis you started. Skip AI and Specter still works on your device.
          </p>
        </Card>
      </div>
    </>
  );
}

/* ---------- 3. Permissions ---------- */

function PermissionRow({ title, chip, children }: { title: string; chip: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-4 border-t border-line py-4">
      <span>
        <span className="block text-h3 font-semibold">{title}</span>
        <span className="block text-body text-muted">{children}</span>
      </span>
      {chip}
    </li>
  );
}

export function Step3({ background, onBackground }: { background: boolean; onBackground: (on: boolean) => void }) {
  const [explaining, setExplaining] = useState(false);
  const [declined, setDeclined] = useState(false);

  const toggle = async (next: boolean) => {
    setDeclined(false);
    if (next) setExplaining(true);
    else {
      await disableBackground();
      onBackground(false);
    }
  };

  // Runs from the Continue click, so Chrome accepts it as a user gesture.
  const ask = async () => {
    const granted = await enableBackground();
    setExplaining(false);
    setDeclined(!granted);
    onBackground(granted);
  };

  return (
    <>
      <div className="space-y-6">
        <Eyebrow>Permissions</Eyebrow>
        <Headline>Only what Specter needs, when it needs it.</Headline>
        <ul className="border-b border-line">
          <PermissionRow title="Local storage" chip={<Chip variant="ok">At install</Chip>}>
            Keeps your settings and saved snapshots on this device.
          </PermissionRow>
          <PermissionRow title="Side panel" chip={<Chip variant="ok">At install</Chip>}>
            Shows findings next to the page you are reading.
          </PermissionRow>
          <PermissionRow title="Active tab" chip={<Chip variant="ghost">On click</Chip>}>
            Reads the page only when you open Specter or press Analyze.
          </PermissionRow>
          <PermissionRow title="Per-site access" chip={<Chip variant="ghost">Asked later</Chip>}>
            Asked later, one site at a time, unless you choose background detection.
          </PermissionRow>
        </ul>
      </div>

      <div className="space-y-5">
        <p className="text-body text-muted">Example of a later, in-context request</p>
        <div aria-hidden="true" className="rounded-card border border-line bg-surface p-6">
          <p className="flex items-center gap-3 text-h3 font-semibold">
            <span className="text-ghost">
              <Icon name="ghost" />
            </span>
            Allow Specter on streamly.example?
          </p>
          <p className="mt-2 text-body text-muted">
            Specter will read the terms on this site so it can analyze them when you ask. You can revoke this any time in
            Settings.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex min-h-[44px] items-center justify-center rounded-control bg-ghost font-semibold text-bg">
              Allow this time
            </div>
            <div className="flex min-h-[44px] items-center justify-center rounded-control border border-lavender font-semibold">
              Always on this site
            </div>
            <div className="flex min-h-[44px] items-center justify-center rounded-control border border-line font-semibold text-muted">
              Not now
            </div>
          </div>
        </div>
        <p className="sr-only">
          Example of a later request: Specter asks before reading a site, with the choices allow this time, always on this
          site, or not now.
        </p>

        <Card variant="dashed" className="p-5">
          <Toggle
            label="Notice agreements as I browse (optional)"
            description="Shows a dot on the Specter icon when a page has terms or cookie choices. Detection stays on your device."
            checked={background}
            onChange={(next) => void toggle(next)}
          />
          {explaining ? (
            <InsetCard className="mt-4">
              <p className="text-body font-semibold">Before Chrome asks</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-small text-muted">
                <li>Chrome will say Specter can "read and change data on all websites". That is how Chrome words this.</li>
                <li>Detection uses rules on this device and never changes or clicks anything on a page.</li>
                <li>Nothing is sent anywhere until you press Analyze. Banks, health and email sites stay excluded.</li>
                <li>You can turn this off any time in Options or Chrome's extension settings.</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => void ask()}>Continue to Chrome</Button>
                <Button variant="secondary" onClick={() => setExplaining(false)}>
                  Not now
                </Button>
              </div>
            </InsetCard>
          ) : null}
          {declined ? (
            <p role="status" className="mt-3 text-small text-muted">
              No problem. Specter works whenever you open it on a page.
            </p>
          ) : null}
        </Card>
        <p className="text-body text-muted">Specter does not read passwords, payment fields or private messages.</p>
      </div>
    </>
  );
}

/* ---------- 4. Effects and privacy defaults ---------- */

const EFFECTS: { value: SpecterPrefs['effectLevel']; title: string; description: string }[] = [
  {
    value: 'immersive',
    title: 'Immersive',
    description:
      'Ghostly highlights, a pulse around key clauses, and ghosts that drift past when something serious is verified.',
  },
  {
    value: 'subtle',
    title: 'Subtle',
    description: 'A soft edge shimmer, a calm highlight and a ghost marker. Brief and never blocking.',
  },
  {
    value: 'quiet',
    title: 'Quiet',
    description:
      'No animation at all. Plain highlights and still ghosts. Also used if your system asks for reduced motion.',
  },
];

export function Step4({ prefs, onChange }: { prefs: SpecterPrefs; onChange: (p: Partial<SpecterPrefs>) => void }) {
  return (
    <>
      <div className="space-y-6">
        <Eyebrow>Make it yours</Eyebrow>
        <Headline>How haunted should it feel?</Headline>
        <fieldset className="space-y-3">
          <legend className="sr-only">Effect level</legend>
          {EFFECTS.map((e) => (
            <OptionCard
              key={e.value}
              name="effect"
              value={e.value}
              checked={prefs.effectLevel === e.value}
              onChange={(v) => onChange({ effectLevel: v as SpecterPrefs['effectLevel'] })}
              title={
                <span className="flex items-center gap-2">
                  {e.title}
                  {e.value === 'subtle' ? <Chip variant="ghost">Recommended</Chip> : null}
                </span>
              }
              description={e.description}
            />
          ))}
        </fieldset>
      </div>

      <div>
        <h2 className="mb-2 text-h3 font-semibold">Privacy defaults</h2>
        <div className="divide-y divide-line">
          <div className="py-4">
            <Toggle
              label="Ask before analyzing a page"
              description="Specter never analyzes in the background. The preview of what gets sent is coming in a later version."
              checked
              disabled
              onChange={() => {}}
            />
          </div>
          <div className="py-4">
            <Toggle
              label="Detect cookie banners"
              description="On-device only. Specter lists the choices but never picks one."
              checked={prefs.detectCookieBanners}
              onChange={(v) => onChange({ detectCookieBanners: v })}
            />
          </div>
          <div className="py-4">
            <Toggle
              label="Read linked policies automatically"
              description="When a page only links to its terms, Specter opens that one page without your cookies. Nothing is stored."
              checked={prefs.readLinkedPolicies}
              onChange={(v) => onChange({ readLinkedPolicies: v })}
            />
          </div>
          <div className="py-4">
            <Toggle
              label="Offer to log my consent choices"
              description="Only records clicks it clearly observes, or what you enter yourself."
              checked={prefs.offerConsentLog}
              onChange={(v) => onChange({ offerConsentLog: v })}
            />
          </div>
          <div className="py-4">
            <Toggle
              label="Save snapshots only when I choose"
              description="Always on. Nothing is stored unless you press Save."
              checked
              disabled
              onChange={() => {}}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 5. Connect AI (optional) ---------- */

export function Step5({
  state,
  onChange,
  onSkip,
}: {
  state: OnboardingState;
  onChange: (p: Partial<OnboardingState>) => void;
  onSkip: () => void;
}) {
  const [key, setKey] = useState('');
  const [replacing, setReplacing] = useState(false);
  const setProviderId = useSettings((s) => s.setProviderId);
  const provider = PROVIDERS.find((p) => p.id === state.provider)!;
  const showKeyField = provider.needsKey && (!state.keySaved || replacing);

  const chooseProvider = async (id: ProviderId) => {
    setKey('');
    setReplacing(false);
    onChange({ provider: id, aiStatus: 'idle', keySaved: await hasSavedKey(id) });
  };

  // Starts from the click: Chrome asks for access to the provider's address once.
  const test = async () => {
    onChange({ aiStatus: 'testing' });
    const status: ConnectionStatus = await testConnection(state.provider, key);
    const ok = status === 'connected' || status === 'rate_limited';
    if (ok) {
      setProviderId(state.provider);
      setKey('');
      setReplacing(false);
    }
    onChange({ aiStatus: status, keySaved: ok ? provider.needsKey : state.keySaved });
  };

  const statusChip = () => {
    const s = state.aiStatus;
    if (s === 'idle' && state.keySaved) return <Chip>Key saved</Chip>;
    if (s === 'idle') return null;
    const variant = s === 'connected' || s === 'rate_limited' ? 'ok' : s === 'testing' ? 'ghost' : 'high';
    return (
      <span role={variant === 'high' ? 'alert' : 'status'}>
        <Chip variant={variant}>{STATUS_LABEL[s]}</Chip>
      </span>
    );
  };

  return (
    <>
      <div className="space-y-5">
        <Eyebrow>Optional</Eyebrow>
        <Headline>Add an AI model for plain-language answers.</Headline>
        <p className="text-[18px] text-muted">Bring your own key. Specter has no accounts and no servers in between.</p>
        <Select label="Provider" value={state.provider} onChange={(e) => void chooseProvider(e.target.value as ProviderId)}>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        {showKeyField ? (
          <TextInput
            label="API key"
            type="password"
            mono
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        ) : provider.needsKey ? (
          <InsetCard className="flex items-center justify-between gap-3">
            <span className="font-mono text-small text-muted">Key saved · hidden</span>
            <span className="flex gap-2">
              <Button variant="quiet" onClick={() => setReplacing(true)}>
                Replace
              </Button>
              <Button
                variant="quiet"
                onClick={() => void removeKey(state.provider).then(() => onChange({ keySaved: false, aiStatus: 'idle' }))}
              >
                Remove key
              </Button>
            </span>
          </InsetCard>
        ) : (
          <InsetCard>
            <p className="text-small text-muted">
              Run Ollama on this computer. Specter connects to http://localhost:11434 and nothing leaves your device.
            </p>
          </InsetCard>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => void test()}
            disabled={state.aiStatus === 'testing' || (provider.needsKey && !key && !state.keySaved)}
          >
            Test connection
          </Button>
          {statusChip()}
        </div>
        <p className="flex gap-3 text-small text-muted">
          <span className="mt-0.5">
            <Icon name="lock" size={18} />
          </span>
          Your key stays in this browser, apart from your other data, and is never exposed to web pages. This browser is
          not a hardware vault, so use a key with a spend limit.
        </p>
      </div>

      <div className="space-y-5">
        <h2 className="text-h3 font-semibold">What gets sent, and when</h2>
        <p className="text-body text-muted">
          Only after you press Analyze. You will see a preview like this first, with personal fields redacted where
          possible.
        </p>
        <InsetCard className="p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-small text-muted">Example preview · 2 excerpts</span>
            <Chip variant="ghost">Not sent yet</Chip>
          </div>
          <p className="mt-3 font-mono text-small leading-relaxed text-fg">
            §4.2 After the trial ends, your subscription renews automatically at $14.99 per month until you cancel.
            <br />
            §4.4 Payments are non-refundable, including for partial months.
          </p>
        </InsetCard>
        <Card variant="dashed" className="p-6">
          <p className="text-h3 font-semibold">Prefer to skip?</p>
          <p className="mt-1 text-body text-muted">
            Specter still detects agreements and reads them on your device. You can add a model later in Settings.
          </p>
          <Button className="mt-4" variant="quiet" onClick={onSkip}>
            Skip for now
          </Button>
        </Card>
      </div>
    </>
  );
}

/* ---------- 6. Ready ---------- */

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <dt className="text-body text-muted">{label}</dt>
      <dd className="text-body font-semibold text-fg">{children}</dd>
    </div>
  );
}

export function Step6({ state, onDemo, onFinish }: { state: OnboardingState; onDemo: () => void; onFinish: () => void }) {
  const effect = EFFECTS.find((e) => e.value === state.prefs.effectLevel)?.title ?? 'Subtle';
  const aiOk = state.aiStatus === 'connected' || state.aiStatus === 'rate_limited' || state.keySaved;
  return (
    <>
      <div className="space-y-6">
        <Eyebrow>All set</Eyebrow>
        <Headline>Specter is watching quietly.</Headline>
        <p className="text-[18px] text-muted">
          Try it on a fictional page first. Nothing on it is real, and nothing is saved unless you choose.
        </p>
        <Card className="px-6 py-2">
          <dl className="divide-y divide-line">
            <SummaryRow label="Effects">{effect}</SummaryRow>
            <SummaryRow label="Analysis">Only when I press Analyze</SummaryRow>
            <SummaryRow label="Background detection">{state.background ? 'On' : 'Off'}</SummaryRow>
            <SummaryRow label="Linked policies">{state.prefs.readLinkedPolicies ? 'Read automatically' : 'Ask each time'}</SummaryRow>
            <SummaryRow label="AI model">
              {aiOk ? <Chip variant="ok">Connected</Chip> : <Chip>Not connected</Chip>}
            </SummaryRow>
          </dl>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onDemo}>
            Open the Streamly demo <Icon name="arrow" />
          </Button>
          <Button variant="quiet" onClick={onFinish}>
            Finish
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-h3 font-semibold">Pin Specter so it is one click away</h2>
        <MiniChrome
          url="streamly.example"
          actions={
            <span className="flex items-center gap-3 text-muted">
              <Icon name="puzzle" />
              <span className="relative text-ghost">
                <Icon name="ghost" size={28} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-medium" />
              </span>
            </span>
          }
        >
          <p className="text-body text-muted">
            Click the puzzle piece, then the pin next to Specter. When the dot appears, Specter has found an agreement or
            cookie choices on the page.
          </p>
          <div className="h-16" />
        </MiniChrome>
        <p className="text-body text-muted">The dot only means "worth a look". It is never a safety rating.</p>
      </div>
    </>
  );
}
