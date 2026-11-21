import { describe, expect, it } from 'vitest';
import { detectPage, extractDocument } from '../../src';
import { DEMO_PAGES, loadExample, parse } from '../helpers';

function detect(path: string, url: string) {
  const outcome = detectPage(loadExample(path), url);
  if (outcome.excluded) throw new Error('unexpectedly excluded');
  return outcome.result;
}

describe('demo pages (TEST-DET-01)', () => {
  it('Streamly signup has a consent checkbox and subscription terms, no banner', () => {
    const r = detect('streamly/signup.html', 'https://streamly.example/signup');
    expect(r.kinds).toContain('consent_checkbox');
    expect(r.kinds).toContain('subscription_terms');
    expect(r.kinds).not.toContain('cookie_banner');
    expect(r.links.some((l) => l.kind === 'terms')).toBe(true);
    // The submit button is recorded for the moment-of-agreement trigger (FR-DET-14).
    expect(r.actionControls.map((c) => c.label)).toEqual(['Start free trial']);
  });

  it('Streamly terms is a terms of service page', () => {
    const r = detect('streamly/terms-v1.html', 'https://streamly.example/terms');
    expect(r.kinds).toContain('terms_of_service');
    expect(r.kinds).not.toContain('cookie_banner');
  });

  it('benign page is terms but has no banner and no subscription terms', () => {
    const r = detect('benign/terms.html', 'https://lantern.example/terms');
    expect(r.kinds).toContain('terms_of_service');
    expect(r.kinds).not.toContain('cookie_banner');
    expect(r.kinds).not.toContain('subscription_terms');
  });

  it('drops the query string and hash from the URL', () => {
    const r = detect('benign/terms.html', 'https://lantern.example/terms?user=42#top');
    expect(r.url).toBe('https://lantern.example/terms');
  });
});

describe('cookie banners (TEST-DET-02)', () => {
  it('lists accept, reject and manage controls', () => {
    const r = detect('cookies/index.html', 'https://gazette.example/');
    expect(r.kinds).toContain('cookie_banner');
    const roles = r.cookieControls.map((c) => c.role);
    expect(roles).toEqual(expect.arrayContaining(['accept_all', 'reject_optional', 'manage']));
    expect(r.noRejectControlFound).toBe(false);
    expect(r.cookieControls.find((c) => c.role === 'reject_optional')?.label).toBe('Reject all');
    expect(r.cookieControls.every((c) => c.certainty === 'detected')).toBe(true);
  });

  it('finds no banner in late.html at parse time (the banner is added by script later)', () => {
    const r = detect('cookies/late.html', 'https://gazette.example/late');
    expect(r.kinds).not.toContain('cookie_banner');
  });

  it('records that no reject control was found', () => {
    const r = detect('cookies/no-reject.html', 'https://gazette.example/no-reject');
    expect(r.kinds).toContain('cookie_banner');
    expect(r.noRejectControlFound).toBe(true);
  });

  it('classifies "Accept necessary only" as a reject control', async () => {
    const { classifyControlLabel } = await import('../../src');
    expect(classifyControlLabel('Accept necessary only')).toBe('reject_optional');
    expect(classifyControlLabel('Only essential cookies')).toBe('reject_optional');
    expect(classifyControlLabel('Cookie settings')).toBe('manage');
    expect(classifyControlLabel('Allow all')).toBe('accept_all');
  });
});

describe('shadow roots (TEST-DET-03)', () => {
  it('detects a banner inside an open shadow root', () => {
    document.body.innerHTML = '<main><h1>Ferry news</h1><p>Article text.</p></main>';
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<div role="dialog" style="position: fixed"><p>We use cookies for advertising.</p>' +
      '<button>Accept all</button><button>Reject all</button></div>';
    document.body.append(host);
    const outcome = detectPage(document, 'https://gazette.example/shadow');
    expect(outcome.excluded).toBe(false);
    if (!outcome.excluded) {
      expect(outcome.result.kinds).toContain('cookie_banner');
      expect(outcome.result.cookieControls[0]?.anchor.cssPath).toContain(' >>> ');
    }
  });

  it('records a closed shadow root as unreadable', () => {
    document.body.innerHTML = '<main><h1>Lighthouse news</h1><p>Article text.</p></main>';
    const host = document.createElement('consent-banner');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = '<p>We use cookies.</p><button>Accept all</button>';
    document.body.append(host);
    const outcome = detectPage(document, 'https://gazette.example/closed');
    if (outcome.excluded) throw new Error('unexpectedly excluded');
    expect(outcome.result.unreadable.map((u) => u.where)).toContain('closed_shadow_root');
    expect(outcome.result.kinds).not.toContain('cookie_banner');
  });
});

describe('privacy gates', () => {
  it('never reads sensitive field values or form labels (TEST-PRV-01)', async () => {
    const html = `<main><h1>Checkout</h1><p>Visible policy text about renewal.</p>
      <form><label for="pw">Secret password label</label>
      <input id="pw" type="password" value="hunter2-secret">
      <label for="cc">Secret card label</label>
      <input id="cc" type="text" autocomplete="cc-number" value="4111111111111111">
      <input type="card" value="5555444433331111">
      <textarea>private textarea note</textarea>
      <button type="submit">Pay now</button></form></main>`;
    const doc = parse(html);
    const outcome = detectPage(doc, 'https://shop.example/checkout');
    const extracted = await extractDocument(doc, {
      kind: 'subscription_terms',
      source: 'page',
      url: 'https://shop.example/checkout',
    });
    const everything = JSON.stringify(outcome) + JSON.stringify(extracted);
    for (const secret of [
      'hunter2-secret',
      '4111111111111111',
      '5555444433331111',
      'Secret password label',
      'Secret card label',
      'private textarea note',
    ]) {
      expect(everything).not.toContain(secret);
    }
    expect(extracted.text).toContain('Visible policy text about renewal.');
  });

  it('stops before reading the page on an excluded domain (TEST-PRV-02)', () => {
    const trap = new Proxy(
      {},
      {
        get() {
          throw new Error('the document was read');
        },
      },
    ) as unknown as Document;
    expect(detectPage(trap, 'https://www.chase.com/account')).toEqual({ excluded: true });
    expect(
      detectPage(trap, 'https://mail.mybank.example/', { excludedDomains: ['mybank.example'] }),
    ).toEqual({ excluded: true });
  });
});

describe('PDF pages', () => {
  it('marks PDF URLs and skips the rules', () => {
    const r = detect('benign/terms.html', 'https://lantern.example/terms.pdf');
    expect(r.isPdf).toBe(true);
    expect(r.kinds).toEqual([]);
  });
});

describe('no interference (TEST-NOINT-01)', () => {
  for (const page of DEMO_PAGES) {
    it(`leaves ${page.path} unchanged`, async () => {
      const doc = loadExample(page.path);
      const before = doc.documentElement.outerHTML;
      detectPage(doc, page.url);
      await extractDocument(doc, { kind: 'terms_of_service', source: 'page', url: page.url });
      expect(doc.documentElement.outerHTML).toBe(before);
    });
  }
});

describe('detection budget (FR-DET-13, loose ceiling for the test DOM)', () => {
  it('runs on every demo page quickly', () => {
    for (const page of DEMO_PAGES) {
      const doc = loadExample(page.path);
      const t0 = performance.now();
      detectPage(doc, page.url);
      expect(performance.now() - t0).toBeLessThan(250);
    }
  });
});
