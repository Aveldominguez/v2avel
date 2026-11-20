/**
 * Por dónde sale la app a buscar sus datos.
 *
 * Hay dos caminos al mismo sitio:
 *
 *   NORMAL       → Supabase y la pasarela de fotos, directos, por Cloudflare.
 *   ALTERNATIVA  → un servidor propio en Alemania que reenvía a los mismos
 *                  destinos, escuchando en el puerto 8443.
 *
 * El camino alternativo existe porque algunas operadoras españolas —O2 y
 * Movistar— bloquean rangos enteros de IP de Cloudflare por las sentencias
 * del fútbol. Y como Supabase también vive detrás de Cloudflare, con ese
 * bloqueo la app se queda sin datos y sin fotos a la vez, en plena rampa.
 *
 * No es un apaño temporal ni un modo de pruebas: es una segunda puerta de la
 * misma casa. Las dos llevan a la misma base de datos y a las mismas fotos.
 *
 * QUIÉN LO DECIDE: el administrador, usuario por usuario, desde el panel. No
 * es un ajuste que el agente encienda. El servidor alternativo se paga aparte
 * y no tiene sentido que pase por él quien no lo necesita.
 */

/**
 * Copia en el móvil del permiso concedido.
 *
 * Tiene que estar aquí y no leerse del servidor cada vez, porque la dirección
 * del servidor se decide ANTES de poder preguntarle nada: es un problema del
 * huevo y la gallina. Se refresca al entrar, cuando sí hay conexión, y queda
 * guardada para el día que la operadora bloquee.
 *
 * Esa demora es justo lo que hace que funcione: el agente recibe el permiso
 * un día con wifi y al día siguiente, en la rampa y bloqueado, su móvil ya
 * sabe por dónde entrar sin preguntarle a nadie.
 */
const CLAVE = 'v2avel.puerta';

export type Puerta = 'normal' | 'alternativa';

/**
 * El servidor propio. Va escrito aquí y no en una variable de compilación
 * por el mismo motivo que la pasarela de fotos: no es un secreto, es una
 * dirección pública, y una errata en un panel de configuración compilaría la
 * app con la puerta rota sin que nadie se entere hasta necesitarla.
 */
export const PUERTA_ALTERNATIVA = {
  supabase: 'https://api.devavel.com:8443',
  fotos: 'https://fotos2.devavel.com:8443',
} as const;

/**
 * La clave con la que se guarda la sesión del agente.
 *
 * La librería de Supabase la deduce del nombre del servidor
 * (`sb-<primera-parte>-auth-token`). Si no la fijáramos, al cambiar de puerta
 * cambiaría la clave, la app no encontraría la sesión guardada y echaría al
 * agente justo cuando está intentando conectar con el avión en puerta.
 *
 * El valor es exactamente el que la librería venía calculando sola, así que
 * las sesiones que ya están guardadas en los móviles siguen valiendo y nadie
 * tiene que volver a entrar al actualizar.
 */
export const CLAVE_DE_SESION = 'sb-imkvoywmakzwcjvrlrfx-auth-token';

/** Qué puerta usa este móvil. */
export const puertaElegida = (): Puerta => {
  try {
    return localStorage.getItem(CLAVE) === 'alternativa' ? 'alternativa' : 'normal';
  } catch {
    // Navegador en privado o almacenamiento bloqueado: la puerta normal.
    return 'normal';
  }
};

export const usandoAlternativa = (): boolean => puertaElegida() === 'alternativa';

/**
 * Apunta el permiso que acaba de decir el servidor.
 *
 * Devuelve `true` si ha CAMBIADO respecto a lo que había, que es la señal de
 * que hay que recargar: la conexión con Supabase se monta una sola vez al
 * arrancar y sin volver a empezar el cambio no surte efecto.
 */
export const recordarPermiso = (concedido: boolean): boolean => {
  const nueva: Puerta = concedido ? 'alternativa' : 'normal';
  if (puertaElegida() === nueva) return false;
  try {
    localStorage.setItem(CLAVE, nueva);
  } catch {
    // Si no se puede recordar, al menos que no reviente. Volverá a
    // preguntarse en el siguiente arranque.
    return false;
  }
  return true;
};

/** La dirección de Supabase según la puerta en uso. */
export const urlDeSupabase = (): string =>
  usandoAlternativa()
    ? PUERTA_ALTERNATIVA.supabase
    : String(import.meta.env.VITE_SUPABASE_URL ?? '');

/** La dirección de la pasarela de fotos según la puerta en uso. */
export const urlDeFotos = (normal: string): string =>
  usandoAlternativa() ? PUERTA_ALTERNATIVA.fotos : normal;
