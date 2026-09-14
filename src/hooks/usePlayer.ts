import { useEffect, useState } from 'react';
import { playerEngine, type PlayerSnapshot } from '../lib/playerEngine';

export function usePlayer() {
  const [snap, setSnap] = useState<PlayerSnapshot>(() => playerEngine.snapshot());
  useEffect(() => playerEngine.subscribe(setSnap), []);
  return { snap, engine: playerEngine };
}
