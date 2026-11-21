import { useEffect, useRef, useState } from 'react';
import { Button, Logo } from '@specter/ui';
import { DEFAULT_PREFS, getPrefs, setPrefs, type SpecterPrefs } from '../../src/prefs';
import { hasBackgroundAccess } from '../../src/access';
import { hasSavedKey, PROVIDERS, type ConnectionStatus, type ProviderId } from '../../src/aiConnect';
import { useSettings } from '../../src/store/settings';
import { DEMO_URL } from '../../src/demo';
import { Step1, Step2, Step3, Step4, Step5, Step6 } from './Steps';

export interface OnboardingState {
  prefs: SpecterPrefs;
  background: boolean;
  provider: ProviderId;
  aiStatus: ConnectionStatus;
  keySaved: boolean;
}

const TOTAL = 6;

/**
 * Onboarding (design steering 6A, reference screens in docs/design). Six
 * steps; Skip setup jumps to step 6 with the defaults. Each step saves its
 * choices when the user continues, never at the end only.
 */
export default function App() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OnboardingState>({
    prefs: DEFAULT_PREFS,
    background: false,
    provider: 'anthropic',
    aiStatus: 'idle',
    keySaved: false,
  });
  const heading = useRef<HTMLDivElement>(null);
  const setHauntingLevel = useSettings((s) => s.setHauntingLevel);
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const providerId = useSettings((s) => s.providerId);

  useEffect(() => {
    (async () => {
      const prefs = await getPrefs();
      const background = await hasBackgroundAccess();
      const provider = (PROVIDERS.find((p) => p.id === providerId)?.id ?? 'anthropic') as ProviderId;
      const keySaved = await hasSavedKey(provider);
      setState((s) => ({ ...s, prefs, background, provider, keySaved }));
    })();
  }, [providerId]);

  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    const h = heading.current?.querySelector('h1') as HTMLElement | null;
    h?.setAttribute('tabindex', '-1');
    h?.focus();
  }, [step]);

  // Reaching the last step, by Continue or Skip, completes onboarding.
  useEffect(() => {
    if (step === TOTAL) {
      void setPrefs({ onboardingComplete: true });
      completeOnboarding();
    }
  }, [step, completeOnboarding]);

  const update = (patch: Partial<OnboardingState>) => setState((s) => ({ ...s, ...patch }));
  const updatePrefs = (patch: Partial<SpecterPrefs>) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));

  const persistStep = async () => {
    if (step === 4) {
      const p = state.prefs;
      await setPrefs({
        effectLevel: p.effectLevel,
        previewBeforeSending: p.previewBeforeSending,
        detectCookieBanners: p.detectCookieBanners,
        offerConsentLog: p.offerConsentLog,
        readLinkedPolicies: p.readLinkedPolicies,
      });
      setHauntingLevel(p.effectLevel);
    }
  };

  const next = async () => {
    await persistStep();
    setStep((s) => Math.min(TOTAL, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));
  const openDemo = () => void chrome.tabs.create({ url: DEMO_URL });
  const finish = () =>
    chrome.tabs.getCurrent((tab) => {
      if (tab?.id !== undefined) void chrome.tabs.remove(tab.id);
    });

  const screens = {
    1: <Step1 onStart={() => void next()} onDemo={openDemo} />,
    2: <Step2 />,
    3: <Step3 background={state.background} onBackground={(background) => update({ background })} />,
    4: <Step4 prefs={state.prefs} onChange={updatePrefs} />,
    5: <Step5 state={state} onChange={update} onSkip={() => setStep(TOTAL)} />,
    6: <Step6 state={state} onDemo={openDemo} onFinish={finish} />,
  } as const;

  return (
    <div className="flex min-h-screen flex-col bg-bg bg-[radial-gradient(ellipse_at_top_right,rgba(139,107,195,0.14),transparent_55%)] text-fg">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-8 py-6">
        <Logo size={32} />
        <div className="flex items-center gap-6">
          <span className="text-body text-muted">
            Step {step} of {TOTAL}
          </span>
          <ol aria-hidden="true" className="hidden gap-2 sm:flex">
            {Array.from({ length: TOTAL }, (_, i) => (
              <li key={i} className={`h-1 w-10 rounded-full ${i < step ? 'bg-ghost' : 'bg-line'}`} />
            ))}
          </ol>
          {step < TOTAL ? (
            <button
              type="button"
              onClick={() => setStep(TOTAL)}
              className="min-h-[44px] text-body text-muted underline underline-offset-4 hover:text-fg"
            >
              Skip setup
            </button>
          ) : null}
        </div>
      </header>

      <main ref={heading} className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-12 px-8 py-8 lg:grid-cols-2">
        {screens[step as keyof typeof screens]}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-8 py-5">
          {step === 1 ? (
            <p className="text-body text-muted">Informational assistance, not legal advice.</p>
          ) : (
            <Button variant="quiet" onClick={back}>
              Back
            </Button>
          )}
          {step < TOTAL ? (
            <Button onClick={() => void next()}>Continue</Button>
          ) : (
            <p className="text-body text-muted">You can change any of this later in Settings.</p>
          )}
        </div>
      </footer>
    </div>
  );
}
