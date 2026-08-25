/**
 * Estado de conexión de la app, en tres niveles y no en dos.
 *
 * `navigator.onLine` sólo dice si el móvil tiene red, no si se llega al
 * servidor. Son cosas distintas y confundirlas nos costó caro: durante un
 * bloqueo de rangos de IP el teléfono tiene wifi y 5G, `navigator.onLine`
 * responde `true`, y la app seguía creyéndose conectada mientras ninguna
 * petición llegaba. Ni avisaba ni pasaba a guardar en local.
 *
 * Lo mismo vale para causas mucho más frecuentes: un portal cautivo del wifi
 * del aeropuerto, o quedarse sin cobertura real bajo el fuselaje.
 */

export type Connectivity =
  | 'online'       // Se llega al servidor.
  | 'offline'      // El móvil no tiene red.
  | 'unreachable'; // Hay red, pero el servidor no responde.

/**
 * @param navigatorOnline lo que dice el móvil sobre su red
 * @param probeOk         resultado de la última comprobación; null si aún no hay
 */
export function decideConnectivity(
  navigatorOnline: boolean,
  probeOk: boolean | null,
): Connectivity {
  if (!navigatorOnline) return 'offline';
  if (probeOk === false) return 'unreachable';
  // Sin comprobar todavía se asume que hay conexión: al abrir la app no se
  // enseña un aviso de fallo que probablemente no exista.
  return 'online';
}

/** Cada cuánto volver a comprobar, según cómo esté la cosa. */
export function probeIntervalMs(state: Connectivity): number {
  // Sin servidor se pregunta más a menudo, para que en cuanto vuelva se note.
  if (state === 'unreachable') return 20_000;
  if (state === 'offline') return 30_000;
  return 60_000;
}

export interface ConnectivityMessage {
  title: string;
  detail: string;
}

/** Qué contarle al usuario. `null` cuando todo va bien y no hay que molestar. */
export function connectivityMessage(state: Connectivity): ConnectivityMessage | null {
  if (state === 'offline') {
    return {
      title: 'SIN COBERTURA',
      detail: 'Lo que apuntes se guarda en el móvil y se enviará solo al recuperar la señal.',
    };
  }
  if (state === 'unreachable') {
    return {
      title: 'NO SE LLEGA AL SERVIDOR',
      detail: 'Tienes red pero no hay respuesta. Prueba a cambiar de wifi a datos móviles. Mientras, se guarda todo en el móvil.',
    };
  }
  return null;
}
