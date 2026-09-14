import type { DocumentRecord, MappedVoice, TextChunk } from '../types';
import { VOICE_PRESETS } from './voices';
import { getActiveTtsProvider, getBrowserProvider, type TtsProvider, type TtsResult } from './tts';
import { estimateReadingSeconds } from './textProcess';

export type PlayerListener = (snap: PlayerSnapshot) => void;

export interface PlayerSnapshot {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'ended';
  chunkIndex: number;
  speed: number;
  volume: number;
  voicePresetId: string;
  title: string;
  remainingSec: number;
}

/**
 * Queued chunk player.
 * - Free path: Web Speech utterance queue + Media Session
 * - Premium path: audio element queue with preload (when proxy configured)
 * Keep-alive silent oscillator helps some Android Chrome tabs stay active.
 */
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
  private voicePresetId = 'audiobook-narrator';
  private listeners = new Set<PlayerListener>();
  private cancelled = false;
  private currentCancel: (() => void) | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private keepAliveCtx: AudioContext | null = null;
  private keepAliveNode: OscillatorNode | null = null;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private preloadCache = new Map<number, TtsResult>();

  setMappedVoices(m: MappedVoice[]) {
    this.mapped = m;
  }

  load(doc: DocumentRecord) {
    this.stop();
    this.doc = doc;
    this.chunks = doc.chunks;
    this.chunkIndex = doc.position?.chunkIndex ?? 0;
    this.speed = doc.position?.speed ?? 1;
    this.voicePresetId = doc.position?.voicePresetId ?? 'audiobook-narrator';
    this.characterVoices = { ...doc.characterVoices };
    this.status = 'idle';
    this.provider = getActiveTtsProvider();
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
      status: this.status,
      chunkIndex: this.chunkIndex,
      speed: this.speed,
      volume: this.volume,
      voicePresetId: this.voicePresetId,
      title: this.doc?.title ?? 'Auralis',
      remainingSec: estimateReadingSeconds(remainingText, this.speed),
    };
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((fn) => fn(s));
    this.updateMediaSession();
  }

  setSpeed(speed: number) {
    this.speed = Math.min(3, Math.max(0.5, speed));
    this.emit();
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.audioEl) this.audioEl.volume = this.volume;
    this.emit();
  }

  setVoicePreset(id: string) {
    this.voicePresetId = id;
    this.emit();
  }

  setCharacterVoices(map: Record<string, string>) {
    this.characterVoices = { ...map };
  }

  seekToChunk(index: number) {
    const wasPlaying = this.status === 'playing';
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
      idx = this.chunks.findIndex((c) => c.paragraphIndex >= targetPara);
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
    this.status = 'playing';
    this.startKeepAlive();
    this.emit();
    await this.runLoop();
  }

  pause() {
    this.cancelled = true;
    this.cancelCurrent();
    this.status = 'paused';
    this.stopKeepAlive();
    this.emit();
  }

  stop() {
    this.cancelled = true;
    this.cancelCurrent();
    this.status = 'idle';
    this.stopKeepAlive();
    this.clearSleepTimer();
    this.preloadCache.clear();
    this.emit();
  }

  setSleepTimer(minutes: number | null) {
    this.clearSleepTimer();
    if (minutes == null) return;
    this.sleepTimer = setTimeout(() => {
      this.fadeAndPause();
    }, minutes * 60 * 1000);
  }

  private async fadeAndPause() {
    const start = this.volume;
    for (let i = 0; i < 10; i++) {
      this.setVolume(start * (1 - i / 10));
      await new Promise((r) => setTimeout(r, 100));
    }
    this.pause();
    this.setVolume(start);
  }

  private clearSleepTimer() {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.sleepTimer = null;
  }

  private cancelCurrent() {
    this.currentCancel?.();
    this.currentCancel = null;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
    }
    window.speechSynthesis?.cancel();
  }

  private resolvePresetId(chunk: TextChunk): string {
    if (chunk.isDialogue && this.characterVoices[chunk.speaker]) {
      return this.characterVoices[chunk.speaker];
    }
    if (this.characterVoices.narrator && !chunk.isDialogue) {
      return this.characterVoices.narrator;
    }
    return this.voicePresetId;
  }

  private async runLoop() {
    while (!this.cancelled && this.chunkIndex < this.chunks.length) {
      this.status = 'playing';
      this.emit();
      try {
        await this.playChunk(this.chunkIndex);
      } catch (e) {
        console.warn('Chunk playback error, trying fallback', e);
        try {
          await this.playChunk(this.chunkIndex, true);
        } catch (e2) {
          console.error(e2);
        }
      }
      if (this.cancelled) break;
      this.chunkIndex += 1;
      const next = this.chunks[this.chunkIndex];
      const prev = this.chunks[this.chunkIndex - 1];
      if (next && prev && next.paragraphIndex !== prev.paragraphIndex) {
        await delay(280 / this.speed);
      } else {
        await delay(80 / this.speed);
      }
    }
    if (!this.cancelled) {
      this.status = 'ended';
      this.stopKeepAlive();
      this.emit();
    }
  }

  private async playChunk(index: number, forceBrowser = false) {
    const chunk = this.chunks[index];
    if (!chunk) return;
    const presetId = this.resolvePresetId(chunk);
    const mapped = this.mapped.find((m) => m.preset.id === presetId);
    const preset = mapped?.preset ?? VOICE_PRESETS.find((p) => p.id === presetId) ?? VOICE_PRESETS[0];
    const voiceURI = mapped?.voiceURI ?? null;
    const provider = forceBrowser ? this.fallback : this.provider;

    if (provider.supportsAudioElement) {
      void this.preloadAhead(index + 1);
    }

    let result = this.preloadCache.get(index);
    this.preloadCache.delete(index);
    if (!result) {
      result = await provider.synthesize({
        chunk,
        preset,
        voiceURI,
        rate: this.speed,
        volume: this.volume,
      });
    }

    if (result.kind === 'audio') {
      await this.playAudioUrl(result.url);
    } else {
      this.currentCancel = result.cancel;
      await result.speak();
      this.currentCancel = null;
    }
  }

  private async preloadAhead(index: number) {
    if (index >= this.chunks.length || this.preloadCache.has(index)) return;
    if (!this.provider.supportsAudioElement) return;
    const chunk = this.chunks[index];
    const presetId = this.resolvePresetId(chunk);
    const mapped = this.mapped.find((m) => m.preset.id === presetId);
    const preset = mapped?.preset ?? VOICE_PRESETS[0];
    try {
      const result = await this.provider.synthesize({
        chunk,
        preset,
        voiceURI: mapped?.voiceURI ?? null,
        rate: this.speed,
        volume: this.volume,
      });
      this.preloadCache.set(index, result);
    } catch {
      /* ignore preload errors */
    }
  }

  private playAudioUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioEl) {
        this.audioEl = new Audio();
        this.audioEl.setAttribute('playsinline', 'true');
      }
      const el = this.audioEl;
      el.volume = this.volume;
      el.playbackRate = Math.min(2, Math.max(0.5, this.speed));
      const onEnd = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error('Audio element error'));
      };
      const cleanup = () => {
        el.removeEventListener('ended', onEnd);
        el.removeEventListener('error', onErr);
        URL.revokeObjectURL(url);
      };
      this.currentCancel = () => {
        el.pause();
        cleanup();
        resolve();
      };
      el.addEventListener('ended', onEnd);
      el.addEventListener('error', onErr);
      el.src = url;
      void el.play().catch(reject);
    });
  }

  private startKeepAlive() {
    try {
      if (!this.keepAliveCtx) {
        this.keepAliveCtx = new AudioContext();
      }
      if (this.keepAliveCtx.state === 'suspended') void this.keepAliveCtx.resume();
      if (!this.keepAliveNode) {
        const osc = this.keepAliveCtx.createOscillator();
        const gain = this.keepAliveCtx.createGain();
        gain.gain.value = 0.0001;
        osc.frequency.value = 20;
        osc.connect(gain);
        gain.connect(this.keepAliveCtx.destination);
        osc.start();
        this.keepAliveNode = osc;
      }
    } catch {
      /* ignore */
    }
  }

  private stopKeepAlive() {
    try {
      this.keepAliveNode?.stop();
      this.keepAliveNode = null;
      void this.keepAliveCtx?.close();
      this.keepAliveCtx = null;
    } catch {
      /* ignore */
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => void this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('stop', () => this.stop());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.skipParagraph(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => this.skipParagraph(1));
    try {
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        this.seekToChunk(this.chunkIndex - 1);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        this.seekToChunk(this.chunkIndex + 1);
      });
    } catch {
      /* some browsers throw on unsupported actions */
    }
  }

  private updateMediaSession() {
    if (!('mediaSession' in navigator) || !this.doc) return;
    const chunk = this.chunks[this.chunkIndex];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: this.doc.title,
      artist: 'Auralis',
      album: chunk ? `Paragraph ${chunk.paragraphIndex + 1}` : 'Listening',
    });
    navigator.mediaSession.playbackState =
      this.status === 'playing' ? 'playing' : this.status === 'paused' ? 'paused' : 'none';
  }

  getPosition() {
    return {
      chunkIndex: this.chunkIndex,
      speed: this.speed,
      voicePresetId: this.voicePresetId,
    };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const playerEngine = new PlayerEngine();
