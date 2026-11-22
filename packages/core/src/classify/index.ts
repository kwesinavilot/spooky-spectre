import type { Category, ExtractedDocument } from '../schema';

/**
 * Candidate clauses (Spec 3). Keywords only nominate a clause for the model to
 * read. They never decide meaning, and a negated clause ("we do not
 * automatically renew") is still nominated; `negated` is a hint for the prompt,
 * not a verdict. The master prompt requires negations to be handled by the
 * model, not by keywords.
 */
export interface Candidate {
  /** Stable id: section id, absolute start offset and category. */
  id: string;
  sectionId: string;
  sectionHeading: string;
  category: Category;
  /** The clause, exactly as it appears in the document text. */
  text: string;
  /** Absolute offsets into the document text. */
  start: number;
  end: number;
  negated: boolean;
  keywords: string[];
}

export const CATEGORY_KEYWORDS: Record<Category, RegExp> = {
  billing:
    /\b(renew\w*|charg\w*|billed|billing|fees?|prices?|pricing|subscriptions?|subscribe|trials?|payments?|per (?:month|year|week)|monthly|annually)\b/i,
  cancellation: /\b(cancel\w*|terminat\w*|notice period|refunds?|non-refundable|withdraw\w*|waive\w*)\b/i,
  privacy:
    /\b(shar\w*|sell\w*|sold|personal (?:data|information)|tracks?|tracking|advertis\w*|affiliat\w*|partners?|cookies?|disclos\w*|consent\w*|personali[sz]\w*|profil\w*)\b/i,
  content_rights:
    /\b(licen[cs]e\w*|intellectual property|royalty-free|your content|you grant|you own|ownership)\b/i,
  disputes:
    /\b(arbitrat\w*|class action|jury|governing law|governing|governed by|choice of law|disputes?|venue|jurisdiction|courts?)\b/i,
  account_control:
    /\b(suspend\w*|ban(?:ned|s)?|(?:close|delete|disable)s? (?:your )?account|modif\w*|change (?:these|the) terms|we may update|delet\w*|automatic\w* (?:change|update)\w*)\b/i,
  liability: /\b(liabilit\w*|liable|disclaim\w*|warrant\w*|indemnif\w*|limited to|as is)\b/i,
};

const NEGATION = /\b(?:not|no|never|without|unless|neither|nor|cannot)\b|n['’]t\b/i;

/** Nominated clauses sent to the model per analysis. Keeps cost and the amount of data shared bounded. */
export const MAX_CANDIDATES = 40;

/** Splits text into sentence-like clauses, keeping offsets into the same text. */
export function splitClauses(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = m.index + raw.indexOf(trimmed);
    out.push({ text: trimmed, start, end: start + trimmed.length });
  }
  return out;
}

/**
 * Nominates candidate clauses from the extracted sections. Every match is
 * collected first, then the `limit` strongest are kept: strength is the number
 * of keyword hits in the clause. Ties keep document order. The result is
 * returned in document order, so the prompt reads like the agreement.
 */
export function findCandidates(
  doc: Pick<ExtractedDocument, 'text' | 'sections'>,
  limit = MAX_CANDIDATES,
): Candidate[] {
  const all: { candidate: Candidate; strength: number; order: number }[] = [];
  const categories = Object.keys(CATEGORY_KEYWORDS) as Category[];
  for (const section of doc.sections) {
    const body = doc.text.slice(section.startOffset, section.endOffset);
    for (const clause of splitClauses(body)) {
      const start = section.startOffset + clause.start;
      const end = section.startOffset + clause.end;
      for (const category of categories) {
        const pattern = CATEGORY_KEYWORDS[category];
        if (!pattern.test(clause.text)) continue;
        const hits = clause.text.match(new RegExp(pattern.source, 'gi')) ?? [];
        all.push({
          order: all.length,
          strength: hits.length,
          candidate: {
            id: `${section.id}:${start}:${category}`,
            sectionId: section.id,
            sectionHeading: section.heading,
            category,
            text: clause.text,
            start,
            end,
            negated: NEGATION.test(clause.text),
            keywords: [...new Set(hits.map((h) => h.toLowerCase()))],
          },
        });
      }
    }
  }
  return all
    .slice()
    .sort((a, b) => b.strength - a.strength || a.order - b.order)
    .slice(0, limit)
    .sort((a, b) => a.order - b.order)
    .map((x) => x.candidate);
}
