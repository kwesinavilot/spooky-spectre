import { AskReply, type RetrievedSection } from '@specter/core';
import type { ChatProvider } from './providers';

export const ASK_PROMPT_VERSION = 'ask-v1';

export const ASK_SYSTEM_PROMPT = `You answer a question about one online agreement for a private person.

Rules you must follow:
- Use only the sections of the agreement you are given. Do not use outside knowledge about the company or the law.
- Reply with JSON only: {"answer": string, "citations": string[], "notStated": boolean}. No prose outside the JSON.
- "citations" lists the ids of the sections your answer relies on, copied exactly from the section headers.
- If the sections do not say the answer, set "notStated" to true and write "The terms do not say." in the answer.
- Write plain words. Never say a clause is legal, illegal, lawful or unlawful. Do not give legal advice.
- Do not state an amount, date or percentage unless it is written in the sections.`;

export function buildAskPrompt(question: string, sections: RetrievedSection[]): string {
  const body = sections.map((s) => `### [${s.id}] ${s.heading || 'Introduction'}\n${s.text}`).join('\n\n');
  return ['Agreement sections:', body, '', `Question: ${question}`].join('\n');
}

/** Strips a Markdown code fence if present, then parses and validates the reply. */
export function parseAskReply(raw: string): AskReply | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const parsed = AskReply.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export interface AskInput {
  provider: ChatProvider;
  model: string;
  apiKey?: string;
  question: string;
  sections: RetrievedSection[];
  signal?: AbortSignal;
}

export type AskOutcome =
  | { status: 'answered'; answer: string; citations: string[]; notStated: boolean }
  | { status: 'invalid_output' };

/**
 * One question, one model call. An answer with no citation to a section that
 * was sent is not shown as an answer: the result becomes "The terms do not say."
 * Provider errors are thrown as ProviderError for the UI to explain.
 */
export async function askDocument(input: AskInput): Promise<AskOutcome> {
  const raw = await input.provider.complete({
    model: input.model,
    system: ASK_SYSTEM_PROMPT,
    user: buildAskPrompt(input.question, input.sections),
    apiKey: input.apiKey,
    signal: input.signal,
  });
  const reply = parseAskReply(raw);
  if (!reply) return { status: 'invalid_output' };

  const sent = new Set(input.sections.map((s) => s.id));
  const citations = [...new Set(reply.citations.filter((id) => sent.has(id)))];
  if (citations.length === 0) {
    return { status: 'answered', answer: 'The terms do not say.', citations: [], notStated: true };
  }
  return { status: 'answered', answer: reply.answer, citations, notStated: reply.notStated };
}
