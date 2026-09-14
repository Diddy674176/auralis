import { useState } from 'react';
import type { DocumentRecord } from '../types';
import { createDocument } from '../lib/documents';

type Tab = 'paste' | 'file' | 'url' | 'image';

export function ImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (doc: DocumentRecord) => void;
}) {
  const [tab, setTab] = useState<Tab>('paste');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  if (!open) return null;

  async function finish(docTitle: string, body: string, source: DocumentRecord['source']) {
    if (!body.trim()) {
      setError('No text to import.');
      return;
    }
    const doc = createDocument({ title: docTitle || 'Untitled', text: body, source });
    onImported(doc);
    setText('');
    setTitle('');
    setUrl('');
    setError(null);
    onClose();
  }

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setProgress('Reading file…');
    try {
      const name = file.name.replace(/\.[^.]+$/, '');
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const { extractPdfText } = await import('../lib/import/pdf');
        const { text: t, scannedLikely, pageCount } = await extractPdfText(file);
        if (scannedLikely) {
          setError(`This PDF appears to contain scanned pages (${pageCount} pages). Try exporting text or use Image OCR on page photos.`);
          return;
        }
        await finish(title || name, t, 'pdf');
      } else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
        const t = await file.text();
        await finish(title || name, t, 'txt');
      } else if (file.name.toLowerCase().endsWith('.epub')) {
        setError('EPUB support is coming next. For now, convert to TXT/PDF or paste text.');
      } else {
        setError('This file format is not supported yet. Use TXT, PDF, or paste text.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function onImage(file: File) {
    setBusy(true);
    setError(null);
    setProgress('Running OCR… 0%');
    try {
      const { extractImageText } = await import('../lib/import/ocr');
      const { text: t, confidence } = await extractImageText(file, (p) => {
        setProgress(`Running OCR… ${Math.round(p * 100)}%`);
      });
      if (!t.trim()) {
        setError('Text could not be detected from this image.');
        return;
      }
      if (confidence < 55) {
        setProgress(`Low OCR confidence (${Math.round(confidence)}%). Review text before listening.`);
        setText(t);
        setTitle(title || file.name);
        setTab('paste');
        return;
      }
      await finish(title || file.name, t, 'image');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function onUrl() {
    setBusy(true);
    setError(null);
    setProgress('Fetching article…');
    try {
      const { extractUrlArticle } = await import('../lib/import/url');
      const { title: tTitle, text: t, via } = await extractUrlArticle(url.trim());
      setProgress(`Extracted via ${via}`);
      await finish(title || tTitle, t, 'url');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'URL extract failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="row-between">
          <h2 className="h2" style={{ margin: 0 }}>Add something to read</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        <div className="chip-row">
          {([
            ['paste', 'Paste'],
            ['file', 'File'],
            ['image', 'Image OCR'],
            ['url', 'Website'],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={`chip ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <input className="field" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />

        {tab === 'paste' && (
          <>
            <textarea className="field" rows={10} placeholder="Paste your text, chapter, notes…" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void finish(title || 'Pasted text', text, 'paste')}>
              Import text
            </button>
          </>
        )}
        {tab === 'file' && (
          <>
            <p className="muted">TXT or PDF (text-based). EPUB coming soon. No DRM/paywall bypass.</p>
            <input
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </>
        )}
        {tab === 'image' && (
          <>
            <p className="muted">Screenshot, worksheet, or textbook photo. OCR runs on-device via Tesseract.</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImage(f);
              }}
            />
          </>
        )}
        {tab === 'url' && (
          <>
            <p className="muted">Best-effort article extract. If CORS blocks the site, paste the article text instead.</p>
            <input className="field" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn btn-primary" type="button" disabled={busy || !url.trim()} onClick={() => void onUrl()}>
              Extract article
            </button>
          </>
        )}

        {progress && <p className="muted">{progress}</p>}
        {error && <div className="tips"><strong>Notice:</strong> {error}</div>}
      </div>
    </div>
  );
}
