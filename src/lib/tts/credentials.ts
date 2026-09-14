export type PremiumProvider = 'elevenlabs' | 'openai';

const KEYS = {
  elevenlabs: 'auralis.tts.elevenlabs.key',
  openai: 'auralis.tts.openai.key',
  proxyUrl: 'auralis.tts.proxyUrl',
} as const;

function safeGet(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() ?? '';
  } catch {
    return '';
  }
}

function safeSet(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* private mode / quota */
  }
}

export function getApiKey(provider: PremiumProvider): string {
  return safeGet(KEYS[provider]);
}

export function setApiKey(provider: PremiumProvider, key: string) {
  safeSet(KEYS[provider], key.trim());
}

export function clearApiKey(provider: PremiumProvider) {
  safeSet(KEYS[provider], '');
}

export function hasKey(provider: PremiumProvider): boolean {
  return getApiKey(provider).length > 0;
}

/** Proxy URL may also live in AppSettings; localStorage is a secondary fallback. */
export function getStoredProxyUrl(): string {
  return safeGet(KEYS.proxyUrl);
}

export function setStoredProxyUrl(url: string) {
  safeSet(KEYS.proxyUrl, url.trim());
}

export function clearStoredProxyUrl() {
  safeSet(KEYS.proxyUrl, '');
}

export function anyPremiumKeyConfigured(): boolean {
  return hasKey('elevenlabs') || hasKey('openai');
}
