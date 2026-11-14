/**
 * ¿Está la app guardada entera en este móvil?
 *
 * La app funciona sin cobertura porque el navegador guarda una copia. Si esa
 * copia no se llegó a completar —se instaló con mala señal, o el sistema la
 * tiró para hacer sitio—, el día que abras sin cobertura no sale NADA: ni la
 * home, ni las escalas, pantalla en blanco.
 *
 * Esto lo comprueba al arrancar para poder avisar ANTES de que pase, cuando
 * todavía estás en un sitio con señal y se puede arreglar solo con abrirla.
 */

export type EstadoCopia = 'completa' | 'incompleta' | 'desconocido';

/**
 * `desconocido` cuando el navegador no deja mirar (modo privado, o la API no
 * está): no se avisa de nada, porque no se sabe y asustar sin motivo es peor.
 */
export const comprobarCopiaOffline = async (): Promise<EstadoCopia> => {
  try {
    if (typeof caches === 'undefined' || !navigator.serviceWorker) return 'desconocido';

    const registro = await navigator.serviceWorker.getRegistration();
    if (!registro) return 'incompleta';

    const nombres = await caches.keys();
    const precache = nombres.find((n) => n.includes('precache'));
    if (!precache) return 'incompleta';

    const copia = await caches.open(precache);
    const guardado = await copia.keys();
    // El armazón son decenas de ficheros. Con muy pocos, la instalación se
    // quedó a medias y la app no arrancaría sin cobertura.
    if (guardado.length < 5) return 'incompleta';

    // Lo imprescindible: la propia página. Sin ella no hay nada que enseñar.
    const hayPagina = guardado.some((r) => /\/(index\.html)?(\?|$)/.test(new URL(r.url).pathname + (new URL(r.url).search || '')));
    return hayPagina ? 'completa' : 'incompleta';
  } catch {
    return 'desconocido';
  }
};
