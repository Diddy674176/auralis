import type { MappedVoice, VoicePreset } from '../types';

/** Adult voice presets only — labels describe adult narrators/characters. */
export const VOICE_PRESETS: VoicePreset[] = [
  { id: 'deep-male-narrator', name: 'Deep Male Narrator', gender: 'male', style: 'narrator', matchHints: ['daniel', 'david', 'alex', 'microsoft david', 'google us english male', 'fred'], pitch: 0.85, rateBias: 0.95 },
  { id: 'young-adult-male', name: 'Young Adult Male', gender: 'male', style: 'casual', matchHints: ['thomas', 'aaron', 'google uk english male', 'microsoft mark'], pitch: 1.05, rateBias: 1.05 },
  { id: 'calm-male', name: 'Calm Male', gender: 'male', style: 'calm', matchHints: ['james', 'george', 'microsoft guy'], pitch: 0.95, rateBias: 0.9 },
  { id: 'powerful-male', name: 'Powerful Male', gender: 'male', style: 'dramatic', matchHints: ['bruce', 'reed', 'ravi'], pitch: 0.8, rateBias: 1.0 },
  { id: 'mysterious-male', name: 'Mysterious Male', gender: 'male', style: 'mystery', matchHints: ['oliver', 'arthur', 'lee'], pitch: 0.9, rateBias: 0.88 },
  { id: 'villain-male', name: 'Villain Male', gender: 'male', style: 'villain', adultOnly: true, matchHints: ['tom', 'paul', 'albert'], pitch: 0.75, rateBias: 0.92 },
  { id: 'older-male', name: 'Older Male', gender: 'male', style: 'elder', matchHints: ['ralph', 'albert', 'microsoft david'], pitch: 0.82, rateBias: 0.85 },
  { id: 'soft-male', name: 'Soft Male', gender: 'male', style: 'soft', matchHints: ['nathan', 'eddy', 'google australia'], pitch: 1.0, rateBias: 0.95 },
  { id: 'anime-inspired-male', name: 'Anime-Inspired Male', gender: 'male', style: 'anime', adultOnly: true, matchHints: ['kyoko', 'ichiro', 'google 日本語', 'ja-jp'], pitch: 1.1, rateBias: 1.08 },
  { id: 'female-narrator', name: 'Female Narrator', gender: 'female', style: 'narrator', matchHints: ['samantha', 'karen', 'microsoft zira', 'google us english female', 'victoria'], pitch: 1.0, rateBias: 0.98 },
  { id: 'young-adult-female', name: 'Young Adult Female', gender: 'female', style: 'casual', matchHints: ['karen', 'moira', 'google uk english female', 'microsoft jenny'], pitch: 1.08, rateBias: 1.05 },
  { id: 'soft-female', name: 'Soft Female', gender: 'female', style: 'soft', matchHints: ['fiona', 'tessa', 'microsoft aria'], pitch: 1.05, rateBias: 0.92 },
  { id: 'calm-female', name: 'Calm Female', gender: 'female', style: 'calm', matchHints: ['susan', 'veena', 'catherine'], pitch: 0.98, rateBias: 0.9 },
  { id: 'energetic-female', name: 'Energetic Female', gender: 'female', style: 'energetic', matchHints: ['kathy', 'microsoft michelle', 'google'], pitch: 1.12, rateBias: 1.12 },
  { id: 'mysterious-female', name: 'Mysterious Female', gender: 'female', style: 'mystery', matchHints: ['serena', 'amelie', 'microsoft elsa'], pitch: 0.95, rateBias: 0.88 },
  { id: 'powerful-female', name: 'Powerful Female', gender: 'female', style: 'dramatic', matchHints: ['hazel', 'anna', 'microsoft sona'], pitch: 0.92, rateBias: 1.0 },
  { id: 'adult-sultry-female', name: 'Adult Sultry Female', gender: 'female', style: 'sultry', adultOnly: true, matchHints: ['samantha', 'moira', 'victoria'], pitch: 0.9, rateBias: 0.85 },
  { id: 'elegant-adult-female', name: 'Elegant Adult Female', gender: 'female', style: 'elegant', adultOnly: true, matchHints: ['karen', 'fiona', 'serena'], pitch: 0.97, rateBias: 0.93 },
  { id: 'villain-female', name: 'Villain Female', gender: 'female', style: 'villain', adultOnly: true, matchHints: ['alice', 'microsoft hoda'], pitch: 0.88, rateBias: 0.9 },
  { id: 'older-female', name: 'Older Female', gender: 'female', style: 'elder', matchHints: ['grandma', 'martha', 'microsoft helena'], pitch: 0.9, rateBias: 0.85 },
  { id: 'anime-inspired-female', name: 'Anime-Inspired Female', gender: 'female', style: 'anime', adultOnly: true, matchHints: ['kyoko', 'google 日本語', 'ja-jp', 'meijia'], pitch: 1.15, rateBias: 1.1 },
  { id: 'fantasy-narrator', name: 'Fantasy Narrator', gender: 'neutral', style: 'fantasy', matchHints: ['daniel', 'samantha', 'alex'], pitch: 0.92, rateBias: 0.94 },
  { id: 'dark-fantasy-narrator', name: 'Dark Fantasy Narrator', gender: 'neutral', style: 'dark-fantasy', matchHints: ['daniel', 'tom', 'fred'], pitch: 0.8, rateBias: 0.9 },
  { id: 'epic-storyteller', name: 'Epic Storyteller', gender: 'male', style: 'epic', matchHints: ['bruce', 'daniel', 'alex'], pitch: 0.88, rateBias: 0.96 },
  { id: 'documentary-narrator', name: 'Documentary Narrator', gender: 'male', style: 'documentary', matchHints: ['daniel', 'google uk english male', 'microsoft david'], pitch: 0.95, rateBias: 0.97 },
  { id: 'audiobook-narrator', name: 'Audiobook Narrator', gender: 'female', style: 'audiobook', matchHints: ['samantha', 'karen', 'google us english female'], pitch: 1.0, rateBias: 0.98 },
];

function scoreVoice(voice: SpeechSynthesisVoice, preset: VoicePreset): number {
  const name = `${voice.name} ${voice.lang}`.toLowerCase();
  let score = 0;
  for (const hint of preset.matchHints) {
    if (name.includes(hint.toLowerCase())) score += 10;
  }
  if (preset.gender === 'female' && /female|woman|zira|samantha|karen|jenny|aria|moira|fiona/i.test(name)) score += 5;
  if (preset.gender === 'male' && /male|man|david|daniel|mark|fred|alex|guy/i.test(name)) score += 5;
  if (voice.lang.startsWith('en')) score += 3;
  if (voice.localService) score += 1;
  return score;
}

export function mapPresetsToSystemVoices(voices: SpeechSynthesisVoice[]): MappedVoice[] {
  const used = new Set<string>();
  return VOICE_PRESETS.map((preset) => {
    const ranked = [...voices]
      .map((v) => ({ v, s: scoreVoice(v, preset) }))
      .sort((a, b) => b.s - a.s);
    let best = ranked.find((r) => r.s > 0 && !used.has(r.v.voiceURI)) ?? ranked.find((r) => !used.has(r.v.voiceURI));
    if (!best && ranked[0]) best = ranked[0];
    if (best && best.s > 0) used.add(best.v.voiceURI);
    return {
      preset,
      systemVoice: best?.v ?? null,
      voiceURI: best?.v.voiceURI ?? null,
    };
  });
}

export function loadSystemVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
}
