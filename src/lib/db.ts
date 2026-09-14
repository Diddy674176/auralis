import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppSettings, DocumentRecord } from '../types';

interface AuralisDB extends DBSchema {
  documents: {
    key: string;
    value: DocumentRecord;
    indexes: { 'by-updated': number };
  };
  settings: {
    key: string;
    value: AppSettings & { id: string };
  };
}

let dbPromise: Promise<IDBPDatabase<AuralisDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AuralisDB>('auralis-db', 1, {
      upgrade(db) {
        const docs = db.createObjectStore('documents', { keyPath: 'id' });
        docs.createIndex('by-updated', 'updatedAt');
        db.createObjectStore('settings', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function saveDocument(doc: DocumentRecord): Promise<void> {
  const db = await getDb();
  await db.put('documents', { ...doc, updatedAt: Date.now() });
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
  const db = await getDb();
  return db.get('documents', id);
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('documents', 'by-updated');
  return all.reverse();
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('documents', id);
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 18,
  lineHeight: 1.7,
  highlightMode: 'sentence',
  skipSeconds: 15,
  sleepTimerMin: null,
  premiumTts: { provider: 'none', apiKeyConfigured: false, proxyUrl: '' },
  showBackgroundTips: true,
};

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.get('settings', 'app');
  if (!row) return { ...DEFAULT_SETTINGS };
  const { id: _id, ...rest } = row;
  const merged: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...rest,
    premiumTts: {
      ...DEFAULT_SETTINGS.premiumTts,
      ...(rest.premiumTts ?? {}),
    },
  };
  return merged;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put('settings', { ...settings, id: 'app' });
}
