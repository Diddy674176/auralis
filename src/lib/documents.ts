import type { DocSource, DocumentRecord } from '../types';
import { chunkText } from './textProcess';

const COLORS = ['#7c5cff', '#00c2a8', '#ff6b6b', '#f4a261', '#4cc9f0', '#b5179e'];

export function createDocument(opts: {
  title: string;
  text: string;
  source: DocSource;
}): DocumentRecord {
  const chunks = chunkText(opts.text);
  const now = Date.now();
  const words = opts.text.trim().split(/\s+/).filter(Boolean).length;
  return {
    id: `doc_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: opts.title || 'Untitled',
    source: opts.source,
    createdAt: now,
    updatedAt: now,
    wordCount: words,
    charCount: opts.text.length,
    text: opts.text,
    chunks,
    position: { chunkIndex: 0, speed: 1, voicePresetId: 'audiobook-narrator' },
    characterVoices: {},
    bookmarks: [],
    notes: [],
    coverColor: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}
