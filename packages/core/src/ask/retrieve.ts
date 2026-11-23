import type { ExtractedDocument } from '../schema';

/** Upper bound on the agreement text sent for one question (characters). */
export const ASK_MAX_CHARS = 12000;
/** Upper bound on sections per question, so the reply stays focused. */
export const ASK_MAX_SECTIONS = 8;

export interface RetrievedSection {
  id: string;
  heading: string;
  text: string;
}

const STOP = new Set([
  'the', 'and', 'for', 'you', 'your', 'with', 'this', 'that', 'what', 'when', 'can', 'does', 'from',
  'are', 'how', 'who', 'its', 'but', 'not', 'any', 'all', 'about', 'will', 'have', 'has', 'into', 'our',
  'they', 'them', 'their', 'was', 'were', 'is', 'it', 'of', 'to', 'in', 'on', 'or', 'a', 'an', 'be', 'by',
  'if', 'at', 'as', 'do', 'me', 'my', 'i', 'does', 'there', 'which', 'would', 'should', 'after', 'before',
]);

/** Lower-case words from a question, without common filler words. */
export function questionTerms(question: string): string[] {
  const words = question.toLowerCase().match(/[a-z][a-z'-]+/g) ?? [];
  // Match word stems, so "renews" and "renewal" both hit "renew".
  const stems = words.filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|s)$/, ''));
  return [...new Set(stems.filter((s) => s.length >= 3))];
}

function score(text: string, terms: string[]): number {
  const words = text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? [];
  let hits = 0;
  for (const w of words) {
    for (const t of terms) {
      if (w.startsWith(t)) {
        hits++;
        break;
      }
    }
  }
  return hits;
}

/** An earlier turn of the conversation, as retrieval needs it. */
export interface PriorTurn {
  question: string;
  /** Section ids the answer cited. */
  citations: string[];
}

/**
 * Sections for one turn of a conversation. A follow-up such as "why?" or "and if I cancel early?"
 * has few words of its own, so:
 * 1. the question alone, when its words match the agreement;
 * 2. otherwise the question plus the previous question;
 * 3. otherwise the sections the previous answer cited.
 * Returns none when nothing matches; the question can then only get a general answer.
 */
export function retrieveForTurn(
  doc: Pick<ExtractedDocument, 'text' | 'sections'>,
  question: string,
  prior: PriorTurn[],
  maxChars = ASK_MAX_CHARS,
  maxSections = ASK_MAX_SECTIONS,
): RetrievedSection[] {
  const direct = retrieveSections(doc, question, maxChars, maxSections);
  if (direct.length > 0) return direct;
  const last = prior[prior.length - 1];
  if (!last) return [];
  const joined = retrieveSections(doc, `${question} ${last.question}`, maxChars, maxSections);
  if (joined.length > 0) return joined;

  const wanted = new Set(last.citations);
  const out: RetrievedSection[] = [];
  let size = 0;
  for (const s of doc.sections) {
    if (!wanted.has(s.id) || out.length >= maxSections) continue;
    const remaining = maxChars - size;
    if (remaining <= 0) break;
    const full = doc.text.slice(s.startOffset, s.endOffset);
    const text = full.length > remaining ? full.slice(0, remaining) : full;
    size += text.length;
    out.push({ id: s.id, heading: s.heading, text });
  }
  return out;
}

/**
 * Picks the sections of an agreement that are most likely to answer a question.
 * Pure and deterministic. Returns sections in document order. Returns none
 * when no word of the question appears in the agreement, so nothing is sent
 * to a model for a question the text cannot answer.
 */
export function retrieveSections(
  doc: Pick<ExtractedDocument, 'text' | 'sections'>,
  question: string,
  maxChars = ASK_MAX_CHARS,
  maxSections = ASK_MAX_SECTIONS,
): RetrievedSection[] {
  const terms = questionTerms(question);
  if (terms.length === 0) return [];

  const ranked = doc.sections
    .map((s, index) => {
      const text = doc.text.slice(s.startOffset, s.endOffset);
      return { index, section: s, text, hits: score(`${s.heading} ${text}`, terms) };
    })
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.index - b.index);

  const chosen: { index: number; out: RetrievedSection }[] = [];
  let size = 0;
  for (const r of ranked) {
    if (chosen.length >= maxSections) break;
    const remaining = maxChars - size;
    if (remaining <= 0) break;
    // A long section is cut to the remaining budget rather than dropped.
    const text = r.text.length > remaining ? r.text.slice(0, remaining) : r.text;
    size += text.length;
    chosen.push({ index: r.index, out: { id: r.section.id, heading: r.section.heading, text } });
  }
  return chosen.sort((a, b) => a.index - b.index).map((c) => c.out);
}
