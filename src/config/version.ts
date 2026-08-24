// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.400';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Ya no se pierden adjuntos: la escala se guarda en cuanto termina de subirse un archivo, en lugar de esperar. Ahí estaba la causa de que una foto o un file «desapareciera» al volver a entrar.',
  'Guardar queda bloqueado mientras haya archivos subiendo, avisando de cuántos faltan. La miniatura se ve aunque el archivo aún no haya llegado al servidor.',
  'Al abrir una escala se avisa si hay archivos subidos que no figuran en ella, y se recuperan con un toque. También reintenta los que nunca llegaron a subir.',
  'Sky Express y otras cuatro aerolíneas ya ofrecen escalera en Equipos utilizados cuando están en parking, no sólo en remoto.',
  'El PDF exporta los mismos campos que muestra la escala: se estaba dejando entre 7 y 11 por aerolínea, entre ellos el cierre de puertas de bodega.',
  'Modo Revisión: nueva opción «Empezar y mantener los datos».',
];
