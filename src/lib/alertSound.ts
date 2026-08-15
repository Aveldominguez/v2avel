/**
 * Pitido y vibración de los avisos operativos.
 *
 * El tono se genera con WebAudio en vez de reproducir un fichero: no hay nada
 * que descargar, funciona sin cobertura en pista y no depende de la caché.
 *
 * Dos límites del navegador que conviene tener presentes:
 *  - El audio no puede sonar hasta que el usuario toca la pantalla una vez.
 *    Por eso `unlockAlertSound()` se engancha al primer toque de la sesión.
 *  - `navigator.vibrate` no existe en iOS: en iPhone no vibra, haga lo que
 *    haga la app. En Android sí.
 */

const MUTE_KEY = 'aero-alert-muted';

let ctx: AudioContext | null = null;
let unlocked = false;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
};

export const isAlertMuted = (): boolean => {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};

export const setAlertMuted = (muted: boolean): void => {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* sin almacén */ }
};

/**
 * Habilita el audio aprovechando el primer toque del usuario. Se llama al
 * montar la app; sin esto el primer aviso del día sería mudo.
 */
export const unlockAlertSound = (): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => undefined);
    unlocked = true;
    window.removeEventListener('touchend', handler);
    window.removeEventListener('pointerdown', handler);
  };
  window.addEventListener('touchend', handler, { passive: true });
  window.addEventListener('pointerdown', handler, { passive: true });
  return () => {
    window.removeEventListener('touchend', handler);
    window.removeEventListener('pointerdown', handler);
  };
};

/** Un tono corto. `delay` permite encadenar varios sin solaparlos. */
const tone = (freqHz: number, durationMs: number, delayMs: number, volume: number) => {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delayMs / 1000;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square'; // Corta mejor el ruido de motores y GPU que una senoidal.
  osc.frequency.value = freqHz;
  // Ataque y caída suaves: un corte seco produce un chasquido molesto.
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.setValueAtTime(volume, t0 + durationMs / 1000 - 0.03);
  gain.gain.linearRampToValueAtTime(0, t0 + durationMs / 1000);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
};

export type AlertTone = 'headsUp' | 'urgent' | 'late';

/** Patrón de vibración por nivel, en ms (sonido/silencio alternos). */
const VIBRATION: Record<AlertTone, number[]> = {
  headsUp: [180],
  urgent: [180, 120, 180],
  late: [300, 120, 300, 120, 300],
};

/**
 * Avisa con sonido y vibración. Cada nivel suena distinto para poder
 * distinguirlo sin sacar el móvil del bolsillo.
 */
export const playAlert = (tono: AlertTone): void => {
  if (isAlertMuted()) return;

  if (unlocked) {
    const c = getCtx();
    if (c?.state === 'suspended') c.resume().catch(() => undefined);
    if (tono === 'headsUp') {
      tone(880, 180, 0, 0.25);
    } else if (tono === 'urgent') {
      tone(1046, 160, 0, 0.35);
      tone(1046, 160, 220, 0.35);
    } else {
      // Grave y repetido: se distingue del resto y transmite que ya es tarde.
      tone(660, 260, 0, 0.4);
      tone(560, 260, 320, 0.4);
      tone(660, 260, 640, 0.4);
    }
  }

  try { navigator.vibrate?.(VIBRATION[tono]); } catch { /* iOS no la implementa */ }
};
