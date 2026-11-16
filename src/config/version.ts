// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.874';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  "NUEVO en Azul: ya está el B787-8 con los cinco compartimientos de su hoja de carga (1 y 2 delante, 3 y 4 detrás, y el 5 de granel), con la puerta de delante en la 13R y la de atrás en la 41R.",
  "NUEVO: en el 787 y el 767 cada posición se puede poner como palé (una pieza) o partida en L y R para meter dos AKE. Se cambia con un toque en la propia escala y queda guardado. La L y la R van juntas en la misma fila, para que no parezcan dos posiciones distintas. Lo escrito en un modo no se borra al cambiar al otro: si vuelves, sigue ahí.",
  "NUEVO en Azul: al lado del número de contenedor va su terminación. Los AKE y AKN terminan en AD y los palés (PAG, PLA, PMC) en R7 o R9, como vienen en la LIR. Se elige de una lista, no se teclea. Al cambiar de tipo, si la terminación ya no vale se quita sola.",
  "NUEVO en Azul: el B767 pasa a llamarse B767-3 y ya tiene sus bodegas de verdad: compartimientos 1 y 2 delante, 3 y 4 detrás y el 5 de granel, con la puerta de delante en la 12 y la de atrás en la 41. Las escalas de B767 ya trabajadas conservan su modelo.",
  "La meteorología de la escala se registra SOLA al abrirla. Ya no hace falta pulsar «Registrar meteorología», y funciona también en una escala de sólo salida, donde antes no se anotaba nunca porque esperaba a los calzos de llegada.",
  "La tarjeta de meteorología aparece SIEMPRE en la escala, en todas las aerolíneas. Antes, si no había parte y tampoco se podía pedir al aeropuerto, no salía nada y era imposible saber si la app lo estaba registrando. Ahora dice si está esperando el parte, si se puede pedir, o si la escala es tan antigua que ya no se puede recuperar.",
  "IMPORTANTE: los partes de viento de la escala ya están dentro de la red de seguridad. Antes se guardaban pero nada los protegía: un guardado que llegara sin ellos los borraba sin avisar, y pasados 8 días el aeropuerto ya no los tiene. Ahora se devuelven solos, igual que las bodegas.",
  "La palabra «crew» junto a un número ya no suma en el recuento de maletas: el equipaje de la tripulación no entra en el general. «6 BY 8 CREW» cuenta 6.",
  "Al recuperar datos, las bodegas se llaman ahora igual que en la escala («Bodega 13L», «Bodega 21P»), en vez de salir con su nombre interno. Y cada copia dice también cuántos partes de viento trae.",
  "Las fotos de la escala se suben más rápido y gastan menos datos del móvil, con la misma nitidez de siempre: se puede seguir leyendo la letra pequeña de una hoja de carga.",
];
