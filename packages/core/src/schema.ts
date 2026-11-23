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

/* ------------------------------------------------------------------ */
/* Spec 2: detection and extraction                                    */
/* ------------------------------------------------------------------ */

export const AgreementKind = z.enum([
  'cookie_banner',
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'subscription_terms',
  'eula',
  'consent_checkbox',
]);
export type AgreementKind = z.infer<typeof AgreementKind>;

export const TextQuote = z.object({
  exact: z.string(),
  prefix: z.string(),
  suffix: z.string(),
});
export type TextQuote = z.infer<typeof TextQuote>;

/** Where an element is, so later specs can find it on the live page again. */
export const ElementAnchor = z.object({
  /** CSS path from the root; shadow boundaries are joined with ' >>> '. */
  cssPath: z.string(),
  quote: TextQuote,
});
export type ElementAnchor = z.infer<typeof ElementAnchor>;

export const ControlRole = z.enum(['accept_all', 'reject_optional', 'manage', 'other']);
export type ControlRole = z.infer<typeof ControlRole>;

export const CookieControl = z.object({
  role: ControlRole,
  label: z.string().max(80),
  /** 'uncertain' when the element is not a real button or the label is ambiguous. */
  certainty: z.enum(['detected', 'uncertain']),
  anchor: ElementAnchor,
});
export type CookieControl = z.infer<typeof CookieControl>;

export const PolicyLink = z.object({
  kind: z.enum(['terms', 'privacy', 'cookies', 'subscription', 'other']),
  text: z.string().max(120),
  url: z.string().url(),
  isPdf: z.boolean(),
});
export type PolicyLink = z.infer<typeof PolicyLink>;

/**
 * A button the user presses to agree (submit on a sign-up or payment form).
 * Spec 6 watches these for the moment-of-agreement trigger (design steering 5.3).
 */
export const ActionControl = z.object({
  kind: z.enum(['submit']),
  label: z.string().max(80),
  anchor: ElementAnchor,
});
export type ActionControl = z.infer<typeof ActionControl>;

export const Unreadable = z.object({
  where: z.enum(['closed_shadow_root', 'cross_origin_frame']),
  note: z.string(),
});
export type Unreadable = z.infer<typeof Unreadable>;

export const DetectionResult = z.object({
  /** Origin and path only. Never the query string or hash. */
  url: z.string(),
  kinds: z.array(AgreementKind),
  signals: z.array(z.string()),
  cookieControls: z.array(CookieControl),
  noRejectControlFound: z.boolean(),
  actionControls: z.array(ActionControl),
  links: z.array(PolicyLink),
  unreadable: z.array(Unreadable),
  isPdf: z.boolean(),
  confidence: z.number().min(0).max(1),
  detectedAt: z.string().datetime(),
});
export type DetectionResult = z.infer<typeof DetectionResult>;

export const CompletenessReasonCode = z.enum([
  'collapsed_section',
  'read_more',
  'pagination',
  'closed_shadow_root',
  'cross_origin_frame',
  'may_not_have_loaded',
  'page_changed',
]);
export type CompletenessReasonCode = z.infer<typeof CompletenessReasonCode>;

export const CompletenessReason = z.object({
  code: CompletenessReasonCode,
  /** Plain words shown to the user. */
  message: z.string(),
  estimatedChars: z.number().int().nonnegative().optional(),
});
export type CompletenessReason = z.infer<typeof CompletenessReason>;

export const Section = z
  .object({
    id: z.string().min(1),
    heading: z.string(),
    level: z.number().int().min(1).max(6),
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().nonnegative(),
    anchor: ElementAnchor,
  })
  .refine((s) => s.startOffset <= s.endOffset, {
    message: 'startOffset must be <= endOffset',
  });
export type Section = z.infer<typeof Section>;

export const ExtractedDocument = z.object({
  url: z.string(),
  title: z.string(),
  kind: AgreementKind,
  source: z.enum(['page', 'modal', 'linked']),
  text: z.string(),
  sections: z.array(Section),
  documentHash: z.string().min(1),
  completeness: z.number().min(0).max(1),
  completenessReasons: z.array(CompletenessReason),
  extractedAt: z.string().datetime(),
});
export type ExtractedDocument = z.infer<typeof ExtractedDocument>;

/* ------------------------------------------------------------------ */
/* Spec 5: what the model is asked to return (validated on receipt)    */
/* ------------------------------------------------------------------ */

/**
 * One finding as the model proposes it. The model gives the quote; code finds
 * its offsets (the model never supplies offsets, so it cannot invent them).
 */
export const ModelFindingDraft = z.object({
  category: Category,
  summary: z.string().min(1).max(400),
  implication: z.string().min(1).max(400),
  evidence: z.object({
    sectionId: z.string().min(1),
    exactQuote: z.string().min(1).max(1200),
  }),
  concern: Concern,
  confidence: z.number().min(0).max(1),
  conditions: z.array(z.string().max(300)).max(8).default([]),
  notStated: z.array(z.string().max(300)).max(8).default([]),
  suggestedQuestions: z.array(z.string().max(200)).max(4).default([]),
});
export type ModelFindingDraft = z.infer<typeof ModelFindingDraft>;

export const ModelResponse = z.object({
  findings: z.array(ModelFindingDraft).max(20),
});
export type ModelResponse = z.infer<typeof ModelResponse>;

/* ------------------------------------------------------------------ */
/* Ask Specter                                                         */
/* ------------------------------------------------------------------ */

/** The model's reply to one question. Citations are checked against the sections sent. */
export const AskReply = z.object({
  answer: z.string().min(1).max(1200),
  citations: z.array(z.string()).max(8),
  notStated: z.boolean(),
});
export type AskReply = z.infer<typeof AskReply>;
