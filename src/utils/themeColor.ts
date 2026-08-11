// Color de la barra de estado del móvil (meta theme-color).
//
// Se deriva del token --card del tema activo, que es el fondo de las cabeceras
// de la app. Así cualquier tema —incluido uno nuevo— queda coherente sin
// mantener una lista de colores aparte, que es justo lo que se desincronizó:
// en Aero la barra estaba puesta al navy del fondo mientras las cabeceras son
// blancas, y arriba quedaba una franja de otro color.

/**
 * Convierte el valor de un token de Tailwind/shadcn ("222 20% 12%") a
 * hexadecimal, que es lo que entienden todos los navegadores en theme-color.
 * Devuelve null si el valor no tiene el formato esperado.
 */
export function hslTokenToHex(token: string): string | null {
  const m = (token ?? '').trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;

  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const off = l - c / 2;

  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const hex = rgb
    .map((n) => Math.round(Math.min(1, Math.max(0, n + off)) * 255).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

/**
 * Pone la barra de estado del color de las cabeceras del tema activo.
 * Debe llamarse DESPUÉS de aplicar la clase del tema al documento.
 */
export function syncStatusBarColor(fallback = '#ffffff'): string {
  if (typeof document === 'undefined') return fallback;
  const token = getComputedStyle(document.documentElement).getPropertyValue('--card');
  const hex = hslTokenToHex(token) ?? fallback;
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
    (el as HTMLMetaElement).content = hex;
  });
  return hex;
}

/** "rgb(7, 27, 54)" o "rgba(255,255,255,.96)" → [r,g,b,a]; null si no encaja. */
export function parseCssColor(value: string): [number, number, number, number] | null {
  const m = (value ?? '').trim().match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i,
  );
  if (!m) return null;
  const a = m[4] === undefined ? 1 : parseFloat(m[4]);
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), Number.isFinite(a) ? a : 1];
}

/**
 * Compone un color con transparencia sobre el que tiene detrás y devuelve el
 * hexadecimal resultante: es el color que el ojo percibe, y por tanto el que
 * debe llevar la barra de estado. Varias cabeceras usan 96% de opacidad.
 */
export function compositeToHex(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
): string {
  const a = fg[3];
  const mix = (i: number) => Math.round(Math.min(255, Math.max(0, fg[i] * a + bg[i] * (1 - a))));
  return `#${[0, 1, 2].map((i) => mix(i).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Color de la cabecera que hay ahora mismo arriba del todo.
 *
 * El color NO puede fijarse por tema: dentro de un mismo estilo hay pantallas
 * con cabecera blanca (Equipos) y otras con cabecera azul marino (la escala),
 * y con un único valor la barra de estado quedaba descuadrada en unas u otras.
 */
export function resolveTopHeaderColor(): string | null {
  if (typeof document === 'undefined') return null;
  // Nada de offsetParent para decidir si se ve: en elementos con posición fija
  // siempre es null y se descartaban cabeceras perfectamente visibles.
  const visibles = Array.from(document.querySelectorAll('header'))
    .map((el) => ({ el, r: el.getBoundingClientRect(), cs: getComputedStyle(el) }))
    .filter(({ r, cs }) =>
      r.height > 0 && r.width > 0 &&
      cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0')
    .sort((a, b) => a.r.top - b.r.top);
  if (visibles.length === 0) return null;

  const fg = parseCssColor(visibles[0].cs.backgroundColor);
  if (!fg) return null;
  const bg = parseCssColor(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1];
  return compositeToHex(fg, bg);
}

/** Aplica a la barra de estado el color de la cabecera visible. */
export function syncStatusBarFromHeader(): string {
  const hex = resolveTopHeaderColor();
  if (hex) {
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
      (el as HTMLMetaElement).content = hex;
    });
    return hex;
  }
  // Sin cabecera en pantalla (login, carga…): se usa el color del tema.
  return syncStatusBarColor();
}
