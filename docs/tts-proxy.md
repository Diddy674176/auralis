# Premium TTS & CORS proxy

Auralis can call **OpenAI** (`tts-1-hd`) or **ElevenLabs** (`eleven_multilingual_v2`) from the browser.

1. Open **Settings → Premium voices**
2. Pick ElevenLabs or OpenAI
3. Paste your API key → **Save key** (stored in `localStorage` only)
4. Tap **Test voice**

## When you need a proxy

Direct `fetch` from `https://diddy674176.github.io` to `api.openai.com` / `api.elevenlabs.io` may fail with a CORS / network error. If that happens:

1. Deploy the sample Worker in [`workers/tts-proxy/`](../workers/tts-proxy/)
2. Paste the Worker URL into **CORS proxy URL** → Save
3. Test again

The app prefers the proxy when a URL is set; otherwise it tries the vendor API directly.
