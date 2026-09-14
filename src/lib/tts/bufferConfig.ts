/** Buffer / prepare modes for Kokoro streaming playback. */

export type PrepareMode = 'fast' | 'balanced' | 'smooth';

export interface BufferTargets {
  /** Seconds of audio to have ready before first play() starts. */
  initialSec: number;
  /** Soft floor — below this, raise generation priority / show buffering UI. */
  minSec: number;
  /** Steady-state target during playback. */
  targetSec: number;
  /** Pause low-priority generation above this. */
  maxSec: number;
  /** Extra target when document is hidden / phone likely locked. */
  lockSec: number;
}

export const PREPARE_MODE_TARGETS: Record<PrepareMode, BufferTargets> = {
  fast: { initialSec: 20, minSec: 12, targetSec: 35, maxSec: 60, lockSec: 60 },
  balanced: { initialSec: 45, minSec: 20, targetSec: 55, maxSec: 90, lockSec: 90 },
  smooth: { initialSec: 75, minSec: 35, targetSec: 90, maxSec: 120, lockSec: 120 },
};

export const PREPARE_MODE_LABELS: Record<PrepareMode, string> = {
  fast: 'Fast Start',
  balanced: 'Balanced',
  smooth: 'Smooth Playback',
};

/** Effective listening buffer = base * playbackRate (faster consume needs more ahead). */
export function effectiveBufferSec(baseSec: number, playbackRate: number, batterySaver: boolean): number {
  const rate = Math.min(3, Math.max(0.5, playbackRate || 1));
  const scaled = baseSec * rate;
  return batterySaver ? Math.min(scaled, baseSec * 1.15) : scaled;
}

/** Adaptive text chunk size for Kokoro generation (chars). */
export function adaptiveMaxChars(rtf: number | null, batterySaver: boolean): number {
  // rtf = genTime / audioDuration; lower is better (<1 means ahead of realtime)
  let max = 650;
  if (rtf != null) {
    if (rtf > 1.4) max = 400;
    else if (rtf > 1.0) max = 520;
    else if (rtf < 0.45) max = 900;
    else max = 700;
  }
  if (batterySaver) max = Math.min(max, 480);
  return max;
}

export const KOKORO_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export const KOKORO_CACHE_VERSION = 'kokoro-82m-q8-v1';
