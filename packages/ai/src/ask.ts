import { AskReply, type RetrievedSection } from '@specter/core';
import type { ChatProvider } from './providers';

export const ASK_PROMPT_VERSION = 'ask-v2';

/** Earlier turns sent with a question, so follow-ups make sense. */
export const ASK_HISTORY_TURNS = 4;
/** Each earlier answer is cut to this length in the prompt. */
const HISTORY_ANSWER_CHARS = 600;
const MAX_FOLLOW_UPS = 3;

export const NOT_STATED_ANSWER = 'The terms do not say.';

export const ASK_SYSTEM_PROMPT = `You are Specter, chatting with a person about one online agreement they are reading. Talk like a clear, friendly expert: plain words, short paragraphs, no jargon unless you explain it.

There are two kinds of statement, and they go in different fields:
1. "answer": what THIS agreement says or means for the person. Use only the agreement sections you are given. Explain in your own words. Quote at most a short phrase, and only when the exact wording matters (an amount, a deadline, a defined term). List the section ids you relied on in "citations", copied exactly from the section headers.
2. "general": optional background that is not from this agreement, such as what a legal term or a common practice usually means. Keep it short. Never present it as what this agreement says. Use null when it adds nothing.

Rules you must follow:
- Reply with JSON only: {"answer": string, "general": string or null, "citations": string[], "notStated": boolean, "followUps": string[]}. No prose outside the JSON.
- If the sections do not answer the question about this agreement, set "notStated" to true, "citations" to [], and "answer" to "The terms do not say." You may still give general background.
- Never state an amount, date or percentage about this agreement unless it is written in the sections.
- Never say a clause is legal, illegal, lawful or unlawful, and do not give legal advice. You may say what the person might want to check or ask the company.
- Use the earlier conversation to understand follow-up questions. Facts about the agreement still come only from the sections.
- "followUps": up to 3 short questions the person might ask next about this agreement.`;

export interface AskTurn {
  question: string;
  answer: string;
}

export function buildAskPrompt(question: string, sections: RetrievedSection[], history: AskTurn[] = []): string {
  const body =
    sections.length > 0
      ? sections.map((s) => `### [${s.id}] ${s.heading || 'Introduction'}\n${s.text}`).join('\n\n')
      : '(No section of the agreement matched this question.)';
  const recent = history.slice(-ASK_HISTORY_TURNS);
  const convo =
    recent.length > 0
      ? [
          'Earlier in this conversation:',
          ...recent.map((t) => `Person: ${t.question}\nSpecter: ${t.answer.slice(0, HISTORY_ANSWER_CHARS)}`),
          '',
        ]
      : [];
  return ['Agreement sections:', body, '', ...convo, `Question: ${question}`].join('\n');
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
  /** Earlier turns, oldest first. Only the last few are sent. */
  history?: AskTurn[];
  signal?: AbortSignal;
}

export type AskOutcome =
  | {
      status: 'answered';
      answer: string;
      /** Background not from the agreement, or null. Shown with its own label. */
      general: string | null;
      citations: string[];
      notStated: boolean;
      followUps: string[];
    }
  | { status: 'invalid_output' };

/**
 * One turn of a conversation, one model call. A statement about the agreement that cites no section
 * that was sent is not shown: the answer becomes "The terms do not say." General background is kept,
 * because it is always labelled as not from the agreement. Provider errors are thrown as ProviderError.
 */
export async function askDocument(input: AskInput): Promise<AskOutcome> {
  const raw = await input.provider.complete({
    model: input.model,
    system: ASK_SYSTEM_PROMPT,
    user: buildAskPrompt(input.question, input.sections, input.history ?? []),
    apiKey: input.apiKey,
    signal: input.signal,
  });
  const reply = parseAskReply(raw);
  if (!reply) return { status: 'invalid_output' };

  const sent = new Set(input.sections.map((s) => s.id));
  const citations = [...new Set(reply.citations.filter((id) => sent.has(id)))];
  const general = reply.general?.trim() ? reply.general.trim() : null;
  const seen = new Set<string>();
  const followUps = reply.followUps
    .map((q) => q.trim())
    .filter((q) => q.length > 0 && q.toLowerCase() !== input.question.trim().toLowerCase())
    .filter((q) => (seen.has(q.toLowerCase()) ? false : (seen.add(q.toLowerCase()), true)))
    .slice(0, MAX_FOLLOW_UPS);

  if (citations.length === 0) {
    return { status: 'answered', answer: NOT_STATED_ANSWER, general, citations: [], notStated: true, followUps };
  }
  return { status: 'answered', answer: reply.answer, general, citations, notStated: reply.notStated, followUps };
}
