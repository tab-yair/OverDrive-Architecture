import { useState } from 'react';
import { useAppEvent } from './useAppEvent';
import { AppEvents } from '../utils/eventManager';

/**
 * useFilesEvents
 * Listens to global 'files-updated' events and exposes
 * the latest detail and a tick value to trigger reloads.
 */
export default function useFilesEvents() {
  const [tick, setTick] = useState(0);
  const [lastDetail, setLastDetail] = useState(null);

  useAppEvent(AppEvents.FILES_UPDATED, (detail) => {
    setLastDetail(detail ?? null);
    setTick((x) => x + 1);
  });

  return { tick, lastDetail };
}
