import { createBrowserSpeechProvider } from './browserSpeech';
import { createPremiumTtsProvider } from './premium';
import { createKokoroProvider } from './kokoroProvider';
import { getTtsRuntimeConfig, getVoiceEngine } from './runtimeConfig';
import { hasKey } from './credentials';
import type { TtsProvider } from './types';

export type { TtsProvider, TtsRequest, TtsResult } from './types';
export { setTtsRuntimeConfig, getTtsRuntimeConfig, getVoiceEngine } from './runtimeConfig';
export type { VoiceEngine } from './runtimeConfig';
export {
  getApiKey,
  setApiKey,
  clearApiKey,
  hasKey,
  getStoredProxyUrl,
  setStoredProxyUrl,
} from './credentials';
export {
  loadKokoro,
  onKokoroLoadProgress,
  getKokoroLoadSnapshot,
  isKokoroLoaded,
  generateSpeech,
  getAiEngine,
  isWorkerGenerationEnabled,
  getAvgRtf,
  getLastRtf,
} from './kokoroLoader';
export type { AiEngine } from './kokoroLoader';
export {
  KOKORO_VOICE_LIST,
  resolveKokoroVoice,
  DEFAULT_KOKORO_VOICE,
  isKokoroVoiceId,
} from './kokoroVoices';
export type { KokoroVoiceId, KokoroVoiceMeta } from './kokoroVoices';
export {
  setKokoroBookContext,
  setKokoroVoiceOverride,
  getKokoroVoiceOverride,
} from './kokoroProvider';
export { applyPronunciations, loadPronunciations, savePronunciations } from './pronunciation';
export { getCachedAudio, putCachedAudio, clearBookAudioCache, countCachedForBook } from './audioCache';
export {
  PREPARE_MODE_TARGETS,
  PREPARE_MODE_LABELS,
  effectiveBufferSec,
  adaptiveMaxChars,
  KOKORO_CACHE_VERSION,
  KOKORO_MODEL_ID,
} from './bufferConfig';
export type { PrepareMode, BufferTargets } from './bufferConfig';

/** Resolve active TTS — Kokoro AI free by default. */
export function getActiveTtsProvider(): TtsProvider {
  const engine = getVoiceEngine();
  const { provider, proxyUrl } = getTtsRuntimeConfig();

  if (engine === 'kokoro') return createKokoroProvider();
  if (engine === 'device') return createBrowserSpeechProvider();
  if (engine === 'elevenlabs') {
    if (hasKey('elevenlabs')) {
      const premium = createPremiumTtsProvider({ provider: 'elevenlabs', proxyUrl });
      if (premium.isAvailable()) return premium;
    }
    return createKokoroProvider();
  }
  if (provider !== 'none' && hasKey(provider)) {
    const premium = createPremiumTtsProvider({ provider, proxyUrl });
    if (premium.isAvailable()) return premium;
  }
  return createKokoroProvider();
}

export function getBrowserProvider() {
  return createBrowserSpeechProvider();
}

export function getKokoroProvider() {
  return createKokoroProvider();
}
