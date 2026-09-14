import type { VoicePreset } from '../../types';
import type { TtsProvider, TtsRequest, TtsResult } from './types';
import { generateSpeech, loadKokoro, onKokoroLoadProgress } from './kokoroLoader';
import { getCachedAudio, putCachedAudio } from './audioCache';
import { resolveKokoroVoice, type KokoroVoiceId } from './kokoroVoices';
import { applyPronunciations } from './pronunciation';

let previewAudio: HTMLAudioElement | null = null;
let activeBookId: string | null = null;
let preferredVoiceOverride: string | null = null;

export function setKokoroBookContext(bookId: string | null) {
  activeBookId = bookId;
}

export function setKokoroVoiceOverride(voiceId: string | null) {
  preferredVoiceOverride = voiceId;
}

export function getKokoroVoiceOverride() {
  return preferredVoiceOverride;
}

export function createKokoroProvider(): TtsProvider {
  return {
    id: 'kokoro',
    label: 'Kokoro AI - Free',
    supportsAudioElement: true,
    isAvailable() {
      return typeof window !== 'undefined';
    },
    async synthesize(req: TtsRequest): Promise<TtsResult> {
      const voice = resolveKokoroVoice(req.preset.id, preferredVoiceOverride);
      const text = applyPronunciations(req.chunk.text);
      const bookId = activeBookId ?? 'anon';
      const chunkId = req.chunk.id;

      const cached = await getCachedAudio(bookId, chunkId, voice, text);
      if (cached) {
        const url = URL.createObjectURL(cached);
        return { kind: 'audio', url };
      }

      let lastErr: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await loadKokoro();
          const { blob, url } = await generateSpeech(text, voice, req.rate);
          void putCachedAudio(bookId, chunkId, voice, text, blob);
          return { kind: 'audio', url, durationHintSec: undefined };
        } catch (e) {
          lastErr = e;
          if (attempt === 0) await delay(400);
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error('Kokoro synthesis failed');
    },
    async preview(text: string, preset: VoicePreset, _voiceURI: string | null) {
      this.cancelPreview();
      const voice = resolveKokoroVoice(preset.id, preferredVoiceOverride ?? (preset as { kokoroVoice?: string }).kokoroVoice);
      onKokoroLoadProgress(() => undefined);
      const { url } = await generateSpeech(applyPronunciations(text), voice as KokoroVoiceId, 1);
      previewAudio = new Audio(url);
      previewAudio.setAttribute('playsinline', 'true');
      previewAudio.onended = () => {
        URL.revokeObjectURL(url);
        previewAudio = null;
      };
      await previewAudio.play();
    },
    cancelPreview() {
      if (previewAudio) {
        previewAudio.pause();
        const src = previewAudio.src;
        previewAudio = null;
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
      }
    },
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
