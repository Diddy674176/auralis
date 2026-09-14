import type { MappedVoice } from '../types';
import { getBrowserProvider } from '../lib/tts';

export function VoicePicker({
  open,
  onClose,
  mapped,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  mapped: MappedVoice[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (!open) return null;
  const provider = getBrowserProvider();

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="row-between">
          <h2 className="h2" style={{ margin: 0 }}>Voices</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
        <p className="muted">
          Friendly presets mapped to your device’s system voices (free Web Speech). Adult presets are adult voices only.
          Premium TTS (ElevenLabs/OpenAI) can be enabled later via config — no paid API required for MVP.
        </p>
        <div>
          {mapped.map((m) => (
            <div className="voice-item" key={m.preset.id}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {m.preset.name}
                  {m.preset.adultOnly ? <span className="badge" style={{ marginLeft: 6 }}>Adult</span> : null}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {m.systemVoice ? `${m.systemVoice.name} · ${m.systemVoice.lang}` : 'No system voice matched — browser default'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 36, padding: '0 10px' }}
                  onClick={() =>
                    void provider.preview(
                      `Hello, I am the ${m.preset.name} voice.`,
                      m.preset,
                      m.voiceURI
                    )
                  }
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
      </div>
    </div>
  );
}
