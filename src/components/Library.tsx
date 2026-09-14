import type { DocumentRecord } from '../types';

export function Library({
  docs,
  onOpen,
  onDelete,
  onAdd,
}: {
  docs: DocumentRecord[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const reading = docs.filter((d) => !d.finished && d.position.chunkIndex > 0);
  const fresh = docs.filter((d) => !d.finished && d.position.chunkIndex === 0);
  const done = docs.filter((d) => d.finished);

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1 className="h1">Auralis</h1>
          <p className="muted" style={{ margin: 0 }}>Upload → listen → lock screen. Like an audiobook.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>+ Add</button>
      </div>

      {!docs.length && (
        <div className="empty card">
          <p>Nothing in your library yet.</p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>Add something to read</button>
        </div>
      )}

      {reading.length > 0 && (
        <section className="stack">
          <h2 className="h2">Continue</h2>
          <DocList docs={reading} onOpen={onOpen} onDelete={onDelete} continueLabel />
        </section>
      )}
      {fresh.length > 0 && (
        <section className="stack">
          <h2 className="h2">Library</h2>
          <DocList docs={fresh} onOpen={onOpen} onDelete={onDelete} />
        </section>
      )}
      {done.length > 0 && (
        <section className="stack">
          <h2 className="h2">Finished</h2>
          <DocList docs={done} onOpen={onOpen} onDelete={onDelete} />
        </section>
      )}
    </div>
  );
}

function DocList({
  docs,
  onOpen,
  onDelete,
  continueLabel,
}: {
  docs: DocumentRecord[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  continueLabel?: boolean;
}) {
  return (
    <div className="doc-grid">
      {docs.map((d) => {
        const pct = d.chunks.length ? Math.round((d.position.chunkIndex / d.chunks.length) * 100) : 0;
        return (
          <div key={d.id} className="card">
            <button type="button" className="doc-card" onClick={() => onOpen(d.id)}>
              <div className="doc-cover" style={{ background: d.coverColor || '#7c5cff' }}>
                {d.title.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {d.wordCount.toLocaleString()} words · {d.source}
                  {continueLabel ? ` · Continue ${pct}%` : ''}
                </div>
              </div>
              <span className="badge">{pct}%</span>
            </button>
            <div className="row-between" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" style={{ minHeight: 36 }} onClick={() => onOpen(d.id)}>
                {continueLabel ? 'Resume' : 'Open'}
              </button>
              <button type="button" className="btn btn-danger" style={{ minHeight: 36 }} onClick={() => onDelete(d.id)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
