import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DetectionResult, ExtractedDocument } from '@specter/core';
import { Button, Card, Chip, InsetCard, OptionCard, ProgressStepper } from '@specter/ui';
import { describePage, type PageInfo } from '../../src/pageInfo';
import { allowSite, checkPage, extractFromTab } from '../../src/analyze';
import { readLinkedPolicy } from '../../src/linkedPolicy';
import { blockedDomains, getPrefs } from '../../src/prefs';
import { sendMessage, type SpecterMessage } from '../../src/messaging';
import { defaultChoice, documentChoices, type DocumentChoice } from '../../src/choices';
import {
  coverageLabel,
  FAILURE_MESSAGE,
  kindsSentence,
  ROLE_LABEL,
  type ReadFailure,
} from '../../src/labels';
import { openTab } from '../../src/nav';
import { useSettings } from '../../src/store/settings';

type View =
  | { kind: 'loading' }
  | { kind: 'blocked'; info: PageInfo }
  | { kind: 'no_access' }
  | { kind: 'detected'; result: DetectionResult }
  | { kind: 'reading'; result: DetectionResult; requestId: string }
  | { kind: 'extracted'; result: DetectionResult; doc: ExtractedDocument }
  | { kind: 'failed'; result?: DetectionResult; reason: ReadFailure };

interface ActiveTab {
  id: number;
  url: string;
}

const newRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Page tab (Spec 2 task 6.2, design steering 6C and section 8). Detection is
 * local rules only. Extraction starts only from "Analyze agreement". Any
 * navigation invalidates in-flight work and results.
 */
export function PageTab() {
  const [tab, setTab] = useState<ActiveTab | null>(null);
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [notice, setNotice] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [autoLinked, setAutoLinked] = useState(false);
  const current = useRef<string | null>(null);
  const reduceMotion = useSettings((s) => s.reduceMotion);

  const load = useCallback(async () => {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (t?.id === undefined) return;
    const prefs = await getPrefs();
    setAutoLinked(prefs.readLinkedPolicies);
    const info = describePage(t.url, blockedDomains(prefs));
    setTab({ id: t.id, url: t.url ?? '' });
    current.current = null;
    if (info.access !== 'supported') {
      setView({ kind: 'blocked', info });
      return;
    }
    // Use the background's result when the registered script already ran.
    const stored = await sendMessage({ type: 'get-tab-state', tabId: t.id });
    const result = stored?.type === 'tab-state' ? stored.state?.result : undefined;
    if (result) {
      showDetected(result);
      return;
    }
    // Otherwise check now, with the access granted when the popup was opened.
    setView({ kind: 'loading' });
    const reply = await checkPage(t.id);
    if (reply.status === 'ok') showDetected(reply.result);
    else if (reply.status === 'excluded') setView({ kind: 'blocked', info: { access: 'excluded', host: info.host } });
    else setView({ kind: 'no_access' });
  }, []);

  const showDetected = (result: DetectionResult) => {
    const choices = documentChoices(result);
    setChoice(defaultChoice(result, choices));
    setView({ kind: 'detected', result });
  };

  // Load once on open, and again when the user switches tabs.
  useEffect(() => {
    void load();
    const onActivated = () => {
      setNotice(null);
      void load();
    };
    chrome.tabs.onActivated.addListener(onActivated);
    return () => chrome.tabs.onActivated.removeListener(onActivated);
  }, [load]);

  // Follow navigation and background updates for the tab being shown.
  useEffect(() => {
    const onUpdated = (tabId: number, change: { url?: string }) => {
      if (change.url && tabId === tab?.id) {
        current.current = null;
        setNotice('The page changed. Run analysis again.');
        void load();
      }
    };
    const onMessage = (raw: unknown) => {
      const m = raw as SpecterMessage;
      // A late detection update must not wipe an analysis in progress or its results.
      if (m.type === 'tab-state-changed' && m.tabId === tab?.id && current.current === null) void load();
      return false;
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, [load, tab?.id]);

  const analyze = async (result: DetectionResult, picked: DocumentChoice | undefined) => {
    if (!tab) return;
    const requestId = newRequestId();
    current.current = requestId;
    setNotice(null);
    setView({ kind: 'reading', result, requestId });
    const finish = (next: View) => {
      // Ignore answers to a request that was cancelled or replaced.
      if (current.current === requestId) setView(next);
    };
    if (picked?.kind === 'link') {
      const r = await readLinkedPolicy(picked.link);
      finish(r.ok ? { kind: 'extracted', result, doc: r.doc } : { kind: 'failed', result, reason: r.reason });
      return;
    }
    const r = await extractFromTab(tab.id, picked?.kind === 'banner' ? 'banner' : 'page', requestId);
    finish(r.status === 'ok' ? { kind: 'extracted', result, doc: r.doc } : { kind: 'failed', result, reason: r.reason });
  };

  const cancel = (result: DetectionResult) => {
    current.current = null;
    setView({ kind: 'detected', result });
  };

  return (
    <div className="space-y-3">
      {notice ? (
        <Card variant="medium">
          <p className="text-small text-fg" role="status">
            {notice}
          </p>
        </Card>
      ) : null}
      <Body
        view={view}
        tab={tab}
        choice={choice}
        autoLinked={autoLinked}
        reduceMotion={reduceMotion}
        onChoice={setChoice}
        onAnalyze={analyze}
        onCancel={cancel}
        onRetry={() => void load()}
        onAllow={async () => {
          if (tab && (await allowSite(tab.url))) void load();
        }}
      />
      <InsetCard>
        <p className="text-caption text-muted">
          On-device scan is free. AI analysis sends selected excerpts to your provider, and only when you ask.
        </p>
      </InsetCard>
    </div>
  );
}

function Host({ url, chip }: { url: string; chip: ReactNode }) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="truncate font-mono text-small text-muted">{host || 'This page'}</span>
      {chip}
    </div>
  );
}

function Body(props: {
  view: View;
  tab: ActiveTab | null;
  choice: string | null;
  autoLinked: boolean;
  reduceMotion: boolean;
  onChoice: (id: string) => void;
  onAnalyze: (result: DetectionResult, picked: DocumentChoice | undefined) => void;
  onCancel: (result: DetectionResult) => void;
  onRetry: () => void;
  onAllow: () => void;
}) {
  const { view, tab } = props;
  const url = tab?.url ?? '';

  if (view.kind === 'loading') {
    return (
      <Card>
        <p className="text-muted" aria-live="polite">
          Checking this page on your device.
        </p>
      </Card>
    );
  }

  if (view.kind === 'blocked') {
    const excluded = view.info.access === 'excluded';
    return (
      <Card>
        <Host url={url} chip={<Chip>{excluded ? 'Excluded' : 'Unsupported page'}</Chip>} />
        <h3 className="text-h3 font-semibold">
          {excluded ? 'Specter is turned off on this site' : "Specter can't read this page"}
        </h3>
        <p className="mt-1 text-small text-muted">
          {excluded ? 'This site is on your excluded or paused list.' : view.info.reason}
        </p>
        {excluded ? (
          <Button className="mt-3" variant="secondary" onClick={() => openTab('options')}>
            Manage excluded sites
          </Button>
        ) : null}
      </Card>
    );
  }

  if (view.kind === 'no_access') {
    return (
      <Card>
        <Host url={url} chip={<Chip>Not checked</Chip>} />
        <h3 className="text-h3 font-semibold">Specter needs your OK to read this page</h3>
        <p className="mt-1 text-small text-muted">
          Open Specter from the toolbar button on this page, or allow it on this site. Reading happens on your device.
        </p>
        <Button className="mt-3" block onClick={props.onAllow}>
          Allow on this site
        </Button>
      </Card>
    );
  }

  if (view.kind === 'failed') {
    return (
      <Card>
        <Host url={url} chip={<Chip>Not read</Chip>} />
        <p className="text-fg" role="alert">
          {FAILURE_MESSAGE[view.reason]}
        </p>
        <Button className="mt-3" variant="secondary" onClick={props.onRetry}>
          Try again
        </Button>
      </Card>
    );
  }

  if (view.kind === 'reading') {
    return (
      <Card>
        <Host url={url} chip={<Chip variant="ghost">Reading</Chip>} />
        <ProgressStepper
          reduceMotion={props.reduceMotion}
          steps={[
            { label: 'Extract text', state: 'running' },
            { label: 'Screen likely clauses', state: 'waiting' },
            { label: 'Interpret with AI', state: 'waiting' },
            { label: 'Check every quote against the source', state: 'waiting' },
          ]}
        />
        <p className="mt-2 text-caption text-muted">Clause screening, AI and quote checks arrive in later versions.</p>
        <Button className="mt-3" variant="quiet" onClick={() => props.onCancel(view.result)}>
          Cancel analysis
        </Button>
      </Card>
    );
  }

  if (view.kind === 'extracted') {
    // Try again goes back to the detected state so the user can analyze again.
    return <Extracted doc={view.doc} onRetry={props.onRetry} />;
  }

  // detected
  const { result } = view;
  const choices = documentChoices(result);
  const picked = choices.find((c) => c.id === props.choice);
  const found = result.kinds.length > 0;
  const linkNeedsClick = picked?.kind === 'link' && !props.autoLinked;
  return (
    <>
      <Card>
        <Host
          url={url}
          chip={found ? <Chip variant="medium">Review available</Chip> : <Chip>Quiet</Chip>}
        />
        {found ? (
          <>
            <h3 className="text-h3 font-semibold">Agreement detected: {kindsSentence(result.kinds)}</h3>
            <p className="mt-1 text-small text-muted">Found on your device. Nothing has been read or sent yet.</p>
          </>
        ) : (
          <>
            <h3 className="text-h3 font-semibold">No agreement detected on this page.</h3>
            <p className="mt-1 text-small text-muted">Nothing has been read or sent yet.</p>
          </>
        )}

        {choices.length > 1 ? (
          <fieldset className="mt-3 space-y-2">
            <legend className="mb-1 text-small font-semibold text-fg">Choose one document</legend>
            {choices.map((c) => (
              <OptionCard
                key={c.id}
                name="document"
                value={c.id}
                checked={props.choice === c.id}
                onChange={props.onChoice}
                title={c.label}
                description={c.kind === 'link' ? 'Linked page' : undefined}
              />
            ))}
          </fieldset>
        ) : null}

        <Button
          className="mt-3"
          block
          disabled={found && choices.length > 1 && !picked}
          onClick={() => props.onAnalyze(result, picked)}
        >
          {!found ? 'Analyze this page anyway' : linkNeedsClick ? 'Read the linked policy' : 'Analyze agreement'}
        </Button>
        {linkNeedsClick ? (
          <p className="mt-2 text-caption text-muted">
            Specter will open this one page without your cookies. You can let it do this automatically in Settings.
          </p>
        ) : null}
      </Card>

      {result.kinds.includes('cookie_banner') ? <CookieCard result={result} /> : null}

      {result.unreadable.length > 0 ? (
        <Card variant="medium">
          <h4 className="text-h4 font-semibold">Partial coverage</h4>
          <ul className="mt-1 list-inside list-disc text-small text-muted">
            {result.unreadable.map((u, i) => (
              <li key={i}>{u.note}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

function CookieCard({ result }: { result: DetectionResult }) {
  return (
    <Card>
      <h4 className="text-h4 font-semibold">Cookie choices on this page</h4>
      <ul className="mt-2 space-y-2">
        {result.cookieControls.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <span className="text-body">
              <span className="text-muted">{ROLE_LABEL[c.role]}:</span> {c.label}
            </span>
            {c.certainty === 'detected' ? <Chip variant="ok">Detected</Chip> : <Chip variant="medium">Uncertain</Chip>}
          </li>
        ))}
      </ul>
      {result.noRejectControlFound ? (
        <p className="mt-2 text-small text-muted">
          Specter did not find a reject button in this banner. The site may offer one under Manage.
        </p>
      ) : null}
      <p className="mt-2 text-caption text-muted">Use the site's own buttons to choose. Specter never clicks them.</p>
    </Card>
  );
}

function Extracted({ doc, onRetry }: { doc: ExtractedDocument; onRetry: () => void }) {
  const coverage = coverageLabel(doc.completeness);
  const headings = doc.sections.filter((s) => s.heading);
  return (
    <>
      <Card variant={coverage.complete ? 'default' : 'medium'}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Chip variant={coverage.complete ? 'ok' : 'medium'}>{coverage.text}</Chip>
          <Chip>Limited · on-device only</Chip>
        </div>
        <h3 className="text-h3 font-semibold">{doc.title || 'Untitled agreement'}</h3>
        <p className="mt-1 text-small text-muted">
          {doc.sections.length} {doc.sections.length === 1 ? 'section' : 'sections'} read
          {doc.source === 'linked' ? ' from the linked page' : ''}.
        </p>
        {doc.completenessReasons.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-small text-fg">
            {doc.completenessReasons.map((r) => (
              <li key={r.code}>{r.message}</li>
            ))}
          </ul>
        ) : null}
        {doc.completeness < 0.8 ? (
          <Button className="mt-3" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </Card>
      {headings.length > 0 ? (
        <Card>
          <h4 className="text-h4 font-semibold">Sections</h4>
          <ol className="mt-2 space-y-1 text-small text-muted">
            {headings.slice(0, 40).map((s) => (
              <li key={s.id}>{s.heading}</li>
            ))}
          </ol>
          {headings.length > 40 ? <p className="mt-1 text-caption text-muted">and {headings.length - 40} more.</p> : null}
        </Card>
      ) : null}
      <p className="text-caption text-muted">
        Clause findings arrive with AI analysis. Informational assistance, not legal advice.
      </p>
    </>
  );
}
