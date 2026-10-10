/**
 * Qué módulos del escáner de Air Canada se enseñan según el modo de la escala.
 *
 * En "sólo salida" no hay descarga que escanear y en "sólo llegada" no hay
 * carga. Antes se mostraban los dos siempre: marcando sólo salida seguía
 * saliendo el escáner de la LIR de llegada, que invita a escanear la hoja
 * equivocada.
 */

export type ModuloEscaner = 'arrival' | 'departure';

export const verModuloLlegada = (soloSalida?: boolean): boolean => !soloSalida;
export const verModuloSalida = (soloLlegada?: boolean): boolean => !soloLlegada;

/**
 * Módulo que queda abierto. Si el que estaba abierto deja de verse al cambiar
 * el modo, se abre el que queda: cerrarlo todo dejaría la sección muda sin que
 * se entienda por qué.
 */
export const decidirModuloAbierto = (
  abiertoAhora: ModuloEscaner | null,
  verLlegada: boolean,
  verSalida: boolean,
): ModuloEscaner | null => {
  if (abiertoAhora === 'arrival' && !verLlegada) return verSalida ? 'departure' : null;
  if (abiertoAhora === 'departure' && !verSalida) return verLlegada ? 'arrival' : null;
  return abiertoAhora;
};
