import type { AgreementKind, Category, CompletenessReason, ControlRole } from '@specter/core';
import type { ExtractFailure } from './messaging';

export const CATEGORY_LABEL: Record<Category, string> = {
  billing: 'Billing',
  cancellation: 'Cancellation',
  privacy: 'Privacy and data',
  content_rights: 'Content and rights',
  disputes: 'Disputes',
  account_control: 'Account control',
  liability: 'Liability',
};

/** Why an analysis ran in limited mode, or failed part way (design steering section 6C). */
export type AnalysisFailure =
  | 'no_provider'
  | 'no_model'
  | 'no_key'
  | 'invalid_key'
  | 'rate_limited'
  | 'not_running'
  | 'network'
  | 'bad_response'
  | 'invalid_output'
  | 'cancelled'
  | 'error';

export const ANALYSIS_MESSAGE: Record<AnalysisFailure, string> = {
  no_provider: 'No AI model is connected, so this is an on-device scan only.',
  no_model: 'No model is chosen. Pick one in AI connectivity. Showing on-device results.',
  no_key: 'The saved AI key is missing. Showing on-device results.',
  invalid_key: 'AI unavailable. The provider did not accept the key. Showing on-device results.',
  rate_limited: 'AI unavailable. The provider is rate limiting requests. Showing on-device results.',
  not_running: 'AI unavailable. Ollama is not running on this computer. Showing on-device results.',
  network: 'AI unavailable. Could not reach the provider. Showing on-device results.',
  bad_response: 'AI unavailable. The provider sent an unexpected reply. Showing on-device results.',
  invalid_output: 'The AI reply could not be checked against the agreement. Showing on-device results.',
  cancelled: 'Analysis cancelled. Nothing was kept.',
  error: 'Something went wrong during AI analysis. Showing on-device results.',
};

/** Plain words for each agreement kind (Spec 2 design section 7). */
export const KIND_LABEL: Record<AgreementKind, string> = {
  cookie_banner: 'Cookie banner',
  terms_of_service: 'Terms of service',
  privacy_policy: 'Privacy policy',
  cookie_policy: 'Cookie policy',
  subscription_terms: 'Subscription terms',
  eula: 'Software license',
  consent_checkbox: 'Sign-up agreement',
};

export const ROLE_LABEL: Record<ControlRole, string> = {
  accept_all: 'Accept all',
  reject_optional: 'Reject optional',
  manage: 'Manage choices',
  other: 'Other button',
};

export type ReadFailure = ExtractFailure | 'not_html' | 'network';

export const FAILURE_MESSAGE: Record<ReadFailure, string> = {
  excluded: 'Specter is turned off on this site.',
  pdf: 'PDF agreements are not supported yet.',
  no_access: 'Specter needs your OK to read this page.',
  nothing_found: 'Specter could not find that agreement on the page any more.',
  not_html: 'The linked page is not a web page Specter can read.',
  network: 'Specter could not reach the linked page.',
  error: 'Something went wrong while reading the page.',
};

export function kindsSentence(kinds: AgreementKind[]): string {
  return kinds.map((k) => KIND_LABEL[k]).join(', ');
}

/** Coverage wording (design steering section 4, FR-CMP-04). */
export function coverageLabel(completeness: number): { text: string; complete: boolean } {
  if (completeness >= 1) return { text: 'Coverage: complete', complete: true };
  return { text: `Partial coverage: ${Math.floor(completeness * 100)}% read`, complete: false };
}

export function reasonLines(reasons: CompletenessReason[]): string[] {
  return reasons.map((r) => r.message);
}

/** Why an answer could not be given. Each one has a Retry button in Ask Specter. */
export const ASK_MESSAGE: Record<AnalysisFailure, string> = {
  no_provider: 'Connect an AI model to ask questions.',
  no_model: 'Choose a model in AI connectivity first.',
  no_key: 'The saved AI key is missing. Connect the model again.',
  invalid_key: 'The provider did not accept the key.',
  rate_limited: 'The provider is rate limiting requests. Try again in a moment.',
  not_running: 'Ollama is not running on this computer.',
  network: 'Could not reach the provider.',
  bad_response: 'The provider sent a reply Specter could not read.',
  invalid_output: 'The reply could not be read as an answer.',
  cancelled: 'The question was cancelled.',
  error: 'Something went wrong while asking.',
};
