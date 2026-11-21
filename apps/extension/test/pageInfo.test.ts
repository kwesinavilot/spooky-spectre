import { describe, expect, it } from 'vitest';
import { describePage } from '../src/pageInfo';

describe('describePage', () => {
  it('supports ordinary http and https pages', () => {
    expect(describePage('https://www.streamly.example/signup')).toEqual({
      access: 'supported',
      host: 'streamly.example',
    });
    expect(describePage('http://localhost:5173/terms.html').access).toBe('supported');
  });

  it('marks excluded domains, including subdomains and user-added ones', () => {
    expect(describePage('https://secure.chase.com/login').access).toBe('excluded');
    expect(describePage('https://mail.google.com/mail/u/0').access).toBe('excluded');
    expect(describePage('https://bank.example/home', ['bank.example']).access).toBe('excluded');
  });

  it('marks browser, extension, Web Store and PDF pages as unsupported with a reason', () => {
    for (const url of [
      'chrome://extensions',
      'chrome-extension://abc/sidepanel.html',
      'https://chromewebstore.google.com/detail/x',
      'https://streamly.example/terms.pdf',
      'not a url',
      undefined,
    ]) {
      const info = describePage(url);
      expect(info.access).toBe('unsupported');
      expect(info.reason).toBeTruthy();
    }
  });
});
