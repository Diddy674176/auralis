import { useState } from 'react';
import type { MappedVoice, VoiceEngine } from '../types';
import {
  getActiveTtsProvider,
  getBrowserProvider,
  getKokoroProvider,
  KOKORO_VOICE_LIST,
  setKokoroVoiceOverride,
} from '../lib/tts';
import { VOICE_PRESETS } from '../lib/voices';

export function VoicePicker({
  open,
  onClose,
  mapped,
  selectedId,
  onSelect,
  voiceEngine = 'kokoro',
  onEngineChange,
  kokoroVoiceId = 'af_heart',
  onKokoroVoiceChange,
}: {
  open: boolean;
  onClose: () => void;
  mapped: MappedVoice[];
  selectedId: string;
  onSelect: (id: string) => void;
  voiceEngine?: VoiceEngine;
  onEngineChange?: (e: VoiceEngine) => void;
  kokoroVoiceId?: string | null;
  onKokoroVoiceChange?: (id: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!open) return null;
  const engine = voiceEngine ?? 'kokoro';

  async function previewKokoro(id: string, label: string) {
    setBusy(id);
    try {
      setKokoroVoiceOverride(id);
      const preset = VOICE_PRESETS.find((p) => p.id === selectedId) ?? VOICE_PRESETS[0];
      await getKokoroProvider().preview(`Hello, I am the ${label} voice in Auralis.`, preset, null);
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="row-between">
          <h2 className="h2" style={{ margin: 0 }}>Voices</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
        <label className="muted">Voice engine</label>
        <div className="chip-row">
          {([['kokoro', 'Kokoro AI - Free'], ['device', 'Device Voices'], ['elevenlabs', 'ElevenLabs']] as [VoiceEngine, string][]).map(
            ([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip ${engine === id ? 'active' : ''}`}
                onClick={() => onEngineChange?.(id)}
              >
                {label}
              </button>
            ),
          )}
        </div>
        <p className="muted">
          {engine === 'kokoro'
            ? 'Free local AI voices. First use downloads the model once (~80MB q8).'
            : engine === 'device'
              ? 'Browser Web Speech fallback.'
              : `Premium — ${getActiveTtsProvider().label}. Configure API key in Settings.`}
        </p>
        {engine === 'kokoro' ? (
          <div>
            {KOKORO_VOICE_LIST.map((v) => (
              <div className="voice-item" key={v.id}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {v.label}
                    {v.adultOnly ? <span className="badge" style={{ marginLeft: 6 }}>Adult</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{v.id} · {v.locale}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-secondary" style={{ minHeight: 36, padding: '0 10px' }} disabled={busy === v.id} onClick={() => void previewKokoro(v.id, v.label)}>
                    {busy === v.id ? '...' : 'Preview'}
                  </button>
                  <button
                    type="button"
                    className={`btn ${kokoroVoiceId === v.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: 36, padding: '0 10px' }}
                    onClick={() => {
                      onKokoroVoiceChange?.(v.id);
                      setKokoroVoiceOverride(v.id);
                      onSelect(v.presetId ?? v.id);
                    }}
                  >
                    {kokoroVoiceId === v.id ? 'Selected' : 'Use'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {mapped.map((m) => (
              <div className="voice-item" key={m.preset.id}>
                <div>
                  <div style={{ fontWeight: 700 }}>{m.preset.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {m.systemVoice ? `${m.systemVoice.name} · ${m.systemVoice.lang}` : 'Browser default'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: 36, padding: '0 10px' }}
                    onClick={() => void getBrowserProvider().preview(`Hello, I am the ${m.preset.name} voice.`, m.preset, m.voiceURI)}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedId === m.preset.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: 36, padding: '0 10px' }}
                    onClick={() => onSelect(m.preset.id)}
                  >
                    {selectedId === m.preset.id ? 'Selected' : 'Use'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
