import {
  ClauseFinding,
  effectFor,
  locateQuote,
  ModelResponse,
  validateFinding,
  type Candidate,
  type ClauseFinding as Finding,
  type ExtractedDocument,
  type ModelFindingDraft,
  type ValidationIssue,
} from '@specter/core';
import type { ChatProvider } from './providers';
import { buildRetryPrompt, buildUserPrompt, PROMPT_VERSION, SYSTEM_PROMPT } from './prompts';

export interface AnalyzeInput {
  provider: ChatProvider;
  model: string;
  apiKey?: string;
  doc: ExtractedDocument;
  candidates: Candidate[];
  /** Characters of agreement text allowed in the prompt (from the user's token budget). */
  maxChars?: number;
  signal?: AbortSignal;
}

export type AnalyzeStatus = 'ok' | 'no_candidates' | 'invalid_output';

export interface AnalyzeOutcome {
  status: AnalyzeStatus;
  /** Findings that passed every check. Only these are shown. */
  findings: Finding[];
  /** Drafts that failed a check and were not corrected by the retry. Counted, never shown. */
  rejected: number;
  /** Drafts that failed the first time and passed after the retry. */
  corrected: number;
  promptVersion: string;
  /** Plain reasons for rejections, for the "rejected by verification" line. */
  reasons: string[];
}

/** Strips a Markdown code fence if the model added one, then parses and validates. */
export function parseModelReply(raw: string): ModelResponse | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const parsed = ModelResponse.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/**
 * Turns one draft into a finding, or returns the reasons it fails. The model
 * gave the quote; the code finds its offsets and checks everything again.
 */
export function checkDraft(
  draft: ModelFindingDraft,
  doc: ExtractedDocument,
): { finding: Finding } | { reasons: string[]; quote: string; sectionId: string } {
  const { sectionId, exactQuote } = draft.evidence;
  const loc = locateQuote(doc, sectionId, exactQuote);
  if (!loc) {
    return {
      reasons: ['the quote is not in that section, word for word'],
      quote: exactQuote,
      sectionId,
    };
  }
  const evidence = { sectionId, exactQuote, startOffset: loc.startOffset, endOffset: loc.endOffset };
  const check = validateFinding({ summary: draft.summary, implication: draft.implication, evidence }, doc);
  if (!check.verified) {
    return { reasons: check.issues.map((i: ValidationIssue) => i.message), quote: exactQuote, sectionId };
  }
  const finding = ClauseFinding.parse({
    id: `${sectionId}:${loc.startOffset}:${draft.category}`,
    category: draft.category,
    summary: draft.summary,
    implication: draft.implication,
    evidence,
    concern: draft.concern,
    confidence: draft.confidence,
    conditions: draft.conditions,
    notStated: draft.notStated,
    suggestedQuestions: draft.suggestedQuestions,
    effect: effectFor(draft.concern, draft.category, true, draft.confidence),
    verified: true,
  });
  return { finding };
}

async function ask(input: AnalyzeInput, user: string): Promise<string> {
  return input.provider.complete({
    model: input.model,
    system: SYSTEM_PROMPT,
    user,
    apiKey: input.apiKey,
    signal: input.signal,
  });
}

/**
 * Runs one analysis (Spec 5). Makes at most two model calls: the first
 * proposal, and one retry for drafts that fail verification. Anything still
 * failing is dropped and counted. Provider errors (bad key, rate limit, no
 * Ollama) are thrown as ProviderError so the UI can explain them.
 */
export async function analyzeDocument(input: AnalyzeInput): Promise<AnalyzeOutcome> {
  const base = { promptVersion: PROMPT_VERSION, findings: [] as Finding[], rejected: 0, corrected: 0, reasons: [] as string[] };
  if (input.candidates.length === 0) return { ...base, status: 'no_candidates' };

  const userPrompt = buildUserPrompt(input.doc, input.candidates, input.maxChars);
  const first =
    parseModelReply(await ask(input, userPrompt)) ??
    parseModelReply(
      await ask(input, 'Your last reply was not valid JSON for the schema. Reply with JSON only.\n\n' + userPrompt),
    );
  if (!first) return { ...base, status: 'invalid_output' };

  const accepted: Finding[] = [];
  const failed: { draft: ModelFindingDraft; quote: string; sectionId: string; reasons: string[] }[] = [];
  for (const draft of first.findings) {
    const result = checkDraft(draft, input.doc);
    if ('finding' in result) accepted.push(result.finding);
    else failed.push({ draft, ...result });
  }

  let corrected = 0;
  let rejected = 0;
  const reasons: string[] = [];
  if (failed.length > 0) {
    const retryReply = parseModelReply(
      await ask(
        input,
        buildRetryPrompt(failed.map((f) => ({ quote: f.quote, sectionId: f.sectionId, reason: f.reasons.join('; ') }))),
      ),
    );
    // The model may reword the quote, so a correction is matched by section: each
    // failed draft is replaced by one verified finding from the same section.
    const fixes: Finding[] = [];
    for (const draft of retryReply?.findings ?? []) {
      const result = checkDraft(draft, input.doc);
      if ('finding' in result) fixes.push(result.finding);
    }
    const used = new Set<number>();
    for (const f of failed) {
      const i = fixes.findIndex((fx, idx) => !used.has(idx) && fx.evidence.sectionId === f.sectionId);
      if (i >= 0) {
        used.add(i);
        accepted.push(fixes[i]!);
        corrected++;
      } else {
        rejected++;
        reasons.push(...f.reasons);
      }
    }
  }

  // Nothing unverified is shown, even if a check above was skipped.
  const findings = accepted.filter((f) => f.verified);
  return { ...base, status: 'ok', findings, rejected, corrected, reasons };
}
