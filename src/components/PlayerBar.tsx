import { usePlayer } from '../hooks/usePlayer';

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type SnapExtra = {
  modelProgress?: number | null;
  modelStatus?: string | null;
  errorMessage?: string | null;
  offerDeviceFallback?: boolean;
  buffering?: boolean;
  preparing?: boolean;
  bufferStatus?: string | null;
  bufferedSec?: number;
  generatingLabel?: string | null;
  generateProgress?: { done: number; total: number } | null;
  aiEngine?: string;
};

export function PlayerBar({
  totalChunks,
  onOpenVoices,
  visible,
  showBufferStatus = true,
}: {
  totalChunks: number;
  onOpenVoices: () => void;
  visible: boolean;
  showBufferStatus?: boolean;
}) {
  const { snap, engine } = usePlayer();
  if (!visible) return null;
  const x = snap as typeof snap & SnapExtra;
  const progress = totalChunks
    ? ((snap.chunkIndex + (snap.status === 'ended' ? 1 : 0)) / totalChunks) * 100
    : 0;
  const playing =
    snap.status === 'playing' ||
    snap.status === 'buffering' ||
    snap.status === 'preparing' ||
    !!x.buffering ||
    !!x.preparing;

  const statusLine = x.preparing
    ? x.bufferStatus || 'Preparing audio...'
    : x.buffering
      ? x.bufferStatus || 'Generating more audio...'
      : snap.status === 'ended'
        ? 'Finished'
        : `~${fmt(snap.remainingSec)} left`;

  return (
    <div className="player-bar">
      {x.modelProgress != null && x.modelProgress < 100 && (
        <div className="model-banner">
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
            {x.modelStatus || 'Downloading free AI voice model...'} ({Math.round(x.modelProgress)}%)
          </div>
          <div className="progress" aria-hidden>
            <span style={{ width: `${x.modelProgress}%` }} />
          </div>
        </div>
      )}
      {(x.preparing || x.buffering) && (
        <div className="buffer-banner muted" style={{ fontSize: 12, padding: '4px 0' }}>
          {x.bufferStatus || (x.preparing ? 'Preparing audio...' : 'Generating more audio...')}
          {typeof x.bufferedSec === 'number' ? ` · ${x.bufferedSec}s ready` : ''}
        </div>
      )}
      {showBufferStatus && !x.preparing && !x.buffering && typeof x.bufferedSec === 'number' && x.bufferedSec > 0 && (
        <div className="muted" style={{ fontSize: 11, padding: '2px 0' }}>
          Kokoro{x.aiEngine && x.aiEngine !== 'unknown' ? ` · ${x.aiEngine}` : ''} · Buffered:{' '}
          {x.bufferedSec}s
          {x.generatingLabel ? ` · ${x.generatingLabel}` : ''}
        </div>
      )}
      {x.errorMessage && (
        <div className="error-banner">
          <div style={{ fontSize: 13, marginBottom: 6 }}>{x.errorMessage}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ minHeight: 36 }}
              onClick={() => {
                (engine as { dismissError?: () => void }).dismissError?.();
                void engine.play();
              }}
            >
              Retry
            </button>
            {x.offerDeviceFallback && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 36 }}
                onClick={() => (engine as { useDeviceFallback?: () => void }).useDeviceFallback?.()}
              >
                Use device voice
              </button>
            )}
          </div>
        </div>
      )}
      <div className="progress" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="player-row">
        <div className="player-title">
          <div className="t">{snap.title}</div>
          <div className="s">
            {statusLine} · {snap.speed.toFixed(2)}x
          </div>
        </div>
        <button className="ctrl" type="button" title="Voice" onClick={onOpenVoices}>
          Voice
        </button>
        <button className="ctrl" type="button" title="Previous" onClick={() => engine.skipParagraph(-1)}>
          Prev
        </button>
        <button
          className="ctrl play"
          type="button"
          title={playing ? 'Pause' : 'Play'}
          onClick={() => (playing ? engine.pause() : void engine.play())}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="ctrl" type="button" title="Next" onClick={() => engine.skipParagraph(1)}>
          Next
        </button>
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
            <button
              key={s}
              type="button"
              className={`chip ${snap.speed === s ? 'active' : ''}`}
              onClick={() => engine.setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
