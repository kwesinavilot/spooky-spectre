import { useEffect, useState } from 'react';
import { Button, InsetCard, SectionCard, Toggle } from '@specter/ui';
import {
  disableBackground,
  disableSite,
  enableBackground,
  hasBackgroundAccess,
  listEnabledSites,
} from '../../src/access';
import { DEFAULT_PREFS, getPrefs, setPrefs, type SpecterPrefs } from '../../src/prefs';

/**
 * Options "Site access" (Spec 2 task 6.3, FR-ACC-03, 06, 09). The explainer is
 * shown before Chrome's prompt, and declining is one click, the same as
 * accepting. State is read from chrome.permissions, so changes made in
 * Chrome's own settings show here too.
 */
export function SiteAccess() {
  const [background, setBackground] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [sites, setSites] = useState<string[]>([]);
  const [prefs, setPrefsState] = useState<SpecterPrefs>(DEFAULT_PREFS);

  const refresh = async () => {
    setBackground(await hasBackgroundAccess());
    setSites(await listEnabledSites());
    setPrefsState(await getPrefs());
  };

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    // @types/chrome omits removeListener on these two events; Chrome has it.
    const added = chrome.permissions.onAdded as unknown as chrome.events.Event<() => void>;
    const removed = chrome.permissions.onRemoved as unknown as chrome.events.Event<() => void>;
    added.addListener(onChange);
    removed.addListener(onChange);
    return () => {
      added.removeListener(onChange);
      removed.removeListener(onChange);
    };
  }, []);

  const onToggleBackground = async (next: boolean) => {
    setDeclined(false);
    if (next) {
      setExplaining(true);
    } else {
      await disableBackground();
      await refresh();
    }
  };

  // Called from the Continue click, so Chrome accepts it as a user gesture.
  const continueToChrome = async () => {
    const granted = await enableBackground();
    setExplaining(false);
    setDeclined(!granted);
    await refresh();
  };

  return (
    <SectionCard title="Site access">
      <div className="space-y-4">
        <Toggle
          label="Background detection"
          description={
            background
              ? 'On: Specter checks pages as they load and shows a dot on its toolbar icon when it finds an agreement.'
              : 'Off: Specter works only when you open it on a page, or on sites you turn on below.'
          }
          checked={background}
          onChange={(next) => void onToggleBackground(next)}
        />

        {explaining ? (
          <InsetCard>
            <p className="text-body text-fg">Before Chrome asks</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-small text-muted">
              <li>Chrome will say Specter can "read and change data on all websites". That is how Chrome words this permission.</li>
              <li>Detection runs only on this device, using rules. It never changes or clicks anything on a page.</li>
              <li>Nothing is sent anywhere until you click Analyze. Banks, health and email sites stay excluded.</li>
              <li>You can turn this off here at any time, or in Chrome's extension settings.</li>
            </ul>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => void continueToChrome()}>Continue</Button>
              <Button variant="secondary" onClick={() => setExplaining(false)}>
                Not now
              </Button>
            </div>
          </InsetCard>
        ) : null}

        {declined ? (
          <p className="text-small text-muted" role="status">
            Background detection is off. Specter still works when you open it on a page.
          </p>
        ) : null}

        <Toggle
          label="Read linked policies automatically"
          description="When you analyze a page that only links to its terms, Specter opens that one page without your cookies. Nothing is stored."
          checked={prefs.readLinkedPolicies}
          onChange={(next) => void setPrefs({ readLinkedPolicies: next }).then(setPrefsState)}
        />

        <div>
          <h4 className="text-h4 font-semibold">Sites you turned on one by one</h4>
          {sites.length === 0 ? (
            <p className="mt-1 text-small text-muted">None yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {sites.map((s) => (
                <li key={s} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-small text-fg">{s.replace(/\/\*$/, '')}</span>
                  <Button variant="quiet" onClick={() => void disableSite(s).then(refresh)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {prefs.pausedDomains.length > 0 ? (
          <div>
            <h4 className="text-h4 font-semibold">Paused sites</h4>
            <ul className="mt-2 space-y-2">
              {prefs.pausedDomains.map((d) => (
                <li key={d} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-small text-fg">{d}</span>
                  <Button
                    variant="quiet"
                    onClick={() =>
                      void setPrefs({ pausedDomains: prefs.pausedDomains.filter((x) => x !== d) }).then(setPrefsState)
                    }
                  >
                    Resume
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
