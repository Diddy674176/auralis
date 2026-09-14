import type { KokoroVoiceId } from './kokoroVoices';

type ProgressCb = (pct: number, status: string) => void;

let ttsPromise: Promise<KokoroInstance> | null = null;
let loadListeners = new Set<ProgressCb>();
let lastProgress = { pct: 0, status: '' };

export interface KokoroInstance {
  generate: (
    text: string,
    opts: { voice: KokoroVoiceId; speed?: number },
  ) => Promise<{ toBlob: () => Blob }>;
}

export function onKokoroLoadProgress(cb: ProgressCb): () => void {
  loadListeners.add(cb);
  if (lastProgress.status) cb(lastProgress.pct, lastProgress.status);
  return () => {
    loadListeners.delete(cb);
  };
}

function emitProgress(pct: number, status: string) {
  lastProgress = { pct, status };
  loadListeners.forEach((fn) => fn(pct, status));
}

function progressFromEvent(ev: unknown): { pct: number; status: string } | null {
  if (!ev || typeof ev !== 'object') return null;
  const e = ev as Record<string, unknown>;
  const status = String(e.status ?? e.file ?? 'Downloading…');
  if (typeof e.progress === 'number') {
    return { pct: Math.min(99, Math.max(0, e.progress)), status: String(e.status ?? 'Downloading free AI voice model…') };
  }
  if (typeof e.loaded === 'number' && typeof e.total === 'number' && e.total > 0) {
    return {
      pct: Math.min(99, Math.round((100 * (e.loaded as number)) / (e.total as number))),
      status: 'Downloading free AI voice model…',
    };
  }
  if (e.status === 'ready' || e.status === 'done') {
    return { pct: 100, status: 'Ready' };
  }
  return { pct: lastProgress.pct || 5, status: status.includes('http') ? 'Downloading free AI voice model…' : status };
}

/** Lazy-load Kokoro-82M ONNX (q8 + wasm) via kokoro-js. */
export async function loadKokoro(): Promise<KokoroInstance> {
  if (ttsPromise) return ttsPromise;

  ttsPromise = (async () => {
    emitProgress(1, 'Downloading free AI voice model…');
    const { KokoroTTS } = await import('kokoro-js');
    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (ev: unknown) => {
        const p = progressFromEvent(ev);
        if (p) emitProgress(p.pct, p.status);
      },
    });
    emitProgress(100, 'Ready');
    return tts as unknown as KokoroInstance;
  })().catch((err) => {
    ttsPromise = null;
    emitProgress(0, 'Failed to load model');
    throw err;
  });

  return ttsPromise;
}

export function isKokoroLoaded(): boolean {
  return lastProgress.pct >= 100 && ttsPromise != null;
}

export function getKokoroLoadSnapshot() {
  return { ...lastProgress };
}

export function splitForKokoro(text: string, maxLen = 380): string[] {
  const t = text.trim();
  if (t.length <= maxLen) return [t];
  const parts: string[] = [];
  let rest = t;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('. ', maxLen);
    if (cut < maxLen * 0.4) cut = rest.lastIndexOf(' ', maxLen);
    if (cut < maxLen * 0.3) cut = maxLen;
    else cut = cut + 1;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}

export async function generateSpeech(
  text: string,
  voice: KokoroVoiceId = 'af_heart',
  speed = 1,
): Promise<{ blob: Blob; url: string }> {
  const tts = await loadKokoro();
  const segments = splitForKokoro(text);
  const blobs: Blob[] = [];
  for (const seg of segments) {
    const audio = await tts.generate(seg, { voice, speed: Math.min(2, Math.max(0.5, speed)) });
    blobs.push(audio.toBlob());
  }
  const blob = blobs.length === 1 ? blobs[0] : new Blob(blobs, { type: blobs[0]?.type || 'audio/wav' });
  const url = URL.createObjectURL(blob);
  return { blob, url };
}
