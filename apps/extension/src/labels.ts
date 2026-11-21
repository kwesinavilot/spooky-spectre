import type { AgreementKind, CompletenessReason, ControlRole } from '@specter/core';
import type { ExtractFailure } from './messaging';

/** Plain words for each agreement kind (Spec 2 design section 7). */
export const KIND_LABEL: Record<AgreementKind, string> = {
  cookie_banner: 'Cookie banner',
  terms_of_service: 'Terms of service',
  privacy_policy: 'Privacy policy',
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
