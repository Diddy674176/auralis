export type HighlightMode = 'word' | 'sentence' | 'paragraph' | 'none';
export type ThemeMode = 'dark' | 'light' | 'system';
export type DocSource = 'paste' | 'txt' | 'pdf' | 'image' | 'url' | 'epub';
export type VoiceEngine = 'kokoro' | 'device' | 'elevenlabs';

export interface VoicePreset {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  style: string;
  adultOnly?: boolean;
  matchHints: string[];
  pitch: number;
  rateBias: number;
  kokoroVoice?: string;
}

export interface MappedVoice {
  preset: VoicePreset;
  systemVoice: SpeechSynthesisVoice | null;
  voiceURI: string | null;
}

export interface TextChunk {
  id: string;
  index: number;
  text: string;
  paragraphIndex: number;
  sentenceIndex: number;
  speaker: string;
  startChar: number;
  endChar: number;
  isDialogue: boolean;
}

export interface DocumentMeta {
  id: string;
  title: string;
  source: DocSource;
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  charCount: number;
  favorite?: boolean;
  finished?: boolean;
  coverColor?: string;
}

export interface DocumentRecord extends DocumentMeta {
  text: string;
  chunks: TextChunk[];
  position: { chunkIndex: number; speed: number; voicePresetId: string };
  characterVoices: Record<string, string>;
  bookmarks: Bookmark[];
  notes: Note[];
}

export interface Bookmark {
  id: string;
  name: string;
  chunkIndex: number;
  createdAt: number;
}

export interface Note {
  id: string;
  text: string;
  chunkIndex: number;
  createdAt: number;
}

export interface AppSettings {
  theme: ThemeMode;
  fontSize: number;
  lineHeight: number;
  highlightMode: HighlightMode;
  skipSeconds: number;
  sleepTimerMin: number | null;
  voiceEngine: VoiceEngine;
  kokoroVoiceId: string | null;
  premiumTts: {
    provider: 'none' | 'elevenlabs' | 'openai';
    apiKeyConfigured: boolean;
    proxyUrl?: string;
  };
  showBackgroundTips: boolean;
  pronunciation: Record<string, string>;
}

export interface MediaLimitsInfo {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  speechContinuesWhenLocked: 'likely' | 'unreliable' | 'unknown';
  mediaSessionSupported: boolean;
  tips: string[];
}
