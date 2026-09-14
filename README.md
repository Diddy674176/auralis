# Auralis

Mobile-friendly AI reading app: **upload / paste → listen with natural system voices → highlight as it reads → lock screen & keep going** (best-effort via Media Session + PWA).

**Live (GitHub Pages):** https://diddy674176.github.io/auralis/

> If that URL 404s, enable **Settings → Pages → Source: GitHub Actions** on this repo (the workflow `.github/workflows/deploy-pages.yml` builds and deploys on push to `main`).

## What works (MVP)

| Feature | Status |
|--------|--------|
| Paste text / TXT / PDF (pdf.js) | ✅ |
| Image OCR (tesseract.js, on-device) | ✅ |
| URL article extract (CORS best-effort + paste fallback) | ✅ |
| Queued sentence/paragraph playback | ✅ |
| Speed 0.5×–3× | ✅ |
| Voice presets mapped to system voices + preview | ✅ Adult labels only |
| Live sentence highlight + auto-scroll | ✅ |
| Media Session metadata + play/pause/skip | ✅ |
| IndexedDB library + resume position | ✅ |
| Character voice manager (dialogue split + manual map) | ✅ stub |
| PWA installable | ✅ |
| Premium TTS (ElevenLabs / OpenAI) | ✅ Settings UI — keys on-device; optional CORS Worker |

**Not in this MVP (next):** EPUB, DOCX, richer OCR column layout, emotion-driven delivery, AI explain/study mode, full audiobook pre-generation cache.

## Voice reality

- **Free baseline:** Browser **Web Speech API** (`speechSynthesis`) with friendly preset names mapped to available system voices.
- **Premium:** In **Settings → Premium voices**, pick **ElevenLabs** or **OpenAI**, paste your API key (saved in `localStorage` on this device only — never committed, never stored in IndexedDB exports). Playback uses an `<audio>` element (better lock-screen behavior on many phones).
- **CORS:** If the browser blocks vendor APIs, deploy [`workers/tts-proxy/`](workers/tts-proxy/) and paste the Worker URL into Settings. See [docs/tts-proxy.md](docs/tts-proxy.md).
- Optional build-time env (`VITE_TTS_PROVIDER`, `VITE_TTS_PROXY_URL`) still works as an override when Settings provider is “Browser”.

## Enable premium TTS (quick)

1. Open the live app → **Settings**
2. Under **Premium voices**, choose **ElevenLabs** or **OpenAI**
3. Paste a key from [ElevenLabs API keys](https://elevenlabs.io/app/settings/api-keys) or [OpenAI API keys](https://platform.openai.com/api-keys) → **Save key**
4. Tap **Test voice**
5. If you see a CORS / “browser blocked” error, deploy the sample Worker and paste its URL into **CORS proxy URL**

## Mobile / lock-screen limits (honest)

- **Android Chrome:** Often continues with screen locked when Media Session is active; **install PWA** for best results. Battery optimization can still kill tabs.
- **iOS Safari:** Web Speech frequently **pauses when the screen locks**. Add to Home Screen helps somewhat; premium audio-element TTS is more reliable when configured.
- Lock-screen / Bluetooth controls depend on OS + browser support for Media Session action handlers.

## Privacy & legality

- Documents stay **on-device** (IndexedDB).
- API keys for premium TTS stay in **localStorage** on this device; when premium is enabled, text chunks are sent to the chosen provider (or your proxy) for synthesis.
- No DRM / paywall / password bypass.
- Only process content you are allowed to access.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
```

Optional `.env` (see `.env.example`) — Settings UI is the primary way to configure premium TTS.
