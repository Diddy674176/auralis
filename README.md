# Auralis

Mobile AI audiobook-style reader — upload or paste text, listen with **Kokoro AI (free, on-device)** or device voices, continue with the screen locked.

Live: https://diddy674176.github.io/auralis/

## Features

- **Kokoro AI - Free** default TTS (`onnx-community/Kokoro-82M-v1.0-ONNX`, q8)
- **WebGPU first**, automatic **WASM** fallback — Diagnostics shows **AI Engine**
- Worker-based generation when WASM + Worker are available (UI stays responsive)
- Intelligent buffering: Fast Start / **Balanced** (default) / Smooth Playback
- Speed-aware buffer targets · larger buffer when screen locks (60–120s)
- Dual HTML audio elements for gapless-ish chunk swap · stable Media Session
- IndexedDB audio cache (never regenerate; voice switch = separate cache)
- Device voice fallback preserves listening position
- Document ingest (paste, PDF, OCR)

## Dev

```bash
npm install
npm run dev
npm run build
```

## Phone test checklist

1. Open the live site on Android Chrome; install PWA if prompted.
2. Upload a long book (~65k words) or paste a long chapter.
3. Settings → Voice engine → Kokoro AI - Free; pick a voice.
4. Press Play → see **Preparing audio…** until ~30–60s buffered (Balanced).
5. Listen across several chunks without stutter; buffer status should stay ahead.
6. Change speed to 1.5x / 2x — buffer target should grow.
7. Lock the screen; unlock later — position correct, generation resumes.
8. Replay an earlier section — loads from cache (no re-gen).
9. Settings → Diagnostics: confirm **AI Engine: WebGPU** or **WASM**.
10. If Kokoro falls behind, use **Use device voice** — same position.
