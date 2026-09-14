/** Simple pronunciation dictionary stub — replace tokens before TTS. */
const STORE_KEY = 'auralis.pronunciation';

export type PronunciationMap = Record<string, string>;

export function loadPronunciations(): PronunciationMap {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PronunciationMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function savePronunciations(map: PronunciationMap): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(map));
}

export function applyPronunciations(text: string, map?: PronunciationMap): string {
  const dict = map ?? loadPronunciations();
  const entries = Object.entries(dict).filter(([k, v]) => k && v);
  if (!entries.length) return text;
  // Longer keys first so "Kaelith" wins over "Kael"
  entries.sort((a, b) => b[0].length - a[0].length);
  let out = text;
  for (const [from, to] of entries) {
    const re = new RegExp('\\b' + escapeRegExp(from) + '\\b', 'gi');
    out = out.replace(re, to);
  }
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
