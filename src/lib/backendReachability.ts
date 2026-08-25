import {
  decideConnectivity, probeIntervalMs, type Connectivity,
} from '@/utils/connectivityState';

/**
 * Comprueba de verdad si se llega al servidor, en lugar de fiarse de
 * `navigator.onLine`, que sólo sabe si el móvil tiene red.
 *
 * La comprobación no necesita autenticación ni mira el código de respuesta:
 * cualquier respuesta HTTP —incluido un 401 o un 404— significa que se llegó.
 * Sólo cuenta como caída que la petición no llegue a completarse.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/**
 * Marca que saca la comprobación de la caché del service worker.
 *
 * El service worker guarda las respuestas de Supabase y las sirve si la red
 * falla. Sin esta marca, la comprobación se respondería desde la caché y
 * diríamos que hay servidor justo cuando no lo hay. La exclusión está en
 * `vite.config.ts`, en el `urlPattern` de Supabase.
 */
const PROBE_PARAM = '_probe';
const PROBE_TIMEOUT_MS = 6000;

let probeOk: boolean | null = null;
let estado: Connectivity = 'online';
let timer: ReturnType<typeof setTimeout> | null = null;
let enCurso: Promise<boolean> | null = null;
const oyentes = new Set<(s: Connectivity) => void>();

const navOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine !== false;

const recalcular = () => {
  const nuevo = decideConnectivity(navOnline(), probeOk);
  if (nuevo === estado) return;
  estado = nuevo;
  oyentes.forEach(f => f(estado));
};

/** Una comprobación. Devuelve si se alcanzó el servidor. */
export async function probeBackend(): Promise<boolean> {
  if (enCurso) return enCurso;           // No se solapan comprobaciones.
  if (!SUPABASE_URL) return true;        // Sin URL configurada no se inventa un fallo.
  if (!navOnline()) { probeOk = null; recalcular(); return false; }

  const ctrl = new AbortController();
  const corte = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);

  enCurso = (async () => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/?${PROBE_PARAM}=${Date.now()}`, {
        method: 'HEAD',
        // `no-cors` evita depender de las cabeceras CORS: sólo interesa si la
        // petición llega a completarse, no lo que responde.
        mode: 'no-cors',
        cache: 'no-store',
        signal: ctrl.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(corte);
    }
  })();

  try {
    probeOk = await enCurso;
    return probeOk;
  } finally {
    enCurso = null;
    recalcular();
  }
}

/** Estado actual sin lanzar ninguna petición. */
export const getConnectivity = (): Connectivity => estado;

/** ¿Se puede hablar con el servidor ahora mismo? */
export const isBackendReachable = (): boolean => estado === 'online';

export function subscribeConnectivity(f: (s: Connectivity) => void): () => void {
  oyentes.add(f);
  f(estado);
  return () => { oyentes.delete(f); };
}

/**
 * Una petición real ha fallado: se comprueba de inmediato en vez de esperar al
 * siguiente turno. Así el aviso aparece cuando el usuario nota el problema.
 */
export function reportBackendFailure(): void {
  probeBackend().catch(() => undefined);
}

const programar = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      await probeBackend().catch(() => undefined);
    }
    programar();
  }, probeIntervalMs(estado));
};

/** Arranca la vigilancia. Devuelve la función para pararla. */
export function startConnectivityMonitor(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const alVolver = () => { probeBackend().catch(() => undefined); };
  const alPerderRed = () => { probeOk = null; recalcular(); };
  const alCambiarVisibilidad = () => {
    if (document.visibilityState === 'visible') alVolver();
  };

  window.addEventListener('online', alVolver);
  window.addEventListener('offline', alPerderRed);
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  alVolver();
  programar();

  return () => {
    window.removeEventListener('online', alVolver);
    window.removeEventListener('offline', alPerderRed);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    if (timer) { clearTimeout(timer); timer = null; }
  };
}
