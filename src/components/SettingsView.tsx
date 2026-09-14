import { useMemo } from 'react';
import type { AppSettings, HighlightMode, ThemeMode } from '../types';
import { detectMediaLimits } from '../lib/platform';
import { PremiumTtsCard } from './PremiumTtsCard';

export function SettingsView({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}) {
  const limits = useMemo(() => detectMediaLimits(), []);

  return (
    <div className="stack">
      <h1 className="h1">Settings</h1>

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
        <h2 className="h2">Highlighting</h2>
        <div className="chip-row">
          {([
            ['sentence', 'Sentence'],
            ['paragraph', 'Paragraph'],
            ['word', 'Word*'],
            ['none', 'None'],
          ] as [HighlightMode, string][]).map(([id, label]) => (
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
          Free path uses browser Web Speech + Media Session. Premium TTS (Settings above) plays via an{' '}
          <code>&lt;audio&gt;</code> element, which is usually more reliable with the screen locked — especially
          when installed as a PWA.
        </p>
      </div>

      <div className="card stack">
        <h2 className="h2">Privacy</h2>
        <p className="muted">
          Documents stay in your browser (IndexedDB). Nothing is uploaded to an Auralis server.
          When premium TTS is enabled, text chunks are sent to the chosen provider (ElevenLabs or OpenAI) or
          your self-hosted proxy so audio can be synthesized. API keys stay in localStorage on this device
          only. Do not use this app to bypass DRM, paywalls, or access controls.
        </p>
      </div>
    </div>
  );
}
