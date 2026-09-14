# Auralis

**Default voice engine: [Kokoro-82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)** via `kokoro-js` (free, local, no API key). Device Web Speech and optional ElevenLabs remain available.

Mobile-friendly AI reading app: **upload / paste → listen with natural system voices → highlight as it reads → lock screen & keep going** (best-effort via Media Session + PWA).

**Live (GitHub Pages):** https://diddy674176.github.io/auralis/

## Develop

```bash
npm install
npm run build
```

Kokoro model downloads once in-browser from Hugging Face (q8 + wasm). No API keys required for the free path.
