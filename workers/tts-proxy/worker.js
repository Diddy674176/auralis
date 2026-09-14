/**
 * Auralis TTS CORS proxy — Cloudflare Worker sample.
 *
 * Deploy: create a Worker, paste this file, then set the Worker URL in
 * Auralis Settings → Premium voices → CORS proxy URL.
 *
 * Body (JSON): { provider: 'elevenlabs'|'openai', text, voice, rate?, apiKey }
 * Returns: audio/mpeg
 */

const ALLOWED_ORIGINS = new Set([
  'https://diddy674176.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

/** Well-known ElevenLabs default voices (same map as the app). */
const ELEVEN_VOICES = {
  'deep-male-narrator': 'pNInz6obpgDQGcFmaJgB',
  'young-adult-male': 'ErXwobaYiN019PkySvjV',
  'calm-male': 'VR6AewLTigWG4xSOukaG',
  'powerful-male': 'TxGEqnHWrfWFTfGW9XjX',
  'mysterious-male': 'yoZ06aMxZJJ28mfd3POQ',
  'villain-male': 'VR6AewLTigWG4xSOukaG',
  'older-male': 'JBFqnCBsd6RMkjVDRZzb',
  'soft-male': 'IKne3meq5aSn9XLyUdCD',
  'anime-inspired-male': 'ErXwobaYiN019PkySvjV',
  'female-narrator': '21m00Tcm4TlvDq8ikWAM',
  'young-adult-female': 'MF3mGyEYCl7XYWbV9V6O',
  'soft-female': 'EXAVITQu4vr4xnSDxMaL',
  'calm-female': 'ThT5KcBeYPX3keUQqHPh',
  'energetic-female': 'AZnzlk1XvdvUeBnXmljr',
  'mysterious-female': 'XrExE9yKIg1WjnnlVkGX',
  'powerful-female': 'LcfcDJNUP1GQjkzn1xUU',
  'adult-sultry-female': 'EXAVITQu4vr4xnSDxMaL',
  'elegant-adult-female': 'pFZP5JQG7iQjIQuC4Bku',
  'villain-female': 'AZnzlk1XvdvUeBnXmljr',
  'older-female': 'ThT5KcBeYPX3keUQqHPh',
  'anime-inspired-female': 'MF3mGyEYCl7XYWbV9V6O',
  'fantasy-narrator': 'nPczCjzI2devNBz1zQrb',
  'dark-fantasy-narrator': 'pNInz6obpgDQGcFmaJgB',
  'epic-storyteller': 'TxGEqnHWrfWFTfGW9XjX',
  'documentary-narrator': 'pNInz6obpgDQGcFmaJgB',
  'audiobook-narrator': '21m00Tcm4TlvDq8ikWAM',
};

const OPENAI_VOICES = {
  'deep-male-narrator': 'onyx',
  'young-adult-male': 'echo',
  'calm-male': 'echo',
  'powerful-male': 'onyx',
  'mysterious-male': 'fable',
  'villain-male': 'onyx',
  'older-male': 'onyx',
  'soft-male': 'alloy',
  'anime-inspired-male': 'fable',
  'female-narrator': 'nova',
  'young-adult-female': 'shimmer',
  'soft-female': 'shimmer',
  'calm-female': 'nova',
  'energetic-female': 'shimmer',
  'mysterious-female': 'nova',
  'powerful-female': 'nova',
  'adult-sultry-female': 'nova',
  'elegant-adult-female': 'nova',
  'villain-female': 'shimmer',
  'older-female': 'nova',
  'anime-inspired-female': 'shimmer',
  'fantasy-narrator': 'fable',
  'dark-fantasy-narrator': 'onyx',
  'epic-storyteller': 'onyx',
  'documentary-narrator': 'echo',
  'audiobook-narrator': 'nova',
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://diddy674176.github.io';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonError(status, message, origin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return jsonError(405, 'POST only', origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'Invalid JSON', origin);
    }

    const provider = body.provider;
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const voice = typeof body.voice === 'string' ? body.voice : 'audiobook-narrator';
    const rate = typeof body.rate === 'number' ? body.rate : 1;
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!text) return jsonError(400, 'text required', origin);
    if (!apiKey) return jsonError(400, 'apiKey required', origin);
    if (provider !== 'elevenlabs' && provider !== 'openai') {
      return jsonError(400, 'provider must be elevenlabs or openai', origin);
    }

    let upstream;
    try {
      if (provider === 'openai') {
        const oaVoice = OPENAI_VOICES[voice] || 'nova';
        const speed = Math.min(4, Math.max(0.25, rate));
        upstream = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1-hd',
            input: text,
            voice: oaVoice,
            response_format: 'mp3',
            speed,
          }),
        });
      } else {
        const voiceId = ELEVEN_VOICES[voice] || '21m00Tcm4TlvDq8ikWAM';
        upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });
      }
    } catch (e) {
      return jsonError(502, `Upstream fetch failed: ${e.message || e}`, origin);
    }

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 300);
      return jsonError(upstream.status, detail || 'Upstream error', origin);
    }

    const audio = await upstream.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        ...corsHeaders(origin),
      },
    });
  },
};
