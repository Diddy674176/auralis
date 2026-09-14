import { useCallback, useEffect, useMemo, useState } from 'react';
import './styles/global.css';
import type { AppSettings, DocumentRecord, MappedVoice, VoiceEngine } from './types';
import { Library } from './components/Library';
import { ReaderView } from './components/ReaderView';
import { PlayerBar } from './components/PlayerBar';
import { ImportModal } from './components/ImportModal';
import { VoicePicker } from './components/VoicePicker';
import { CharacterVoices } from './components/CharacterVoices';
import { SettingsView } from './components/SettingsView';
import {
  DEFAULT_SETTINGS,
  deleteDocument,
  listDocuments,
  loadSettings,
  saveDocument,
  saveSettings,
} from './lib/db';
import { loadSystemVoices, mapPresetsToSystemVoices } from './lib/voices';
import { playerEngine } from './lib/playerEngine';
import './lib/attachTtsRefresh';
import {
  hasKey,
  setTtsRuntimeConfig,
  setKokoroVoiceOverride,
  setKokoroBookContext,
  savePronunciations,
} from './lib/tts';
import { detectMediaLimits } from './lib/platform';
import { usePlayer } from './hooks/usePlayer';

type Tab = 'home' | 'reader' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mapped, setMapped] = useState<MappedVoice[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const [charsOpen, setCharsOpen] = useState(false);
  const [tipsDismissed, setTipsDismissed] = useState(false);
  const { snap } = usePlayer();

  const active = useMemo(() => docs.find((d) => d.id === activeId) ?? null, [docs, activeId]);
  const limits = useMemo(() => detectMediaLimits(), []);

  const refresh = useCallback(async () => {
    setDocs(await listDocuments());
  }, []);

  useEffect(() => {
    void (async () => {
      const s = await loadSettings();
      setSettings(s);
      setTtsRuntimeConfig({
        provider: s.premiumTts.provider,
        proxyUrl: s.premiumTts.proxyUrl ?? '',
        voiceEngine: s.voiceEngine ?? 'kokoro',
      });
      setKokoroVoiceOverride(s.kokoroVoiceId);
      savePronunciations(s.pronunciation ?? {});
      playerEngine.refreshProvider();
      await refresh();
      const voices = await loadSystemVoices();
      const m = mapPresetsToSystemVoices(voices);
      setMapped(m);
      playerEngine.setMappedVoices(m);
    })();
  }, [refresh]);

  useEffect(() => {
    const root = document.documentElement;
    let theme = settings.theme;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    root.setAttribute('data-theme', theme);
  }, [settings.theme]);

  useEffect(() => {
    playerEngine.setSleepTimer(settings.sleepTimerMin);
  }, [settings.sleepTimerMin]);

  useEffect(() => {
    if (!active) return;
    const pos = playerEngine.getPosition();
    const next: DocumentRecord = {
      ...active,
      position: pos,
      finished: snap.status === 'ended',
      updatedAt: Date.now(),
    };
    void saveDocument(next).then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist on playback movement
  }, [snap.chunkIndex, snap.status, snap.speed, snap.voicePresetId]);

  async function handleImported(doc: DocumentRecord) {
    await saveDocument(doc);
    await refresh();
    setActiveId(doc.id);
    setKokoroBookContext(doc.id);
    playerEngine.load(doc);
    setTab('reader');
  }

  async function openDoc(id: string) {
    const doc = (await listDocuments()).find((d) => d.id === id);
    if (!doc) return;
    setActiveId(id);
    setKokoroBookContext(doc.id);
    playerEngine.load(doc);
    setTab('reader');
  }

  async function removeDoc(id: string) {
    if (activeId === id) {
      playerEngine.stop();
      setActiveId(null);
      setTab('home');
    }
    await deleteDocument(id);
    await refresh();
  }

  async function updateSettings(s: AppSettings) {
    const next: AppSettings = {
      ...s,
      premiumTts: {
        ...s.premiumTts,
        apiKeyConfigured:
          s.premiumTts.provider === 'none' ? false : hasKey(s.premiumTts.provider),
      },
    };
    setSettings(next);
    setTtsRuntimeConfig({
      provider: next.premiumTts.provider,
      proxyUrl: next.premiumTts.proxyUrl ?? '',
      voiceEngine: next.voiceEngine,
    });
    setKokoroVoiceOverride(next.kokoroVoiceId);
    savePronunciations(next.pronunciation ?? {});
    playerEngine.refreshProvider();
    await saveSettings(next);
  }

  async function updateActive(patch: Partial<DocumentRecord>) {
    if (!active) return;
    const next = { ...active, ...patch, updatedAt: Date.now() };
    await saveDocument(next);
    await refresh();
    if (patch.characterVoices) playerEngine.setCharacterVoices(patch.characterVoices);
    if (patch.position) {
      playerEngine.setSpeed(patch.position.speed);
      playerEngine.setVoicePreset(patch.position.voicePresetId);
    }
  }

  function changeEngine(engine: VoiceEngine) {
    void updateSettings({ ...settings, voiceEngine: engine });
  }

  function changeKokoroVoice(id: string) {
    setKokoroVoiceOverride(id);
    void updateSettings({ ...settings, kokoroVoiceId: id });
  }

  return (
    <div className="app-shell">
      <main className="main-scroll">
        {tab === 'home' && (
          <Library
            docs={docs}
            onOpen={(id) => void openDoc(id)}
            onDelete={(id) => void removeDoc(id)}
            onAdd={() => setImportOpen(true)}
          />
        )}
        {tab === 'reader' && active && (
          <div className="stack">
            {!tipsDismissed && settings.showBackgroundTips && (
              <div className="tips">
                <strong>Lock-screen tip ({limits.platform}):</strong> {limits.tips[0]} With Kokoro,
                let a few chunks buffer first, then lock — audio continues via HTML media.
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: 36 }}
                    onClick={() => setTipsDismissed(true)}
                  >
                    Got it
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ minHeight: 36 }}
                    onClick={() => void updateSettings({ ...settings, showBackgroundTips: false })}
                  >
                    Don't show again
                  </button>
                </div>
              </div>
            )}
            <div className="chip-row">
              <button type="button" className="chip" onClick={() => setVoicesOpen(true)}>
                Voices
              </button>
              <button type="button" className="chip" onClick={() => setCharsOpen(true)}>
                Characters
              </button>
              <button type="button" className="chip" onClick={() => setImportOpen(true)}>
                Add more
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  const bm = {
                    id: `bm_${Date.now()}`,
                    name: `Bookmark @ sentence ${snap.chunkIndex + 1}`,
                    chunkIndex: snap.chunkIndex,
                    createdAt: Date.now(),
                  };
                  void updateActive({ bookmarks: [...active.bookmarks, bm] });
                }}
              >
                Bookmark
              </button>
            </div>
            <ReaderView
              doc={active}
              highlightMode={settings.highlightMode}
              fontSize={settings.fontSize}
              lineHeight={settings.lineHeight}
            />
          </div>
        )}
        {tab === 'reader' && !active && (
          <div className="empty card">
            <p>Open a document from your library to start listening.</p>
            <button type="button" className="btn btn-primary" onClick={() => setTab('home')}>
              Go to library
            </button>
          </div>
        )}
        {tab === 'settings' && (
          <SettingsView
            settings={settings}
            onChange={(s) => void updateSettings(s)}
            hasActiveBook={Boolean(active)}
          />
        )}
      </main>

      <PlayerBar
        visible={Boolean(active)}
        totalChunks={active?.chunks.length ?? 0}
        onOpenVoices={() => setVoicesOpen(true)}
      />

      <nav className="bottom-nav" aria-label="Main">
        <button type="button" className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>
          <span className="ico">⌂</span>Home
        </button>
        <button
          type="button"
          className={tab === 'reader' ? 'active' : ''}
          onClick={() => setTab('reader')}
        >
          <span className="ico">◎</span>Reader
        </button>
        <button
          type="button"
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          <span className="ico">⚙</span>Settings
        </button>
      </nav>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(d) => void handleImported(d)}
      />
      <VoicePicker
        open={voicesOpen}
        onClose={() => setVoicesOpen(false)}
        mapped={mapped}
        selectedId={snap.voicePresetId}
        voiceEngine={settings.voiceEngine}
        onEngineChange={changeEngine}
        kokoroVoiceId={settings.kokoroVoiceId}
        onKokoroVoiceChange={changeKokoroVoice}
        onSelect={(id) => {
          playerEngine.setVoicePreset(id);
          if (active)
            void updateActive({
              position: {
                ...active.position,
                voicePresetId: id,
                chunkIndex: snap.chunkIndex,
                speed: snap.speed,
              },
            });
        }}
      />
      {active && (
        <CharacterVoices
          open={charsOpen}
          onClose={() => setCharsOpen(false)}
          doc={active}
          mapped={mapped}
          onChange={(map) => void updateActive({ characterVoices: map })}
        />
      )}
    </div>
  );
}
