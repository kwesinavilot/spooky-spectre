// Subpath imports keep the Zod schemas out of the page (NFR-03). Results are
// validated where they are received: the background worker and side panel.
import { detectPage, type DetectOutcome } from '@specter/core/detect';
import { chooseRoot, extractDocument } from '@specter/core/extract';
import { shouldAnalyze } from '@specter/core/privacy';
import type { AgreementKind, DetectionResult } from '@specter/core/schema';
import type { SpecterMessage } from '../src/messaging';
import { clearAll, focusMark, markerRect, setEffectLevel, showMarks } from '../src/pageHighlight';
import { configure, dispose, momentForFinding, setPossessionLevel } from '../src/possessionOverlay';
import { blockedDomains, getPrefs } from '../src/prefs';

type SpecterGlobal = typeof globalThis & { __specterLoaded?: boolean; __specterOnDemand?: boolean };

const OBSERVE_FOR_MS = 15_000;
const DEBOUNCE_MS = 500;
const PAGE_KINDS: AgreementKind[] = [
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'eula',
  'subscription_terms',
  'consent_checkbox',
];

/**
 * Content script (Spec 2 task 5.3). Registered at runtime only: on all sites
 * when background detection is granted, on sites enabled one by one, or
 * injected on demand from the side panel. It reads nothing until the
 * excluded and paused domains have been checked, never changes the page apart
 * from the empty overlay host, and logs nothing.
 */
export default defineContentScript({
  registration: 'runtime',
  async main() {
    const g = globalThis as SpecterGlobal;
    // The script can be injected twice (registered, then on demand); keep one instance.
    if (g.__specterLoaded) return;
    g.__specterLoaded = true;
    const onDemand = g.__specterOnDemand === true;

    const prefs = await getPrefs();
    const blocked = blockedDomains(prefs);
    // FR-PRV-01: decide before any DOM read.
    if (!shouldAnalyze(location.hostname, blocked)) {
      void chrome.runtime.sendMessage({ type: 'detected', excluded: true } satisfies SpecterMessage).catch(() => {});
      listen(() => ({ excluded: true }));
      return;
    }

    mountOverlayHost();

    let outcome: DetectOutcome | null = null;
    const run = () => {
      outcome = detectPage(document, location.href, { excludedDomains: blocked });
      // "Detect cookie banners" off (onboarding step 4): drop the banner from the result.
      if (!outcome.excluded && !prefs.detectCookieBanners) {
        outcome = {
          ...outcome,
          banner: null,
          result: {
            ...outcome.result,
            kinds: outcome.result.kinds.filter((k) => k !== 'cookie_banner'),
            cookieControls: [],
            noRejectControlFound: false,
          },
        };
      }
      const result = outcome.excluded ? undefined : outcome.result;
      void chrome.runtime.sendMessage({ type: 'detected', result } satisfies SpecterMessage).catch(() => {});
      return result;
    };

    listen(() => {
      if (!outcome) run();
      return outcome?.excluded ? { excluded: true } : { outcome };
    });

    whenIdle(() => {
      const first = run();
      // FR-DET-10: banners often appear after load. Watch briefly in background mode.
      if (!onDemand) watchForLateBanners(first, run);
    });
  },
});

function mountOverlayHost(): void {
  if (document.getElementById('specter-overlay-host')) return;
  const host = document.createElement('div');
  host.id = 'specter-overlay-host';
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  // Shadow root isolates overlay styles from the site; it renders nothing until a finding exists.
  host.attachShadow({ mode: 'open' });
  document.documentElement.append(host);
}

function whenIdle(fn: () => void): void {
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 200);
}

function watchForLateBanners(first: DetectionResult | undefined, rerun: () => DetectionResult | undefined): void {
  let lastKinds = (first?.kinds ?? []).join(',');
  if (first?.kinds.includes('cookie_banner')) return;
  let timer: number | undefined;
  const observer = new MutationObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const next = rerun();
      const kinds = (next?.kinds ?? []).join(',');
      if (kinds !== lastKinds) lastKinds = kinds;
      if (next?.kinds.includes('cookie_banner')) observer.disconnect();
    }, DEBOUNCE_MS);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), OBSERVE_FOR_MS);
}

type Current = { excluded: true } | { outcome: DetectOutcome | null };

function listen(current: () => Current): void {
  chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const message = raw as SpecterMessage;
    if (message.type === 'ping') {
      sendResponse({ type: 'pong' } satisfies SpecterMessage);
      return false;
    }
    if (message.type === 'get-detection') {
      const c = current();
      const reply: SpecterMessage =
        'excluded' in c || !c.outcome || c.outcome.excluded
          ? { type: 'detection', excluded: true }
          : { type: 'detection', result: c.outcome.result };
      sendResponse(reply);
      return false;
    }
    if (message.type === 'show-marks') {
      // A marker for every verified finding, drawn at once. The side panel sends this after an analysis.
      void (async () => {
        const { prefs, reduce } = await applyPrefs();
        const count = showMarks(message.items);
        const c = current();
        const controls = 'excluded' in c || !c.outcome || c.outcome.excluded ? [] : c.outcome.result.actionControls;
        configure({ items: message.items, controls, level: prefs.effectLevel, reduce });
        sendResponse({ type: 'marks-shown', count } satisfies SpecterMessage);
      })();
      return true;
    }
    if (message.type === 'highlight') {
      // "Show on page" for one finding: scroll to it, and count it as a moment of agreement.
      const item = message.item;
      void (async () => {
        await applyPrefs();
        const found = item ? focusMark(item) : false;
        if (item && found) momentForFinding(item.id, () => markerRect(item.id));
        sendResponse({ type: 'highlighted', found } satisfies SpecterMessage);
      })();
      return true;
    }
    if (message.type === 'clear-highlight') {
      clearAll();
      dispose();
      return false;
    }
    if (message.type === 'extract') {
      const c = current();
      if ('excluded' in c) {
        sendResponse({ type: 'extract-failed', requestId: message.requestId, reason: 'excluded' } satisfies SpecterMessage);
        return false;
      }
      extract(message.requestId, message.target, c.outcome).then(sendResponse);
      return true;
    }
    return false;
  });
}

/**
 * Reads the saved effect level and the reduced-motion setting, and applies them to the page. The
 * setting forces Quiet only while "Respect system reduced motion" is on (design steering 5.1).
 */
async function applyPrefs(): Promise<{ prefs: Awaited<ReturnType<typeof getPrefs>>; reduce: boolean }> {
  const prefs = await getPrefs();
  const reduce = prefs.respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setEffectLevel(prefs.effectLevel, reduce);
  setPossessionLevel(prefs.effectLevel, reduce);
  return { prefs, reduce };
}

function fingerprint(root: Element): string {
  return `${root.childElementCount}:${(root.textContent ?? '').length}`;
}

/** Extraction with the page-changed check (FR-EXT-11): retry once, then report it. */
async function extract(
  requestId: string,
  target: 'page' | 'banner',
  outcome: DetectOutcome | null,
): Promise<SpecterMessage> {
  try {
    if (!outcome || outcome.excluded) return { type: 'extract-failed', requestId, reason: 'excluded' };
    if (outcome.result.isPdf) return { type: 'extract-failed', requestId, reason: 'pdf' };

    if (target === 'banner') {
      if (!outcome.banner) return { type: 'extract-failed', requestId, reason: 'nothing_found' };
      const doc = await extractDocument(document, {
        kind: 'cookie_banner',
        source: 'modal',
        url: location.href,
        root: outcome.banner.element,
        title: 'Cookie banner',
      });
      return { type: 'extracted', requestId, doc };
    }

    const kind = PAGE_KINDS.find((k) => outcome.result.kinds.includes(k)) ?? 'terms_of_service';
    for (let attempt = 0; attempt < 2; attempt++) {
      const { root } = chooseRoot(document);
      const before = fingerprint(root);
      const doc = await extractDocument(document, { kind, source: 'page', url: location.href });
      if (fingerprint(root) === before) return { type: 'extracted', requestId, doc };
    }
    const doc = await extractDocument(document, {
      kind,
      source: 'page',
      url: location.href,
      extraReasons: ['page_changed'],
    });
    return { type: 'extracted', requestId, doc };
  } catch {
    return { type: 'extract-failed', requestId, reason: 'error' };
  }
}
