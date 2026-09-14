import { useMemo, useState } from 'react';
import type { AppSettings, HighlightMode, ThemeMode, VoiceEngine } from '../types';
import { detectMediaLimits } from '../lib/platform';
import { PremiumTtsCard } from './PremiumTtsCard';
import { setTtsRuntimeConfig, savePronunciations, loadPronunciations } from '../lib/tts';
import { playerEngine } from '../lib/playerEngine';

export function SettingsView({
  settings,
  onChange,
  hasActiveBook,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  hasActiveBook?: boolean;
}) {
  const limits = useMemo(() => detectMediaLimits(), []);
  const [pronFrom, setPronFrom] = useState('');
  const [pronTo, setPronTo] = useState('');
  const [genBusy, setGenBusy] = useState(false);

  function setEngine(engine: VoiceEngine) {
    setTtsRuntimeConfig({ voiceEngine: engine });
    playerEngine.refreshProvider();
    onChange({ ...settings, voiceEngine: engine });
  }

  function addPronunciation() {
    const from = pronFrom.trim();
    const to = pronTo.trim();
    if (!from || !to) return;
    const next = { ...settings.pronunciation, [from]: to };
    savePronunciations(next);
    onChange({ ...settings, pronunciation: next });
    setPronFrom('');
    setPronTo('');
  }

  function removePron(key: string) {
    const next = { ...settings.pronunciation };
    delete next[key];
    savePronunciations(next);
    onChange({ ...settings, pronunciation: next });
  }

  async function generateBook() {
    setGenBusy(true);
    try {
      await playerEngine.generateEntireBook();
    } finally {
      setGenBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1 className="h1">Settings</h1>

      <div className="card stack">
        <h2 className="h2">Voice engine</h2>
        <p className="muted">
          Kokoro AI runs free in your browser — no API key, no per-character fees. Device voices are a fast
          fallback. ElevenLabs is optional premium.
        </p>
        <div className="chip-row">
          {(
            [
              ['kokoro', 'Kokoro AI - Free'],
              ['device', 'Device Voices'],
              ['elevenlabs', 'ElevenLabs'],
            ] as [VoiceEngine, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip ${settings.voiceEngine === id ? 'active' : ''}`}
              onClick={() => setEngine(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h2 className="h2">Appearance</h2>
        <label className="muted">Theme</label>
        <div className="chip-row">
          {(['dark', 'light', 'system'] as ThemeMode[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${settings.theme === t ? 'active' : ''}`}
              onClick={() => onChange({ ...settings, theme: t })}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="muted">Font size ({settings.fontSize}px)</label>
        <input
          className="slider"
          type="range"
          min={14}
          max={28}
          value={settings.fontSize}
          onChange={(e) => onChange({ ...settings, fontSize: Number(e.target.value) })}
        />
        <label className="muted">Line spacing ({settings.lineHeight.toFixed(1)})</label>
        <input
          className="slider"
          type="range"
          min={1.3}
          max={2.2}
          step={0.1}
          value={settings.lineHeight}
          onChange={(e) => onChange({ ...settings, lineHeight: Number(e.target.value) })}
        />
      </div>

      <PremiumTtsCard settings={settings} onChange={onChange} />

      <div className="card stack">
        <h2 className="h2">Pronunciation</h2>
        <p className="muted">
          Map fantasy names and acronyms (e.g. Kael → Kay-el). Applied before Kokoro / device speech.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="field"
            placeholder="Original"
            value={pronFrom}
            onChange={(e) => setPronFrom(e.target.value)}
            style={{ flex: 1, minWidth: 120 }}
          />
          <input
            className="field"
            placeholder="Pronounce as"
            value={pronTo}
            onChange={(e) => setPronTo(e.target.value)}
            style={{ flex: 1, minWidth: 120 }}
          />
          <button type="button" className="btn btn-secondary" onClick={addPronunciation}>
            Add
          </button>
        </div>
        {Object.keys(settings.pronunciation || loadPronunciations()).length === 0 ? (
          <p className="muted">No custom rules yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {Object.entries(settings.pronunciation).map(([k, v]) => (
              <li key={k} className="muted" style={{ marginBottom: 4 }}>
                <strong>{k}</strong> → {v}{' '}
                <button type="button" className="btn btn-ghost" style={{ minHeight: 28 }} onClick={() => removePron(k)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasActiveBook && settings.voiceEngine === 'kokoro' && (
        <div className="card stack">
          <h2 className="h2">Generate entire book</h2>
          <p className="muted">
            Pre-generate all Kokoro chunks for the open book and cache them locally. Default playback only
            stays a few chunks ahead to save battery — use this when you want offline lock-screen listening
            for a long stretch.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={genBusy}
            onClick={() => void generateBook()}
          >
            {genBusy ? 'Generating…' : 'Generate Entire Book'}
          </button>
        </div>
      )}

      <div className="card stack">
        <h2 className="h2">Highlighting</h2>
        <div className="chip-row">
          {(
            [
              ['sentence', 'Sentence'],
              ['paragraph', 'Paragraph'],
              ['word', 'Word*'],
              ['none', 'None'],
            ] as [HighlightMode, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip ${settings.highlightMode === id ? 'active' : ''}`}
              onClick={() => onChange({ ...settings, highlightMode: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="muted">
          * Word mode highlights the active sentence (Web Speech has no reliable per-word boundary events on
          all devices).
        </p>
      </div>

      <div className="card stack">
        <h2 className="h2">Sleep timer</h2>
        <div className="chip-row">
          {[null, 5, 10, 15, 30, 45, 60].map((m) => (
            <button
              key={String(m)}
              type="button"
              className={`chip ${settings.sleepTimerMin === m ? 'active' : ''}`}
              onClick={() => onChange({ ...settings, sleepTimerMin: m })}
            >
              {m == null ? 'Off' : `${m}m`}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h2 className="h2">Background / lock screen</h2>
        <div className="tips">
          <strong>Platform:</strong> {limits.platform} · Media Session:{' '}
          {limits.mediaSessionSupported ? 'yes' : 'no'}
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {limits.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <p className="muted">
          Kokoro generates audio ahead into real HTML <code>&lt;audio&gt;</code> blobs so playback can continue
          after lock without running WASM in the background. Install as a PWA for best results on Android.
        </p>
      </div>

      <div className="card stack">
        <h2 className="h2">Privacy</h2>
        <p className="muted">
          Documents and Kokoro audio cache stay in your browser (IndexedDB). Kokoro runs fully locally after
          the one-time model download from Hugging Face. Premium TTS (if enabled) sends text to
          ElevenLabs/OpenAI or your proxy. API keys stay in localStorage on this device only.
        </p>
      </div>
    </div>
  );
}
