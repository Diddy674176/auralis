import { playerEngine } from './playerEngine';

/** Ensure refreshProvider exists (idempotent — PlayerEngine already defines it). */
export function attachTtsRefresh() {
  if (typeof playerEngine.refreshProvider !== 'function') {
    console.warn('PlayerEngine.refreshProvider missing');
  }
}

attachTtsRefresh();
