import { getStoredProxyUrl } from './credentials';

export type VoiceEngine = 'kokoro' | 'device' | 'elevenlabs';

export type TtsRuntimeConfig = {
  /** Legacy premium provider field */
  provider: 'none' | 'elevenlabs' | 'openai';
  proxyUrl: string;
  voiceEngine: VoiceEngine;
};

let runtime: TtsRuntimeConfig = {
  provider: 'none',
  proxyUrl: '',
  voiceEngine: 'kokoro',
};

export function setTtsRuntimeConfig(partial: Partial<TtsRuntimeConfig>) {
  runtime = {
    provider: partial.provider ?? runtime.provider,
    proxyUrl:
      partial.proxyUrl !== undefined ? partial.proxyUrl.trim() : runtime.proxyUrl,
    voiceEngine: partial.voiceEngine ?? runtime.voiceEngine,
  };
}

export function getTtsRuntimeConfig(): TtsRuntimeConfig {
  const envProvider =
    (import.meta.env.VITE_TTS_PROVIDER as TtsRuntimeConfig['provider'] | undefined) ||
    undefined;
  const envProxy = (import.meta.env.VITE_TTS_PROXY_URL as string | undefined)?.trim() || '';

  let provider = runtime.provider;
  if (provider === 'none' && envProvider && envProvider !== 'none') {
    provider = envProvider;
  }

  const proxyUrl = runtime.proxyUrl || getStoredProxyUrl() || envProxy;
  let voiceEngine = runtime.voiceEngine;

  // Sync: if user picks ElevenLabs premium without setting voiceEngine, treat as elevenlabs
  if (voiceEngine === 'kokoro' && provider === 'elevenlabs') {
    // keep kokoro as default unless voiceEngine explicitly elevenlabs
  }

  return { provider, proxyUrl, voiceEngine };
}

export function getVoiceEngine(): VoiceEngine {
  return getTtsRuntimeConfig().voiceEngine;
}
