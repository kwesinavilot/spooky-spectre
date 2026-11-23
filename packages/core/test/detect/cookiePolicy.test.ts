import { describe, expect, it } from 'vitest';
import { detectPage } from '../../src';
import { parse } from '../helpers';

function kindsOf(title: string, h1: string, url: string): string[] {
  const doc = parse(
    `<html><head><title>${title}</title></head><body><h1>${h1}</h1><p>Some text about how we work.</p></body></html>`,
  );
  const outcome = detectPage(doc, url);
  if (outcome.excluded) throw new Error('unexpectedly excluded');
  return outcome.result.kinds;
}

describe('cookie policy pages', () => {
  it('detects "Cookies Policy" as a cookie policy, not a privacy policy', () => {
    const kinds = kindsOf('Cookies Policy', 'Cookies Policy', 'https://web.facebook.com/policies/cookies/');
    expect(kinds).toContain('cookie_policy');
    expect(kinds).not.toContain('privacy_policy');
  });

  it('detects "Cookie Notice" from the title and heading, whatever the path', () => {
    expect(kindsOf('Cookie Notice | Example', 'Cookie Notice', 'https://example.test/about')).toContain(
      'cookie_policy',
    );
  });

  it('keeps a privacy policy a privacy policy', () => {
    const kinds = kindsOf('Privacy Policy', 'Privacy Policy', 'https://web.facebook.com/privacy/policy/');
    expect(kinds).toContain('privacy_policy');
    expect(kinds).not.toContain('cookie_policy');
  });

  it('treats a combined privacy and cookie policy as a privacy policy', () => {
    expect(kindsOf('Privacy and Cookie Policy', 'Privacy and Cookie Policy', 'https://example.test/privacy')).toContain(
      'privacy_policy',
    );
  });

  it('does not treat a cookie settings page as a policy because of its path', () => {
    expect(kindsOf('Settings', 'Your settings', 'https://example.test/cookies/')).not.toContain('cookie_policy');
  });
});
