import { getStoredProxyUrl } from './credentials';

export type TtsRuntimeConfig = {
  provider: 'none' | 'elevenlabs' | 'openai';
  proxyUrl: string;
};

let runtime: TtsRuntimeConfig = {
  provider: 'none',
  proxyUrl: '',
};

/**
 * Call whenever AppSettings load or change so getActiveTtsProvider()
 * sees runtime provider/proxy instead of only build-time env.
 */
export function setTtsRuntimeConfig(partial: Partial<TtsRuntimeConfig>) {
  runtime = {
    provider: partial.provider ?? runtime.provider,
    proxyUrl:
      partial.proxyUrl !== undefined ? partial.proxyUrl.trim() : runtime.proxyUrl,
  };
}

export function getTtsRuntimeConfig(): TtsRuntimeConfig {
  const envProvider =
    (import.meta.env.VITE_TTS_PROVIDER as TtsRuntimeConfig['provider'] | undefined) ||
    undefined;
  const envProxy = (import.meta.env.VITE_TTS_PROXY_URL as string | undefined)?.trim() || '';

  // Settings/runtime is primary; env is optional override when settings provider is none
  let provider = runtime.provider;
  if (provider === 'none' && envProvider && envProvider !== 'none') {
    provider = envProvider;
  }

  const proxyUrl = runtime.proxyUrl || getStoredProxyUrl() || envProxy;

  return { provider, proxyUrl };
}
