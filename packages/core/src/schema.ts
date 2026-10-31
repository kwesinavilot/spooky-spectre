import { z } from 'zod';

/**
 * Single source of truth for Specter's data models (Part 4 of the master prompt).
 * Types are inferred from the Zod schemas; never hand-write the TS types separately.
 * Prompting rules: quote exactly; never infer amounts/dates not in the text;
 * separate what the text states from what it implies; list what is not specified;
 * do not mention legality.
 */

export const Concern = z.enum(['low', 'medium', 'high']);
export type Concern = z.infer<typeof Concern>;

export const Category = z.enum([
  'billing',
  'cancellation',
  'privacy',
  'content_rights',
  'disputes',
  'account_control',
  'liability',
]);
export type Category = z.infer<typeof Category>;

export const Effect = z.enum(['whisper', 'hand', 'haunting', 'possession']);
export type Effect = z.infer<typeof Effect>;

export const Evidence = z
  .object({
    sectionId: z.string().min(1),
    exactQuote: z.string().min(1),
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().nonnegative(),
  })
  .refine((e) => e.startOffset <= e.endOffset, {
    message: 'startOffset must be <= endOffset',
  });
export type Evidence = z.infer<typeof Evidence>;

export const ClauseFinding = z.object({
  id: z.string().min(1),
  category: Category,
  summary: z.string().min(1),
  implication: z.string().min(1),
  evidence: Evidence,
  concern: Concern,
  confidence: z.number().min(0).max(1),
  conditions: z.array(z.string()),
  notStated: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
  effect: Effect,
  verified: z.boolean(),
});
export type ClauseFinding = z.infer<typeof ClauseFinding>;

export const ConsentAction = z.enum(['accepted', 'declined', 'customized', 'unsure']);
export type ConsentAction = z.infer<typeof ConsentAction>;

export const EvidenceType = z.enum(['observed_click', 'user_confirmed']);
export type EvidenceType = z.infer<typeof EvidenceType>;

export const Consent = z.object({
  action: ConsentAction,
  observedAt: z.string().datetime(),
  evidenceType: EvidenceType,
});
export type Consent = z.infer<typeof Consent>;

export const AgreementRecord = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  sourceUrl: z.string().min(1),
  title: z.string().min(1),
  capturedAt: z.string().datetime(),
  documentHash: z.string().min(1),
  extractedText: z.string(),
  completeness: z.number().min(0).max(1),
  findings: z.array(ClauseFinding),
  consent: Consent.optional(),
  previousVersionId: z.string().optional(),
  trialEndsAt: z.string().datetime().optional(),
});
export type AgreementRecord = z.infer<typeof AgreementRecord>;
