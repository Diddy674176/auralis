import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { textHash } from './hash';

interface AudioCacheDB extends DBSchema {
  chunks: {
    key: string;
    value: {
      key: string;
      bookId: string;
      chunkId: string;
      voice: string;
      textHash: string;
      blob: Blob;
      duration?: number;
      createdAt: number;
    };
    indexes: { 'by-book': string };
  };
}

let dbPromise: Promise<IDBPDatabase<AudioCacheDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AudioCacheDB>('auralis-audio-cache', 1, {
      upgrade(db) {
        const store = db.createObjectStore('chunks', { keyPath: 'key' });
        store.createIndex('by-book', 'bookId');
      },
    });
  }
  return dbPromise;
}

export function cacheKey(bookId: string, chunkId: string, voice: string, hash: string) {
  return `${bookId}|${chunkId}|${voice}|${hash}`;
}

export async function getCachedAudio(
  bookId: string,
  chunkId: string,
  voice: string,
  text: string,
): Promise<Blob | null> {
  const hash = await textHash(text);
  const db = await getDb();
  const row = await db.get('chunks', cacheKey(bookId, chunkId, voice, hash));
  return row?.blob ?? null;
}

export async function putCachedAudio(
  bookId: string,
  chunkId: string,
  voice: string,
  text: string,
  blob: Blob,
  duration?: number,
): Promise<void> {
  const hash = await textHash(text);
  const db = await getDb();
  await db.put('chunks', {
    key: cacheKey(bookId, chunkId, voice, hash),
    bookId,
    chunkId,
    voice,
    textHash: hash,
    blob,
    duration,
    createdAt: Date.now(),
  });
}

export async function clearBookAudioCache(bookId: string): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeysFromIndex('chunks', 'by-book', bookId);
  await Promise.all(keys.map((k) => db.delete('chunks', k)));
}

export async function countCachedForBook(bookId: string): Promise<number> {
  const db = await getDb();
  return (await db.getAllKeysFromIndex('chunks', 'by-book', bookId)).length;
}
