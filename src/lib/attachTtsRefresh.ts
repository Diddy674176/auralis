import { getActiveTtsProvider } from './tts';
import { playerEngine } from './playerEngine';

type Refreshable = {
  refreshProvider?: () => void;
  provider: unknown;
  preloadCache: Map<number, unknown>;
};

/** Attach refreshProvider onto the singleton at runtime. */
export function attachTtsRefresh() {
  const eng = playerEngine as unknown as Refreshable;
  if (typeof eng.refreshProvider === 'function') return;
  eng.refreshProvider = () => {
    eng.provider = getActiveTtsProvider();
    eng.preloadCache.clear();
  };
}

attachTtsRefresh();
