import { usePlayer } from '../hooks/usePlayer';

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerBar({
  totalChunks,
  onOpenVoices,
  visible,
}: {
  totalChunks: number;
  onOpenVoices: () => void;
  visible: boolean;
}) {
  const { snap, engine } = usePlayer();
  if (!visible) return null;
  const progress = totalChunks ? ((snap.chunkIndex + (snap.status === 'ended' ? 1 : 0)) / totalChunks) * 100 : 0;
  const playing = snap.status === 'playing';

  return (
    <div className="player-bar">
      <div className="progress" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="player-row">
        <div className="player-title">
          <div className="t">{snap.title}</div>
          <div className="s">
            {snap.status === 'ended' ? 'Finished' : `~${fmt(snap.remainingSec)} left`} · {snap.speed.toFixed(2)}x
          </div>
        </div>
        <button className="ctrl" type="button" title="Voice" onClick={onOpenVoices}>🎙️</button>
        <button className="ctrl" type="button" title="Previous paragraph" onClick={() => engine.skipParagraph(-1)}>⏮</button>
        <button
          className="ctrl play"
          type="button"
          title={playing ? 'Pause' : 'Play'}
          onClick={() => (playing ? engine.pause() : void engine.play())}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button className="ctrl" type="button" title="Next paragraph" onClick={() => engine.skipParagraph(1)}>⏭</button>
      </div>
      <div className="row-between" style={{ marginTop: 8 }}>
        <label className="muted" style={{ fontSize: 12, flex: 1 }}>
          Speed
          <input
            className="slider"
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={snap.speed}
            onChange={(e) => engine.setSpeed(Number(e.target.value))}
          />
        </label>
        <div className="chip-row" style={{ flexShrink: 0 }}>
          {[0.75, 1, 1.25, 1.5, 2].map((s) => (
            <button key={s} type="button" className={`chip ${snap.speed === s ? 'active' : ''}`} onClick={() => engine.setSpeed(s)}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
