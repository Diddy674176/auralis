import type { VoicePreset } from '../../types';
import { getApiKey } from './credentials';
import { getTtsRuntimeConfig } from './runtimeConfig';
import type { TtsProvider, TtsRequest, TtsResult } from './types';
import {
  clampOpenAiSpeed,
  elevenVoiceSettings,
  mapPresetToElevenLabsVoiceId,
  mapPresetToOpenAiVoice,
} from './voiceMap';

type ProviderKind = 'elevenlabs' | 'openai';

async function blobFromResponse(res: Response): Promise<Blob> {
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    throw new Error(`Premium TTS failed: ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  return res.blob();
}

async function synthesizeOpenAi(text: string, preset: VoicePreset, rate: number, apiKey: string): Promise<Blob> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text,
      voice: mapPresetToOpenAiVoice(preset),
      response_format: 'mp3',
      speed: clampOpenAiSpeed(rate * (preset.rateBias || 1)),
    }),
  });
  return blobFromResponse(res);
}

async function synthesizeElevenLabs(text: string, preset: VoicePreset, apiKey: string): Promise<Blob> {
  const voiceId = mapPresetToElevenLabsVoiceId(preset);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: elevenVoiceSettings(preset),
    }),
  });
  return blobFromResponse(res);
}

async function synthesizeViaProxy(
  proxyUrl: string,
  provider: ProviderKind,
  text: string,
  preset: VoicePreset,
  rate: number,
  apiKey: string,
): Promise<Blob> {
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      text,
      voice: preset.id,
      rate,
      apiKey,
    }),
  });
  return blobFromResponse(res);
}

/**
 * Try direct API call; if CORS/network fails and a proxy URL is configured, retry via proxy.
 */
async function synthesizePremium(
  provider: ProviderKind,
  text: string,
  preset: VoicePreset,
  rate: number,
): Promise<Blob> {
  const apiKey = getApiKey(provider);
  if (!apiKey) throw new Error(`No API key saved for ${provider}`);

  const { proxyUrl } = getTtsRuntimeConfig();

  // Prefer proxy when set (avoids CORS on GitHub Pages); otherwise try direct.
  if (proxyUrl) {
    try {
      return await synthesizeViaProxy(proxyUrl, provider, text, preset, rate, apiKey);
    } catch (proxyErr) {
      // Fall through to direct in case proxy is misconfigured
      console.warn('TTS proxy failed, trying direct API', proxyErr);
    }
  }

  try {
    if (provider === 'openai') return await synthesizeOpenAi(text, preset, rate, apiKey);
    return await synthesizeElevenLabs(text, preset, apiKey);
  } catch (directErr) {
    if (proxyUrl) {
      // Already tried proxy first; rethrow
      throw directErr;
    }
    // Direct failed (often CORS from browser) — surface a helpful message
    const msg = directErr instanceof Error ? directErr.message : String(directErr);
    if (/Failed to fetch|NetworkError|CORS|TypeError/i.test(msg)) {
      throw new Error(
        'Browser blocked the TTS API (CORS). Add a proxy Worker URL in Settings → Premium voices.',
      );
    }
    throw directErr;
  }
}

export function createPremiumTtsProvider(opts?: {
  provider?: 'elevenlabs' | 'openai' | 'none';
  proxyUrl?: string;
}): TtsProvider {
  const cfg = () => {
    const runtime = getTtsRuntimeConfig();
    const provider = (opts?.provider && opts.provider !== 'none' ? opts.provider : runtime.provider) as
      | ProviderKind
      | 'none';
    return { provider, proxyUrl: opts?.proxyUrl ?? runtime.proxyUrl };
  };

  return {
    id: 'premium-tts',
    label: 'Premium TTS',
    supportsAudioElement: true,
    isAvailable() {
      const { provider } = cfg();
      if (provider === 'none') return false;
      return Boolean(getApiKey(provider));
    },
    async synthesize(req: TtsRequest): Promise<TtsResult> {
      const { provider } = cfg();
      if (provider === 'none') throw new Error('Premium TTS not configured');
      const blob = await synthesizePremium(provider, req.chunk.text, req.preset, req.rate);
      return { kind: 'audio', url: URL.createObjectURL(blob) };
    },
    async preview(text: string, preset: VoicePreset) {
      const { provider } = cfg();
      if (provider === 'none') throw new Error('Premium TTS not configured');
      const blob = await synthesizePremium(provider, text, preset, 1);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      try {
        await audio.play();
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('Preview playback failed'));
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    cancelPreview() {
      /* HTMLAudioElement preview is short; nothing to cancel globally */
    },
  };
}

/** @deprecated use createPremiumTtsProvider from premium.ts */
export { createPremiumTtsProvider as createPremiumTtsProviderFromStub };
