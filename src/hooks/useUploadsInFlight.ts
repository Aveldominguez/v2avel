import { useEffect, useState } from 'react';
import { subscribeUploads } from '@/lib/uploadTracker';

/** Número de adjuntos subiéndose ahora mismo, para bloquear el guardado. */
export function useUploadsInFlight(): number {
  const [n, setN] = useState(0);
  useEffect(() => subscribeUploads(setN), []);
  return n;
}
