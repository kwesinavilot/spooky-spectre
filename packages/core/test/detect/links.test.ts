import { describe, expect, it } from 'vitest';
import { classifyLinkText, findPolicyLinks } from '../../src';

/** Builds anchors the way a page has them. [text, href] pairs, in order. */
function anchors(pairs: [string, string][]): Element[] {
  return pairs.map(([text, href]) => {
    const a = document.createElement('a');
    a.setAttribute('href', href);
    a.textContent = text;
    return a;
  });
}

const PAGE = 'https://free.facebook.com/privacy/policy/';

describe('which links are documents', () => {
  it('names a document by its text', () => {
    expect(classifyLinkText('Terms of Service', '/legal/terms')).toBe('terms');
    expect(classifyLinkText('Privacy Policy', '/privacy/policy/')).toBe('privacy');
    expect(classifyLinkText('Cookies Policy', '/policies/cookies/')).toBe('cookies');
    expect(classifyLinkText('Privacy', '/privacy')).toBe('privacy');
  });

  it('does not treat every link under /privacy/ as a privacy document', () => {
    expect(classifyLinkText('AI at Meta', '/privacy/genai/')).toBeNull();
    expect(classifyLinkText('update these settings', '/privacy/center/settings')).toBeNull();
    expect(classifyLinkText('Authentication', '/privacy/policies/cookies/authentication')).toBeNull();
  });

  it('rejects navigation, versions, footnotes, sentences and bare addresses', () => {
    expect(classifyLinkText('Privacy Center home', '/privacy/center')).toBeNull();
    expect(classifyLinkText('Common privacy settings', '/privacy/settings')).toBeNull();
    expect(classifyLinkText('Privacy topics', '/privacy/topics')).toBeNull();
    expect(classifyLinkText('More privacy resources', '/privacy/resources')).toBeNull();
    expect(classifyLinkText('View printable version', '/privacy/policy/printable')).toBeNull();
    expect(classifyLinkText('See previous versions', '/privacy/policy/previous')).toBeNull();
    expect(classifyLinkText('partners[2]', '/privacy/policy/partners')).toBeNull();
    expect(
      classifyLinkText('Learn more in Privacy Center about managing your privacy', '/privacy/center'),
    ).toBeNull();
    expect(classifyLinkText('https://web.facebook.com/privacy/dialog/navigation/', '/privacy/dialog/navigation/')).toBeNull();
  });

  it('uses the end of the path only when the text is generic', () => {
    expect(classifyLinkText('Learn more', '/legal/terms-of-service/')).toBe('terms');
    expect(classifyLinkText('here', '/privacy-policy')).toBe('privacy');
    expect(classifyLinkText('Learn more', '/privacy/policy/partners')).toBeNull();
    expect(classifyLinkText('', '/legal')).toBe('terms');
  });
});

describe('the links kept from a Facebook privacy policy page', () => {
  const pairs: [string, string][] = [
    ['Terms of Service', '/terms'],
    ['Cookies Policy', '/policies/cookies/'],
    ['View printable version', '/privacy/policy/printable/'],
    ['See previous versions', '/privacy/policy/previous/'],
    ['AI at Meta', '/privacy/genai/'],
    ['update these settings', '/privacy/center/settings/'],
    ['Learn more in Privacy Center about managing your privacy', '/privacy/center/'],
    ['Meta Products', '/privacy/policy/?section=products'],
    ['partners[2]', '/privacy/policy/?section=partners'],
    ['Manage the information we collect about you', '/privacy/manage/'],
    ['Cookies Policy', '/policies/cookies/?entry=footer'],
    ['Meta Company Products', '/products/'],
  ];

  it('keeps only the documents, once each', () => {
    const links = findPolicyLinks(anchors(pairs), PAGE);
    expect(links.map((l) => [l.kind, l.text])).toEqual([
      ['terms', 'Terms of Service'],
      ['cookies', 'Cookies Policy'],
    ]);
  });

  it('keeps no more than two links of one kind', () => {
    const many = anchors([
      ['Privacy Policy', '/privacy/a'],
      ['Privacy Notice', '/privacy/b'],
      ['Privacy Statement', '/privacy/c'],
    ]);
    expect(findPolicyLinks(many, PAGE)).toHaveLength(2);
  });
});
