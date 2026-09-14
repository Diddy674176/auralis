import type { DocumentRecord, MappedVoice, TextChunk } from '../types';
import { VOICE_PRESETS } from './voices';
import {
  getActiveTtsProvider,
  getBrowserProvider,
  onKokoroLoadProgress,
  setKokoroBookContext,
  type TtsProvider,
  type TtsResult,
} from './tts';
import { estimateReadingSeconds } from './textProcess';

export type PlayerListener = (snap: PlayerSnapshot) => void;

export interface PlayerSnapshot {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'buffering';
  chunkIndex: number;
  speed: number;
  volume: number;
  voicePresetId: string;
  title: string;
  remainingSec: number;
  modelProgress: number | null;
  modelStatus: string | null;
  errorMessage: string | null;
  offerDeviceFallback: boolean;
  buffering: boolean;
  generateProgress: { done: number; total: number } | null;
}

const PRELOAD_AHEAD = 4;
const MAX_MEMORY_URLS = 6;

export class PlayerEngine {
  private chunks: TextChunk[] = [];
  private doc: DocumentRecord | null = null;
  private mapped: MappedVoice[] = [];
  private characterVoices: Record<string, string> = {};
  private provider: TtsProvider = getActiveTtsProvider();
  private fallback = getBrowserProvider();
  private status: PlayerSnapshot['status'] = 'idle';
  private chunkIndex = 0;
  private speed = 1;
  private volume = 1;
  private voicePresetId = 'soft-female';
  private listeners = new Set<PlayerListener>();
  private cancelled = false;
  private currentCancel: (() => void) | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private keepAliveCtx: AudioContext | null = null;
  private keepAliveNode: OscillatorNode | null = null;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private preloadCache = new Map<number, TtsResult>();
  private liveUrls: string[] = [];
  private modelProgress: number | null = null;
  private modelStatus: string | null = null;
  private errorMessage: string | null = null;
  private offerDeviceFallback = false;
  private buffering = false;
  private generateProgress: { done: number; total: number } | null = null;
  private preloadQueue: Promise<void> = Promise.resolve();
  private forceDeviceOnce = false;

  constructor() {
    onKokoroLoadProgress((pct, status) => {
      this.modelProgress = pct < 100 ? pct : null;
      this.modelStatus = pct < 100 ? status : null;
      this.emit();
    });
  }

  refreshProvider() {
    this.provider = getActiveTtsProvider();
    this.clearPreloadMemory();
  }

  setMappedVoices(m: MappedVoice[]) { this.mapped = m; }

  load(doc: DocumentRecord) {
    this.stop();
    this.doc = doc;
    this.chunks = doc.chunks;
    this.chunkIndex = doc.position?.chunkIndex ?? 0;
    this.speed = doc.position?.speed ?? 1;
    this.voicePresetId = doc.position?.voicePresetId ?? 'soft-female';
    this.characterVoices = { ...doc.characterVoices };
    this.status = 'idle';
    this.errorMessage = null;
    this.offerDeviceFallback = false;
    this.provider = getActiveTtsProvider();
    setKokoroBookContext(doc.id);
    this.emit();
    this.setupMediaSession();
  }

  subscribe(fn: PlayerListener) {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => { this.listeners.delete(fn); };
  }

  snapshot(): PlayerSnapshot {
    const remainingText = this.chunks.slice(this.chunkIndex).map((c) => c.text).join(' ');
    return {
      status: this.buffering ? 'buffering' : this.status,
      chunkIndex: this.chunkIndex,
      speed: this.speed,
      volume: this.volume,
      voicePresetId: this.voicePresetId,
      title: this.doc?.title ?? 'Auralis',
      remainingSec: estimateReadingSeconds(remainingText, this.speed),
      modelProgress: this.modelProgress,
      modelStatus: this.modelStatus,
      errorMessage: this.errorMessage,
      offerDeviceFallback: this.offerDeviceFallback,
      buffering: this.buffering,
      generateProgress: this.generateProgress,
    };
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((fn) => fn(s));
    this.updateMediaSession();
  }

  setSpeed(speed: number) { this.speed = Math.min(3, Math.max(0.5, speed)); this.emit(); }
  setVolume(v: number) { this.volume = Math.min(1, Math.max(0, v)); if (this.audioEl) this.audioEl.volume = this.volume; this.emit(); }
  setVoicePreset(id: string) { this.voicePresetId = id; this.clearPreloadMemory(); this.emit(); }
  setCharacterVoices(map: Record<string, string>) { this.characterVoices = { ...map }; }

  useDeviceFallback() {
    this.forceDeviceOnce = true;
    this.errorMessage = null;
    this.offerDeviceFallback = false;
    this.emit();
    if (this.status === 'paused' || this.status === 'idle' || this.status === 'buffering') void this.play();
  }

  dismissError() { this.errorMessage = null; this.offerDeviceFallback = false; this.emit(); }

  seekToChunk(index: number) {
    const wasPlaying = this.status === 'playing' || this.status === 'buffering';
    this.cancelCurrent();
    this.chunkIndex = Math.max(0, Math.min(this.chunks.length - 1, index));
    this.status = wasPlaying ? 'playing' : 'paused';
    this.emit();
    if (wasPlaying) void this.runLoop();
  }

  skipParagraph(dir: 1 | -1) {
    if (!this.chunks.length) return;
    const cur = this.chunks[this.chunkIndex];
    const targetPara = cur.paragraphIndex + dir;
    let idx = this.chunkIndex;
    if (dir > 0) {
      idx = this.chunks.findIndex((c) => c.paragraphIndex >} targetPara);
      if (idx < 0) idx = this.chunks.length - 1;
    } else {
      for (let i = this.chunkIndex; i >= 0; i--) {
        if (this.chunks[i].paragraphIndex <= targetPara) {
          const p = this.chunks[i].paragraphIndex;
          idx = this.chunks.findIndex((c) => c.paragraphIndex === p);
          break;
        }
      }
    }
    this.seekToChunk(idx);
  }

  async play() {
    if (!this.chunks.length) return;
    this.cancelled = false;
    this.errorMessage = null;
    this.offerDeviceFallback = false;
    this.status = 'playing';
    this.startKeepAlive();
    this.emit();
    void this.ensureBuffer(this.chunkIndex);
    await this.runLoop();
  }

  pause() {
    this.cancelled = true;
    this.cancelCurrent();
    this.status = 'paused';
    this.buffering = false;
    this.stopKeepAlive();
    this.emit();
  }

  stop() {
    this.cancelled = true;
    this.cancelCurrent();
    this.status = 'idle';
    this.buffering = false;
    this.stopKeepAlive();
    this.clearSleepTimer();
    this.clearPreloadMemory();
    this.generateProgress = null;
    this.emit();
  }

  setSleepTimer(minutes: number | null) {
    this.clearSleepTimer();
    if (minutes == null) return;
    this.sleepTimer = setTimeout(() => { void this.fadeAndPause(); }, minutes * 60 * 1000);
  }

  async generateEntireBook(onProgress?: (done: number, total: number) => void) {
    if (!this.doc || !this.chunks.length) return;
    const total = this.chunks.length;
    this.generateProgress = { done: 0, total };
    this.emit();
    for (let i = 0; i < total; i++) {
      if (this.cancelled && this.status === 'idle') break;
      await this.synthesizeIndex(i, false);
      this.generateProgress = { done: i + 1, total };
      onProgress?.(i + 1, total);
      this.emit();
    }
    this.generateProgress = null;
    this.emit();
  }

  private async fadeAndPause() {
    const start = this.volume;
    for (let i = 0; i < 10; i++) { this.setVolume(start * (1 - i / 10)); await delay(100); }
    this.pause();
    this.setVolume(start);
  }

  private clearSleepTimer() { if (this.sleepTimer) clearTimeout(this.sleepTimer); this.sleepTimer = null; }

  private cancelCurrent() {
    this.currentCancel?.();
    this.currentCancel = null;
    if (this.audioEl) { this.audioEl.pause(); this.audioEl.removeAttribute('src'); this.audioEl.load(); }
    window.speechSynthesis?.cancel();
  }

  private clearPreloadMemory() {
    for (const [, result] of this.preloadCache) { if (result.kind === 'audio') this.revokeUrl(result.url); }
    this.preloadCache.clear();
    for (const u of this.liveUrls) this.revokeUrl(u);
    this.liveUrls = [];
  }

  private trackUrl(url: string) {
    this.liveUrls.push(url);
    while (this.liveUrls.length > MAX_MEMORY_URLS) {
      const old = this.liveUrls.shift();
      if (old) this.revokeUrl(old);
    }
  }

  private revokeUrl(url: string) { try { if (url.startsWith('blob:')) URL.revokeObjectURL(url); } catch { /* */ } }

  private resolvePresetId(chunk: TextChunk): string {
    if (chunk.isDialogue && this.characterVoices[chunk.speaker]) return this.characterVoices[chunk.speaker];
    if (this.characterVoices.narrator && !chunk.isDialogue) return this.characterVoices.narrator;
    return this.voicePresetId;
  }

  private async runLoop() {
    while (!this.cancelled && this.chunkIndex < this.chunks.length) {
      this.status = 'playing';
      this.emit();
      void this.ensureBuffer(this.chunkIndex + 1);
      try {
        await this.playChunk(this.chunkIndex);
      } catch (e) {
        console.warn('Chunk playback error', e);
        this.errorMessage = 'Kokoro could not generate this section. Retry or temporarily use your device voice.';
        this.offerDeviceFallback = true;
        this.status = 'paused';
        this.buffering = false;
        this.emit();
        if (this.forceDeviceOnce) {
          this.forceDeviceOnce = false;
          try {
            await this.playChunk(this.chunkIndex, true);
            this.errorMessage = null;
            this.offerDeviceFallback = false;
          } catch (e2) { console.error(e2); break; }
        } else break;
      }
      if (this.cancelled) break;
      this.chunkIndex += 1;
      const next = this.chunks[this.chunkIndex];
      const prev = this.chunks[this.chunkIndex - 1];
      if (next && prev && next.paragraphIndex !== prev.paragraphIndex) await delay(180 / this.speed);
      else await delay(40 / this.speed);
    }
    if (!this.cancelled) { this.status = 'ended'; this.buffering = false; this.stopKeepAlive(); this.emit(); }
  }

  private ensureBuffer(fromIndex: number) {
    this.preloadQueue = this.preloadQueue.then(async () => {
      for (let i = fromIndex; i < fromIndex + PRELOAD_AHEAD && i < this.chunks.length; i++) {
        if (this.cancelled) return;
        if (this.preloadCache.has(i)) continue;
        try { await this.synthesizeIndex(i, false); } catch { /* */ }
      }
    });
    return this.preloadQueue;
  }

  private async synthesizeIndex(index: number, forceBrowser: boolean): Promise<TtsResult | null> {
    const chunk = this.chunks[index];
    if (!chunk) return null;
    if (!forceBrowser && this.preloadCache.has(index)) return this.preloadCache.get(index)!;
    const presetId = this.resolvePresetId(chunk);
    const mapped = this.mapped.find((m) => m.preset.id === presetId);
    const preset = mapped?.preset ?? VOICE_PRESETS.find((p) => p.id === presetId) ?? VOICE_PRESETS[0];
    const voiceURI = mapped?.voiceURI ?? null;
    const provider = forceBrowser || this.forceDeviceOnce ? this.fallback : this.provider;
    if (!forceBrowser && provider.supportsAudioElement) {
      this.buffering = !this.preloadCache.has(index) && index === this.chunkIndex;
      if (this.buffering) this.emit();
    }
    const result = await provider.synthesize({ chunk, preset, voiceURI, rate: this.speed, volume: this.volume });
    if (result.kind === 'audio') {
      this.trackUrl(result.url);
      this.preloadCache.set(index, result);
      for (const key of [...this.preloadCache.keys()]) {
        if (key < this.chunkIndex - 1) {
          const old = this.preloadCache.get(key);
          if (old?.kind === 'audio') this.revokeUrl(old.url);
          this.preloadCache.delete(key);
        }
      }
    }
    this.buffering = false;
    this.emit();
    return result;
  }

  private async playChunk(index: number, forceBrowser = false) {
    const chunk = this.chunks[index];
    if (!chunk) return;
    if (!forceBrowser && this.provider.supportsAudioElement) void this.ensureBuffer(index + 1);
    let result = this.preloadCache.get(index);
    this.preloadCache.delete(index);
    if (!result) {
      this.buffering = true; this.emit();
      result = (await this.synthesizeIndex(index, forceBrowser)) ?? undefined;
      this.buffering = false; this.emit();
    }
    if (!result) throw new Error('No TTS result');
    if (result.kind === 'audio') await this.playAudioUrl(result.url);
    else { this.currentCancel = result.cancel; await result.speak(); this.currentCancel = null; }
  }

  private playAudioUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioEl) { this.audioEl = new Audio(); this.audioEl.setAttribute('playsinline', 'true'); this.audioEl.preload = 'auto'; }
      const el = this.audioEl;
      el.volume = this.volume;
      el.playbackRate = Math.min(2, Math.max(0.5, this.speed));
      let settled = false;
      const onEnd = () => { if (settled) return; settled = true; cleanup(); resolve(); };
      const onErr = () => { if (settled) return; settled = true; cleanup(); reject(new Error('Audio element error')); };
      const cleanup = () => { el.removeEventListener('ended', onEnd); el.removeEventListener('error', onErr); };
      this.currentCancel = () => { if (settled) return; settled = true; el.pause(); cleanup(); resolve(); };
      el.addEventListener('ended', onEnd);
      el.addEventListener('error', onErr);
      el.src = url;
      void el.play().catch(reject);
    });
  }

  private startKeepAlive() {
    try {
      if (!this.keepAliveCtx) this.keepAliveCtx = new AudioContext();
      if (this.keepAliveCtx.state === 'suspended') void this.keepAliveCtx.resume();
      if (!this.keepAliveNode) {
        const osc = this.keepAliveCtx.createOscillator();
        const gain = this.keepAliveCtx.createGain();
        gain.gain.value = 0.0001;
        osc.frequency.value = 20;
        osc.connect(gain); gain.connect(this.keepAliveCtx.destination); osc.start();
        this.keepAliveNode = osc;
      }
    } catch { /* */ }
  }

  private stopKeepAlive() {
    try { this.keepAliveNode?.stop(); this.keepAliveNode = null; void this.keepAliveCtx?.close(); this.keepAliveCtx = null; } catch { /* */ }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => void this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('stop', () => this.stop());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.skipParagraph(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => this.skipParagraph(1));
    try {
      navigator.mediaSession.setActionHandler('seekbackward', () => this.seekToChunk(this.chunkIndex - 1));
      navigator.mediaSession.setActionHandler('seekforward', () => this.seekToChunk(this.chunkIndex + 1));
    } catch { /* */ }
  }

  private updateMediaSession() {
    if (!('mediaSession' in navigator) || !this.doc) return;
    const chunk = this.chunks[this.chunkIndex];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: this.doc.title, artist: 'Auralis',
      album: chunk ? `Paragraph ${chunk.paragraphIndex + 1}` : 'Listening',
    });
    navigator.mediaSession.playbackState =
      this.status === 'playing' || this.status === 'buffering' ? 'playing' : this.status === 'paused' ? 'paused' : 'none';
  }

  getPosition() {
    return { chunkIndex: this.chunkIndex, speed: this.speed, voicePresetId: this.voicePresetId };
  }
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export const playerEngine = new PlayerEngine();
