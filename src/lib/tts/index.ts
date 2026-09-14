import { createBrowserSpeechProvider } from './browserSpeech';
import { createPremiumTtsProvider } from './premium';
import { getTtsRuntimeConfig } from './runtimeConfig';
import { hasKey } from './credentials';
import type { TtsProvider } from './types';

export type { TtsProvider, TtsRequest, TtsResult } from './types';
export { setTtsRuntimeConfig, getTtsRuntimeConfig } from './runtimeConfig';
export {
  getApiKey,
  setApiKey,
  clearApiKey,
  hasKey,
  getStoredProxyUrl,
  setStoredProxyUrl,
} from './credentials';

/**
 * Resolve active TTS provider from runtime AppSettings (+ optional env override).
 * Premium when provider is elevenlabs/openai AND a localStorage key is present.
 */
export function getActiveTtsProvider(): TtsProvider {
  const { provider, proxyUrl } = getTtsRuntimeConfig();
  if (provider !== 'none' && hasKey(provider)) {
    const premium = createPremiumTtsProvider({ provider, proxyUrl });
    if (premium.isAvailable()) return premium;
  }
  return createBrowserSpeechProvider();
}

export function getBrowserProvider() {
  return createBrowserSpeechProvider();
}
