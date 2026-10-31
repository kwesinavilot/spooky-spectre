import Dexie, { type Table } from 'dexie';
import type { AgreementRecord } from '@specter/core';

export interface VersionRow {
  id?: number;
  agreementId: string;
  capturedAt: string;
  record: AgreementRecord;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export interface DismissedTipRow {
  id: string;
  dismissedAt: string;
}

/**
 * Specter's local IndexedDB store. Version 1 (FR-DB-01..07).
 * Agreements are keyed by id; versions hold prior snapshots for the Haunting
 * Timeline; settings holds haunting level, excluded domains, provider id;
 * dismissedTips holds coach-mark dismissals.
 */
export class SpecterDB extends Dexie {
  agreements!: Table<AgreementRecord, string>;
  versions!: Table<VersionRow, number>;
  settings!: Table<SettingRow, string>;
  dismissedTips!: Table<DismissedTipRow, string>;

  constructor() {
    super('specter');
    this.version(1).stores({
      agreements: 'id, domain, sourceUrl, capturedAt, documentHash',
      versions: '++id, agreementId, capturedAt',
      settings: 'key',
      dismissedTips: 'id',
    });
  }
}

export const db = new SpecterDB();
