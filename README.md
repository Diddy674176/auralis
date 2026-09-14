# Auralis

Mobile AI audiobook-style reader — upload or paste text, listen with **Kokoro AI (free, on-device)** or device voices, continue with the screen locked.

Live: https://diddy674176.github.io/auralis/

## Features

- **Kokoro AI - Free** default TTS (`onnx-community/Kokoro-82M-v1.0-ONNX`, q8 + wasm) — no API key
- Progressive chunk generation + IndexedDB audio cache
- Media Session / lock-screen friendly HTML audio
- Device voices + optional ElevenLabs
- Document ingest (paste, PDF, OCR)

## Dev

```bash
npm install
npm run dev
npm run build
```
