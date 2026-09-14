/// <reference lib="webworker" />
import { KOKORO_MODEL_ID } from '../lib/tts/bufferConfig';

type InMsg =
  | { type: 'init'; dtype?: 'q8' | 'fp32' }
  | { type: 'generate'; id: number; text: string; voice: string };

type OutMsg =
  | { type: 'progress'; pct: number; status: string }
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'audio'; id: number; buffer: ArrayBuffer; mime: string };

let tts: {
  generate: (
    text: string,
    opts: { voice: string; speed?: number },
  ) => Promise<{ toBlob: () => Blob }>;
} | null = null;

function progressFromEvent(ev: unknown): { pct: number; status: string } | null {
  if (!ev || typeof ev !== 'object') return null;
  const e = ev as Record<string, unknown>;
  if (typeof e.progress === 'number') {
    return { pct: Math.min(99, Math.max(0, e.progress)), status: 'Downloading free AI voice model…' };
  }
  if (typeof e.loaded === 'number' && typeof e.total === 'number' && e.total > 0) {
    return {
      pct: Math.min(99, Math.round((100 * (e.loaded as number)) / (e.total as number))),
      status: 'Downloading free AI voice model…',
    };
  }
  if (e.status === 'ready' || e.status === 'done') return { pct: 100, status: 'Ready' };
  return { pct: 5, status: 'Downloading free AI voice model…' };
}

async function init(dtype: 'q8' | 'fp32' = 'q8') {
  const { KokoroTTS } = await import('kokoro-js');
  tts = (await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
    dtype,
    device: 'wasm',
    progress_callback: (ev: unknown) => {
      const p = progressFromEvent(ev);
      if (p) self.postMessage({ type: 'progress', pct: p.pct, status: p.status } satisfies OutMsg);
    },
  })) as typeof tts;
  self.postMessage({ type: 'ready' } satisfies OutMsg);
}

self.onmessage = async (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'init') {
      await init(msg.dtype ?? 'q8');
      return;
    }
    if (msg.type === 'generate') {
      if (!tts) throw new Error('Worker TTS not ready');
      const audio = await tts.generate(msg.text, { voice: msg.voice, speed: 1 });
      const blob = audio.toBlob();
      const buffer = await blob.arrayBuffer();
      const out: OutMsg = {
        type: 'audio',
        id: msg.id,
        buffer,
        mime: blob.type || 'audio/wav',
      };
      self.postMessage(out, [buffer]);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    self.postMessage({ type: 'error', message } satisfies OutMsg);
  }
};

export {};
