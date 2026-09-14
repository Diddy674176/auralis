import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { textHash } from './hash';
import { KOKORO_CACHE_VERSION } from './bufferConfig';

interface AudioCacheDB extends DBSchema {
  chunks: {
    key: string;
    value: {
      key: string;
      bookId: string;
      chunkId: string;
      voice: string;
      textHash: string;
      model: string;
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
    dbPromise = openDB<AudioCacheDB>('auralis-audio-cache', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('chunks', { keyPath: 'key' });
          store.createIndex('by-book', 'bookId');
        }
        // v2: model version embedded in key string; no schema change required
      },
    });
  }
  return dbPromise;
}

export function cacheKey(bookId: string, chunkId: string, voice: string, hash: string, model = KOKORO_CACHE_VERSION) {
  return `${bookId}|${chunkId}|${voice}|${model}|${hash}`;
}

export async function getCachedAudio(
  bookId: string,
  chunkId: string,
  voice: string,
  text: string,
): Promise<{ blob: Blob; duration?: number } | null> {
  const hash = await textHash(text);
  const db = await getDb();
  const row = await db.get('chunks', cacheKey(bookId, chunkId, voice, hash));
  if (!row) return null;
  return { blob: row.blob, duration: row.duration };
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
    model: KOKORO_CACHE_VERSION,
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
