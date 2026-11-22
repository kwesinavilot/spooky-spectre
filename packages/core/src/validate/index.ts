import type { ClauseFinding, ExtractedDocument } from '../schema';

/**
 * Deterministic verification (master prompt, principle 1: evidence or silence).
 * The model proposes a quote; this code finds it in the document and checks the
 * offsets, the section, and every amount or date in the summary.
 */
export type ValidationCode =
  | 'section_unknown'
  | 'quote_not_found'
  | 'offsets_mismatch'
  | 'outside_section'
  | 'amount_not_in_quote'
  | 'date_not_in_quote';

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
}

export interface ValidationResult {
  verified: boolean;
  issues: ValidationIssue[];
}

const AMOUNT =
  /(?:[$€£]|GHS|USD|EUR|GBP|NGN|KES)\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:%|percent)(?!\w)/gi;
const MONTH = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
const DATE = new RegExp(
  `\\b(?:\\d{1,2}\\s+(?:${MONTH})\\.?\\s+\\d{4}|(?:${MONTH})\\.?\\s+\\d{1,2},?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2})\\b`,
  'gi',
);

/** Comparable form: lower case, no spaces or commas. "GHS 120" and "ghs120" match. */
const compact = (s: string) => s.toLowerCase().replace(/[\s,]/g, '');

/**
 * Finds the quote inside its section. Returns null unless the quote appears
 * verbatim, and entirely within the section.
 */
export function locateQuote(
  doc: Pick<ExtractedDocument, 'text' | 'sections'>,
  sectionId: string,
  quote: string,
): { startOffset: number; endOffset: number } | null {
  const section = doc.sections.find((s) => s.id === sectionId);
  if (!section || quote.length === 0) return null;
  const at = doc.text.indexOf(quote, section.startOffset);
  if (at === -1 || at + quote.length > section.endOffset) return null;
  return { startOffset: at, endOffset: at + quote.length };
}

/** Amounts and dates in the summary or implication must also appear in the quote. */
export function checkFigures(finding: Pick<ClauseFinding, 'summary' | 'implication' | 'evidence'>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const prose = `${finding.summary} ${finding.implication}`;
  const quote = compact(finding.evidence.exactQuote);
  for (const amount of prose.match(AMOUNT) ?? []) {
    if (!quote.includes(compact(amount))) {
      issues.push({ code: 'amount_not_in_quote', message: `"${amount}" is not in the quoted text.` });
    }
  }
  for (const date of prose.match(DATE) ?? []) {
    if (!quote.includes(compact(date))) {
      issues.push({ code: 'date_not_in_quote', message: `"${date}" is not in the quoted text.` });
    }
  }
  return issues;
}

export function validateFinding(
  finding: Pick<ClauseFinding, 'summary' | 'implication' | 'evidence'>,
  doc: Pick<ExtractedDocument, 'text' | 'sections'>,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { sectionId, exactQuote, startOffset, endOffset } = finding.evidence;
  const section = doc.sections.find((s) => s.id === sectionId);
  if (!section) {
    issues.push({ code: 'section_unknown', message: 'The cited section does not exist.' });
  }
  if (doc.text.slice(startOffset, endOffset) !== exactQuote) {
    const elsewhere = doc.text.indexOf(exactQuote);
    issues.push(
      elsewhere === -1
        ? { code: 'quote_not_found', message: 'The quote does not appear in the document.' }
        : { code: 'offsets_mismatch', message: 'The quote is in the document, but not at the given offsets.' },
    );
  }
  if (section && (startOffset < section.startOffset || endOffset > section.endOffset)) {
    issues.push({ code: 'outside_section', message: 'The quote lies outside its section.' });
  }
  issues.push(...checkFigures(finding));
  return { verified: issues.length === 0, issues };
}
