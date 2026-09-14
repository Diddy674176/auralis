import { useEffect, useMemo, useRef } from 'react';
import type { DocumentRecord, HighlightMode } from '../types';
import { usePlayer } from '../hooks/usePlayer';

export function ReaderView({
  doc,
  highlightMode,
  fontSize,
  lineHeight,
}: {
  doc: DocumentRecord;
  highlightMode: HighlightMode;
  fontSize: number;
  lineHeight: number;
}) {
  const { snap, engine } = usePlayer();
  const activeRef = useRef<HTMLSpanElement | null>(null);

  const byPara = useMemo(() => {
    const map = new Map<number, typeof doc.chunks>();
    for (const c of doc.chunks) {
      const list = map.get(c.paragraphIndex) ?? [];
      list.push(c);
      map.set(c.paragraphIndex, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [doc.chunks]);

  useEffect(() => {
    if (highlightMode === 'none') return;
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [snap.chunkIndex, highlightMode]);

  const activeChunk = doc.chunks[snap.chunkIndex];
  const activePara = activeChunk?.paragraphIndex;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1 className="h1">{doc.title}</h1>
          <div className="muted">
            {doc.wordCount.toLocaleString()} words · {doc.chunks.length} sentences · {doc.source.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="reader" style={{ fontSize, lineHeight }}>
        {byPara.map(([pIdx, chunks]) => {
          const paraActive = highlightMode === 'paragraph' && pIdx === activePara;
          return (
            <p key={pIdx} className={`para ${paraActive ? 'active-para' : ''}`}>
              {chunks.map((c, i) => {
                const isActive =
                  (highlightMode === 'sentence' || highlightMode === 'word' || highlightMode === 'paragraph') &&
                  c.index === snap.chunkIndex &&
                  snap.status !== 'idle';
                return (
                  <span key={c.id}>
                    <span
                      ref={isActive ? activeRef : undefined}
                      className={`sent ${isActive ? 'active' : ''} ${c.isDialogue ? 'dialogue' : ''}`}
                      onClick={() => engine.seekToChunk(c.index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') engine.seekToChunk(c.index);
                      }}
                      role="button"
                      tabIndex={0}
                      title="Start from here"
                    >
                      {c.text}
                    </span>
                    {i < chunks.length - 1 ? ' ' : ''}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}
