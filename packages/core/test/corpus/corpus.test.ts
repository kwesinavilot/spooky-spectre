import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectPage, extractDocument, normalizeInline, type AgreementKind } from '../../src';

/**
 * Corpus report (Spec 2 tasks 7.1 and 7.4). For each saved page: did detection
 * find the expected kinds, are the expected phrases in the extracted text, and
 * is completeness at least 0.8? Writes corpus/report.json and checks the
 * acceptance target (7 of 10). Run with `pnpm corpus:report`.
 */
interface Entry {
  file: string;
  sourceUrl: string;
  capturedAt: string;
  expectedKinds: AgreementKind[];
  mustContain: string[];
}

const corpusDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../corpus');
const manifestPath = resolve(corpusDir, 'manifest.json');
const TARGET = { passes: 7, of: 10 };
const PAGE_KINDS: AgreementKind[] = ['terms_of_service', 'privacy_policy', 'eula', 'subscription_terms'];

const norm = (s: string) => normalizeInline(s).toLowerCase();

describe('corpus', () => {
  it('meets the acceptance target', async () => {
    expect(existsSync(manifestPath), 'corpus/manifest.json is missing').toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Entry[];
    const rows = [];

    for (const entry of manifest) {
      const html = readFileSync(resolve(corpusDir, 'pages', entry.file), 'utf8');
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // Saved copies are read as the original site; the excluded list still applies.
      const outcome = detectPage(doc, entry.sourceUrl);
      if (outcome.excluded) {
        rows.push({ file: entry.file, pass: false, why: 'excluded domain' });
        continue;
      }
      const { result, banner } = outcome;
      const wantsBanner = entry.expectedKinds.includes('cookie_banner');
      const kind = PAGE_KINDS.find((k) => result.kinds.includes(k)) ?? entry.expectedKinds[0] ?? 'terms_of_service';
      const extracted =
        wantsBanner && banner
          ? await extractDocument(doc, { kind: 'cookie_banner', source: 'modal', url: entry.sourceUrl, root: banner.element })
          : await extractDocument(doc, { kind, source: 'page', url: entry.sourceUrl });

      const missingKinds = entry.expectedKinds.filter((k) => !result.kinds.includes(k));
      const text = norm(extracted.text);
      const missingPhrases = entry.mustContain.filter((p) => !text.includes(norm(p)));
      const pass =
        missingKinds.length === 0 &&
        missingPhrases.length === 0 &&
        entry.mustContain.length > 0 &&
        extracted.completeness >= 0.8;
      const why = [
        missingKinds.length ? `missing kinds: ${missingKinds.join(', ')}` : '',
        missingPhrases.length ? `missing phrases: ${missingPhrases.length}` : '',
        entry.mustContain.length === 0 ? 'no phrases in manifest' : '',
        extracted.completeness < 0.8 ? `completeness ${extracted.completeness}` : '',
      ]
        .filter(Boolean)
        .join('; ');
      rows.push({
        file: entry.file,
        source: entry.sourceUrl,
        expected: entry.expectedKinds,
        detected: result.kinds,
        // Reported, not failed: kinds found that the manifest did not expect.
        unexpected: result.kinds.filter((k) => !entry.expectedKinds.includes(k)),
        sections: extracted.sections.length,
        completeness: extracted.completeness,
        reasons: extracted.completenessReasons.map((r) => r.code),
        pass,
        why: why || 'ok',
      });
    }

    const passes = rows.filter((r) => r.pass).length;
    const report = { generatedAt: new Date().toISOString(), passes, total: rows.length, rows };
    writeFileSync(resolve(corpusDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.table(
      rows.map((r) => ({
        file: r.file,
        pass: r.pass,
        why: r.why,
        unexpected: 'unexpected' in r ? (r.unexpected as string[]).join(', ') : '',
      })),
    );
    console.log(`Corpus: ${passes} of ${rows.length} pages pass`);

    expect(rows.length, 'the corpus needs at least 10 pages').toBeGreaterThanOrEqual(TARGET.of);
    expect(passes).toBeGreaterThanOrEqual(TARGET.passes);
  });
});
