import type { KokoroInstance } from './kokoroLoader';
import type { KokoroVoiceId } from './kokoroVoices';

type ProgressCb = (pct: number, status: string) => void;

/**
 * Load Kokoro inside a Vite module worker (WASM path).
 * Returns a KokoroInstance-compatible facade used by generateSpeech.
 */
export async function loadKokoroInWorker(onProgress: ProgressCb): Promise<KokoroInstance> {
  const worker = new Worker(new URL('../../workers/kokoro.worker.ts', import.meta.url), {
    type: 'module',
  });

  let reqId = 1;
  const pending = new Map<
    number,
    { resolve: (blob: Blob) => void; reject: (e: Error) => void }
  >();

  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Worker init timeout')), 180_000);
    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data as {
        type: string;
        pct?: number;
        status?: string;
        id?: number;
        buffer?: ArrayBuffer;
        mime?: string;
        message?: string;
      };
      if (msg.type === 'progress') {
        onProgress(msg.pct ?? 0, msg.status ?? 'Downloading…');
        return;
      }
      if (msg.type === 'ready') {
        clearTimeout(timeout);
        resolve();
        return;
      }
      if (msg.type === 'error') {
        clearTimeout(timeout);
        const err = new Error(msg.message || 'Worker error');
        if (pending.size === 0) reject(err);
        for (const [, p] of pending) p.reject(err);
        pending.clear();
        return;
      }
      if (msg.type === 'audio' && msg.id != null && msg.buffer) {
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        p.resolve(new Blob([msg.buffer], { type: msg.mime || 'audio/wav' }));
      }
    };
    worker.onerror = (e) => {
      clearTimeout(timeout);
      reject(e.error ?? new Error(e.message || 'Worker failed'));
    };
    worker.postMessage({ type: 'init', dtype: 'q8' });
  });

  await ready;

  const facade: KokoroInstance = {
    async generate(text, opts) {
      const id = reqId++;
      const blob = await new Promise<Blob>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({
          type: 'generate',
          id,
          text,
          voice: opts.voice as KokoroVoiceId,
        });
      });
      return { toBlob: () => blob };
    },
  };

  return facade;
}
