# Auralis TTS proxy (Cloudflare Worker)

Browsers calling OpenAI / ElevenLabs from GitHub Pages often hit **CORS**. This Worker accepts a POST from the Auralis origin, calls the provider server-side with the **user-supplied** API key (from the request body — not stored on the Worker), and returns `audio/mpeg`.

## Deploy

1. `npm i -g wrangler` (or use the Cloudflare dashboard → Workers → Create).
2. From this folder: `wrangler deploy`
3. Copy the Worker URL (e.g. `https://auralis-tts-proxy.<you>.workers.dev`) into **Auralis → Settings → Premium voices → CORS proxy URL**.

## Request

```json
{
  "provider": "openai",
  "text": "Hello",
  "voice": "audiobook-narrator",
  "rate": 1,
  "apiKey": "sk-..."
}
```

Allowed browser origins: `https://diddy674176.github.io`, localhost Vite.

**Security note:** The key still leaves the user’s device (to your Worker, then to the TTS vendor). Prefer a Worker you control. Do not log `apiKey`.
