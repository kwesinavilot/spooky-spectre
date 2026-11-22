import type { AgreementKind, Candidate, ExtractedDocument, Section } from '@specter/core';

/** Bump when the prompt changes, so cached results from the old prompt are not reused. */
export const PROMPT_VERSION = 'analysis-v1';

/** Upper bound on the agreement text sent in one call (characters). */
export const MAX_CONTEXT_CHARS = 12000;

/** Rough conversion used for the user's token budget (about four characters per token). */
export const CHARS_PER_TOKEN = 4;

/** Characters allowed for the agreement text, from the user's token budget. */
export function budgetChars(tokens: number): number {
  return Math.round(tokens * CHARS_PER_TOKEN);
}

export const SYSTEM_PROMPT = `You explain clauses in an online agreement for a private person.

Rules you must follow:
- Reply with JSON only, matching the schema you are given. No prose outside the JSON.
- Quote exactly. "evidence.exactQuote" must be copied character for character from the agreement text, from one section. Do not paraphrase, fix punctuation, or join sentences.
- Never infer an amount, a date or a percentage that is not written in the quoted text. If the text does not state it, say "not stated" in notStated.
- Separate what the text states from what it could imply. "summary" says what the clause says. "implication" says what it could mean for the person, and must not go beyond the quote.
- List what the text does not specify in "notStated".
- Negations matter: "we do not automatically renew" means the opposite of renewal. Read the clause as written.
- Never say a clause is legal, illegal, lawful, unlawful, valid or invalid. Never call a company a scam.
- Use plain words. Write "this clause says", "the text does not state".
- Give confidence from 0 to 1: how sure you are that the quote supports the summary.
- Return at most 12 findings. Return an empty list if nothing here needs the reader's attention.`;

export function describeKind(kind: AgreementKind): string {
  return kind.replace(/_/g, ' ');
}

/** The sections that contain candidates, plus their neighbours, capped in size. */
export function contextSections(
  doc: Pick<ExtractedDocument, 'sections'>,
  candidateSectionIds: string[],
  maxChars = MAX_CONTEXT_CHARS,
): Section[] {
  const wanted = new Set(candidateSectionIds);
  const idx = doc.sections.map((s, i) => (wanted.has(s.id) ? i : -1)).filter((i) => i >= 0);
  const pick = new Set<number>();
  for (const i of idx) {
    pick.add(i);
    if (i > 0) pick.add(i - 1);
    if (i + 1 < doc.sections.length) pick.add(i + 1);
  }
  const out: Section[] = [];
  let size = 0;
  for (const i of [...pick].sort((a, b) => a - b)) {
    const s = doc.sections[i]!;
    size += s.endOffset - s.startOffset;
    if (size > maxChars) break;
    out.push(s);
  }
  return out;
}

export function buildUserPrompt(
  doc: Pick<ExtractedDocument, 'title' | 'kind' | 'text' | 'sections'>,
  candidates: Candidate[],
  maxChars = MAX_CONTEXT_CHARS,
): string {
  const sections = contextSections(
    doc,
    candidates.map((c) => c.sectionId),
    maxChars,
  );
  const agreement = sections
    .map((s) => `### [${s.id}] ${s.heading || 'Introduction'}\n${doc.text.slice(s.startOffset, s.endOffset)}`)
    .join('\n\n');
  const hints = candidates
    .map((c) => `- ${c.category}${c.negated ? ' (contains a negation)' : ''} in [${c.sectionId}]: "${c.text}"`)
    .join('\n');
  return [
    `Agreement: ${doc.title} (${describeKind(doc.kind)})`,
    '',
    'Agreement text, by section:',
    agreement,
    '',
    'Clauses that a keyword check flagged for a closer look. Some may not matter; some may matter for reasons the keywords miss:',
    hints,
    '',
    'Schema:',
    '{ "findings": [ { "category": "billing|cancellation|privacy|content_rights|disputes|account_control|liability",',
    '  "summary": string, "implication": string,',
    '  "evidence": { "sectionId": string, "exactQuote": string },',
    '  "concern": "low|medium|high", "confidence": number 0..1,',
    '  "conditions": string[], "notStated": string[], "suggestedQuestions": string[] } ] }',
  ].join('\n');
}

export function buildRetryPrompt(failures: { quote: string; sectionId: string; reason: string }[]): string {
  const list = failures
    .map((f) => `- [${f.sectionId}] "${f.quote}" was rejected: ${f.reason}`)
    .join('\n');
  return [
    'Some findings could not be verified against the agreement text:',
    list,
    '',
    'Return corrected findings for those clauses only. Copy each exactQuote character for character from the agreement text in the same section. If the text does not support a finding, leave that clause out. Reply with the same JSON schema.',
  ].join('\n');
}
