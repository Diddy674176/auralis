/** All Kokoro-82M v1.0 voices with friendly adult-only preset labels. */
export type KokoroVoiceId =
  | 'af_heart'
  | 'af_alloy'
  | 'af_aoede'
  | 'af_bella'
  | 'af_jessica'
  | 'af_kore'
  | 'af_nicole'
  | 'af_nova'
  | 'af_river'
  | 'af_sarah'
  | 'af_sky'
  | 'am_adam'
  | 'am_echo'
  | 'am_eric'
  | 'am_fenrir'
  | 'am_liam'
  | 'am_michael'
  | 'am_onyx'
  | 'am_puck'
  | 'am_santa'
  | 'bf_alice'
  | 'bf_emma'
  | 'bf_isabella'
  | 'bf_lily'
  | 'bm_daniel'
  | 'bm_fable'
  | 'bm_george'
  | 'bm_lewis';

export interface KokoroVoiceMeta {
  id: KokoroVoiceId;
  label: string;
  gender: 'male' | 'female';
  locale: 'american' | 'british';
  presetId?: string;
  adultOnly?: boolean;
}

export const KOKORO_VOICE_LIST: KokoroVoiceMeta[] = [
  { id: 'af_heart', label: 'Soft Female', gender: 'female', locale: 'american', presetId: 'soft-female' },
  { id: 'af_bella', label: 'Female Narrator', gender: 'female', locale: 'american', presetId: 'female-narrator' },
  { id: 'af_sarah', label: 'Calm Female', gender: 'female', locale: 'american', presetId: 'calm-female' },
  { id: 'af_nova', label: 'Energetic Female', gender: 'female', locale: 'american', presetId: 'energetic-female' },
  { id: 'af_nicole', label: 'Mysterious Female', gender: 'female', locale: 'american', presetId: 'mysterious-female' },
  { id: 'af_jessica', label: 'Adult Sultry Female', gender: 'female', locale: 'american', presetId: 'adult-sultry-female', adultOnly: true },
  { id: 'af_aoede', label: 'Elegant Adult Female', gender: 'female', locale: 'american', presetId: 'elegant-adult-female', adultOnly: true },
  { id: 'af_alloy', label: 'Young Adult Female', gender: 'female', locale: 'american', presetId: 'young-adult-female' },
  { id: 'af_kore', label: 'Powerful Female', gender: 'female', locale: 'american', presetId: 'powerful-female' },
  { id: 'af_sky', label: 'Bright Female', gender: 'female', locale: 'american' },
  { id: 'af_river', label: 'Quiet Female', gender: 'female', locale: 'american' },
  { id: 'am_michael', label: 'Audiobook Narrator', gender: 'male', locale: 'american', presetId: 'audiobook-narrator' },
  { id: 'am_onyx', label: 'Deep Male', gender: 'male', locale: 'american', presetId: 'deep-male-narrator' },
  { id: 'am_fenrir', label: 'Fantasy Male', gender: 'male', locale: 'american', presetId: 'fantasy-narrator' },
  { id: 'am_puck', label: 'Mysterious Male', gender: 'male', locale: 'american', presetId: 'mysterious-male' },
  { id: 'am_adam', label: 'Villain Male', gender: 'male', locale: 'american', presetId: 'villain-male', adultOnly: true },
  { id: 'am_echo', label: 'Calm Male', gender: 'male', locale: 'american', presetId: 'calm-male' },
  { id: 'am_liam', label: 'Soft Male', gender: 'male', locale: 'american', presetId: 'soft-male' },
  { id: 'am_eric', label: 'Young Adult Male', gender: 'male', locale: 'american', presetId: 'young-adult-male' },
  { id: 'am_santa', label: 'Older Male', gender: 'male', locale: 'american', presetId: 'older-male' },
  { id: 'bf_emma', label: 'British Female', gender: 'female', locale: 'british', presetId: 'british-female' },
  { id: 'bf_isabella', label: 'British Calm Female', gender: 'female', locale: 'british' },
  { id: 'bf_alice', label: 'British Soft Female', gender: 'female', locale: 'british' },
  { id: 'bf_lily', label: 'British Bright Female', gender: 'female', locale: 'british' },
  { id: 'bm_george', label: 'British Male', gender: 'male', locale: 'british', presetId: 'british-male' },
  { id: 'bm_lewis', label: 'Dark Fantasy Narrator', gender: 'male', locale: 'british', presetId: 'dark-fantasy-narrator' },
  { id: 'bm_daniel', label: 'Documentary Narrator', gender: 'male', locale: 'british', presetId: 'documentary-narrator' },
  { id: 'bm_fable', label: 'Epic Storyteller', gender: 'male', locale: 'british', presetId: 'epic-storyteller' },
];

const EXTRA_PRESET_MAP: Record<string, KokoroVoiceId> = {
  'powerful-male': 'am_fenrir',
  'male-narrator': 'am_michael',
  'anime-inspired-male': 'am_puck',
  'anime-inspired-female': 'af_sky',
  'villain-female': 'af_nicole',
  'older-female': 'af_sarah',
};

export const DEFAULT_KOKORO_VOICE: KokoroVoiceId = 'af_heart';

export function isKokoroVoiceId(id: string): id is KokoroVoiceId {
  return KOKORO_VOICE_LIST.some((v) => v.id === id);
}

export function resolveKokoroVoice(presetId: string, override?: string | null): KokoroVoiceId {
  if (override && isKokoroVoiceId(override)) return override;
  if (isKokoroVoiceId(presetId)) return presetId;
  const hit = KOKORO_VOICE_LIST.find((v) => v.presetId === presetId);
  if (hit) return hit.id;
  if (EXTRA_PRESET_MAP[presetId]) return EXTRA_PRESET_MAP[presetId];
  return DEFAULT_KOKORO_VOICE;
}
