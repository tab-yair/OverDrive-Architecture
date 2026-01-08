import { useEffect, useState } from 'react';

/**
 * useFilesEvents
 * Listens to global 'files-updated' events and exposes
 * the latest detail and a tick value to trigger reloads.
 */
export default function useFilesEvents() {
  const [tick, setTick] = useState(0);
  const [lastDetail, setLastDetail] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setLastDetail(e.detail ?? null);
      setTick((x) => x + 1);
    };
    window.addEventListener('files-updated', handler);
    return () => window.removeEventListener('files-updated', handler);
  }, []);

  return { tick, lastDetail };
}
