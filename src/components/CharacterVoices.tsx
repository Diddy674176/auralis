import { extractCharacters } from '../lib/textProcess';
import type { DocumentRecord, MappedVoice } from '../types';

export function CharacterVoices({
  open,
  onClose,
  doc,
  mapped,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  doc: DocumentRecord;
  mapped: MappedVoice[];
  onChange: (map: Record<string, string>) => void;
}) {
  if (!open) return null;
  const characters = extractCharacters(doc.chunks);
  const map = { ...doc.characterVoices };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal stack" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="row-between">
          <h2 className="h2" style={{ margin: 0 }}>Character voices</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
        <p className="muted">
          Dialogue is split by quotes. Assign voices manually for now — auto speaker ID improves over time.
          Unassigned dialogue uses your main narrator voice.
        </p>
        {characters.map((name) => (
          <label key={name} className="stack" style={{ gap: 6 }}>
            <span style={{ fontWeight: 650 }}>{name === 'narrator' ? 'Narrator' : name}</span>
            <select
              className="field"
              value={map[name] || ''}
              onChange={(e) => {
                const next = { ...map };
                if (e.target.value) next[name] = e.target.value;
                else delete next[name];
                onChange(next);
              }}
            >
              <option value="">Default / main voice</option>
              {mapped.map((m) => (
                <option key={m.preset.id} value={m.preset.id}>
                  {m.preset.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        {characters.length <= 1 && (
          <div className="tips">No named dialogue speakers detected yet. Quoted lines still play; add names in attributions like “Hello,” said Maya.</div>
        )}
      </div>
    </div>
  );
}
