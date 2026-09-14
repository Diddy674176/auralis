import type { TextChunk } from '../types';

/** Clean PDF/OCR artifacts without changing meaning. */
export function cleanText(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/(\w)-\n(\w)/g, '$1$2');
  t = t.replace(/([^\n])\n(?!\n)/g, '$1 ');
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  const lines = t.split('\n');
  const counts = new Map<string, number>();
  for (const line of lines) {
    const s = line.trim();
    if (s.length > 0 && s.length < 60) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const repeated = new Set(
    [...counts.entries()].filter(([, c]) => c >= 4).map(([s]) => s)
  );
  if (repeated.size) {
    t = lines.filter((l) => !repeated.has(l.trim())).join('\n');
  }
  return t.trim();
}

const DIALOGUE_RE = /^[“"«]|[\u201C]/;
const ATTRIBUTION_RE = /\b(said|asked|replied|whispered|shouted|muttered|answered|cried|called)\s+([A-Z][a-zA-Z'’-]+)/i;
const NAME_SAID_RE = /\b([A-Z][a-zA-Z'’-]+)\s+(said|asked|replied|whispered|shouted|muttered)/i;

function detectSpeaker(sentence: string, prevSpeaker: string): { speaker: string; isDialogue: boolean } {
  const trimmed = sentence.trim();
  const isDialogue = DIALOGUE_RE.test(trimmed) || /[“"]/.test(trimmed);
  if (!isDialogue) return { speaker: 'narrator', isDialogue: false };

  const m1 = trimmed.match(ATTRIBUTION_RE);
  if (m1?.[2]) return { speaker: m1[2], isDialogue: true };
  const m2 = trimmed.match(NAME_SAID_RE);
  if (m2?.[1]) return { speaker: m2[1], isDialogue: true };

  if (prevSpeaker !== 'narrator') return { speaker: prevSpeaker, isDialogue: true };
  return { speaker: 'Character', isDialogue: true };
}

/** Split into sentence/paragraph chunks for queued TTS. */
export function chunkText(text: string): TextChunk[] {
  const cleaned = cleanText(text);
  const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.trim());
  const chunks: TextChunk[] = [];
  let charPos = 0;
  let sentenceGlobal = 0;
  let prevSpeaker = 'narrator';

  paragraphs.forEach((para, paragraphIndex) => {
    const sentences = splitSentences(para);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      const start = cleaned.indexOf(trimmed, charPos);
      const startChar = start >= 0 ? start : charPos;
      const endChar = startChar + trimmed.length;
      const { speaker, isDialogue } = detectSpeaker(trimmed, prevSpeaker);
      if (isDialogue) prevSpeaker = speaker;
      else prevSpeaker = 'narrator';

      chunks.push({
        id: `c-${chunks.length}`,
        index: chunks.length,
        text: trimmed,
        paragraphIndex,
        sentenceIndex: sentenceGlobal++,
        speaker,
        startChar,
        endChar,
        isDialogue,
      });
      charPos = endChar;
    }
  });

  return chunks;
}

function splitSentences(para: string): string[] {
  const parts = para.match(/[^.!?…]+[.!?…]+["”']?|[^.!?…]+$/g);
  return parts?.map((s) => s.trim()).filter(Boolean) ?? [para];
}

export function estimateReadingSeconds(text: string, speed: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = 155 * Math.max(0.5, speed);
  return Math.round((words / wpm) * 60);
}

export function extractCharacters(chunks: TextChunk[]): string[] {
  const set = new Set<string>();
  for (const c of chunks) {
    if (c.isDialogue && c.speaker && c.speaker !== 'narrator' && c.speaker !== 'Character') {
      set.add(c.speaker);
    }
  }
  return ['narrator', ...[...set].sort()];
}

export function detectChapters(text: string): { title: string; startChar: number }[] {
  const re = /^(chapter\s+\d+|chapter\s+[ivxlcdm]+|part\s+\d+)\b.*$/gim;
  const chapters: { title: string; startChar: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    chapters.push({ title: m[0].trim(), startChar: m.index });
  }
  return chapters;
}
