import type { VoicePreset } from '../../types';

/** Classic OpenAI TTS voices */
export type OpenAiVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Well-known public ElevenLabs default voice IDs
 * (Rachel, Adam, Antoni, Bella/Sarah, Elli, Josh, Arnold, Sam, Domi, Dorothy, …)
 */
const ELEVEN: Record<string, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  adam: 'pNInz6obpgDQGcFmaJgB',
  antoni: 'ErXwobaYiN019PkySvjV',
  bella: 'EXAVITQu4vr4xnSDxMaL', // historically Bella; catalog may label Sarah
  elli: 'MF3mGyEYCl7XYWbV9V6O',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  arnold: 'VR6AewLTigWG4xSOukaG',
  sam: 'yoZ06aMxZJJ28mfd3POQ',
  domi: 'AZnzlk1XvdvUeBnXmljr',
  dorothy: 'ThT5KcBeYPX3keUQqHPh',
  charlie: 'IKne3meq5aSn9XLyUdCD',
  emily: 'LcfcDJNUP1GQjkzn1xUU',
  george: 'JBFqnCBsd6RMkjVDRZzb',
  matilda: 'XrExE9yKIg1WjnnlVkGX',
  brian: 'nPczCjzI2devNBz1zQrb',
  lily: 'pFZP5JQG7iQjIQuC4Bku',
};

const PRESET_TO_OPENAI: Record<string, OpenAiVoice> = {
  'deep-male-narrator': 'onyx',
  'young-adult-male': 'echo',
  'calm-male': 'echo',
  'powerful-male': 'onyx',
  'mysterious-male': 'fable',
  'villain-male': 'onyx',
  'older-male': 'onyx',
  'soft-male': 'alloy',
  'anime-inspired-male': 'fable',
  'female-narrator': 'nova',
  'young-adult-female': 'shimmer',
  'soft-female': 'shimmer',
  'calm-female': 'nova',
  'energetic-female': 'shimmer',
  'mysterious-female': 'nova',
  'powerful-female': 'nova',
  'adult-sultry-female': 'nova',
  'elegant-adult-female': 'nova',
  'villain-female': 'shimmer',
  'older-female': 'nova',
  'anime-inspired-female': 'shimmer',
  'fantasy-narrator': 'fable',
  'dark-fantasy-narrator': 'onyx',
  'epic-storyteller': 'onyx',
  'documentary-narrator': 'echo',
  'audiobook-narrator': 'nova',
};

const PRESET_TO_ELEVEN: Record<string, string> = {
  'deep-male-narrator': ELEVEN.adam,
  'young-adult-male': ELEVEN.antoni,
  'calm-male': ELEVEN.arnold,
  'powerful-male': ELEVEN.josh,
  'mysterious-male': ELEVEN.sam,
  'villain-male': ELEVEN.arnold,
  'older-male': ELEVEN.george,
  'soft-male': ELEVEN.charlie,
  'anime-inspired-male': ELEVEN.antoni,
  'female-narrator': ELEVEN.rachel,
  'young-adult-female': ELEVEN.elli,
  'soft-female': ELEVEN.bella,
  'calm-female': ELEVEN.dorothy,
  'energetic-female': ELEVEN.domi,
  'mysterious-female': ELEVEN.matilda,
  'powerful-female': ELEVEN.emily,
  'adult-sultry-female': ELEVEN.bella,
  'elegant-adult-female': ELEVEN.lily,
  'villain-female': ELEVEN.domi,
  'older-female': ELEVEN.dorothy,
  'anime-inspired-female': ELEVEN.elli,
  'fantasy-narrator': ELEVEN.brian,
  'dark-fantasy-narrator': ELEVEN.adam,
  'epic-storyteller': ELEVEN.josh,
  'documentary-narrator': ELEVEN.adam,
  'audiobook-narrator': ELEVEN.rachel,
};

export function mapPresetToOpenAiVoice(preset: VoicePreset): OpenAiVoice {
  return PRESET_TO_OPENAI[preset.id] ?? (preset.gender === 'male' ? 'onyx' : preset.gender === 'female' ? 'nova' : 'alloy');
}

export function mapPresetToElevenLabsVoiceId(preset: VoicePreset): string {
  return PRESET_TO_ELEVEN[preset.id] ?? (preset.gender === 'male' ? ELEVEN.adam : ELEVEN.rachel);
}

/** Map playback rate (app uses ~0.5–3) into OpenAI TTS speed clamp 0.25–4. */
export function clampOpenAiSpeed(rate: number): number {
  return Math.min(4, Math.max(0.25, rate));
}

/** ElevenLabs voice_settings derived from preset pitch/style. */
export function elevenVoiceSettings(preset: VoicePreset): { stability: number; similarity_boost: number } {
  const dramatic = /dramatic|villain|epic|dark|mystery|powerful/i.test(preset.style);
  const soft = /soft|calm|sultry|elegant|audiobook/i.test(preset.style);
  return {
    stability: dramatic ? 0.35 : soft ? 0.65 : 0.5,
    similarity_boost: dramatic ? 0.8 : 0.75,
  };
}
