/**
 * El tema de la app, en un solo sitio.
 *
 * Antes el valor por defecto ('dark') estaba escrito a mano en tres ficheros
 * (el arranque, el hook y el botón), así que cambiarlo obligaba a acertar en
 * los tres y a que no se despistara ninguno.
 */

export type ThemeName = 'dark' | 'light' | 'exterior' | 'sky' | 'aero';

export const THEMES: ThemeName[] = ['dark', 'light', 'exterior', 'sky', 'aero'];

/** El que ve todo el mundo mientras no elija otro. */
export const TEMA_POR_DEFECTO: ThemeName = 'aero';

const CLAVE = 'theme';
/**
 * Marca de que ya se ha puesto el tema de la casa en este dispositivo. Sin
 * ella, la igualación se repetiría en cada arranque y le pisaría el tema a
 * quien hubiera elegido otro a conciencia.
 */
const CLAVE_IGUALADO = 'theme-aero-v1';

export const esTema = (v: unknown): v is ThemeName =>
  typeof v === 'string' && (THEMES as string[]).includes(v);

export const leerTema = (): ThemeName => {
  if (typeof window === 'undefined') return TEMA_POR_DEFECTO;
  try {
    const guardado = localStorage.getItem(CLAVE);
    return esTema(guardado) ? guardado : TEMA_POR_DEFECTO;
  } catch {
    // Navegador sin almacén (ventana privada): se sigue con el de la casa.
    return TEMA_POR_DEFECTO;
  }
};

/**
 * Pone a todo el mundo en el tema de la casa, una sola vez por dispositivo.
 *
 * Hace falta porque un usuario de hace meses tiene 'dark' guardado y, sin
 * esto, seguiría viendo el diseño viejo para siempre. Se hace una vez y
 * queda marcado: a partir de ahí, si alguien cambia de tema a propósito, se
 * respeta su elección.
 */
export const igualarTemaDeLaCasa = (): ThemeName => {
  if (typeof window === 'undefined') return TEMA_POR_DEFECTO;
  try {
    if (!localStorage.getItem(CLAVE_IGUALADO)) {
      localStorage.setItem(CLAVE, TEMA_POR_DEFECTO);
      localStorage.setItem(CLAVE_IGUALADO, '1');
      return TEMA_POR_DEFECTO;
    }
  } catch {
    return TEMA_POR_DEFECTO;
  }
  return leerTema();
};

/** Deja en <html> las clases que tocan y quita las que no. */
export const aplicarClasesTema = (tema: ThemeName): void => {
  const root = document.documentElement;
  root.classList.toggle('light', tema === 'light' || tema === 'exterior');
  root.classList.toggle('exterior', tema === 'exterior');
  root.classList.toggle('sky', tema === 'sky');
  root.classList.toggle('aero', tema === 'aero');
};
