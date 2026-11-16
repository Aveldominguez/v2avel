import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/*
 * Quitar una foto de una escala NO puede borrar el fichero del servidor.
 *
 * El 16/11 la AD8001 perdió dos hojas de carga así: se quitaron del
 * formulario, el fichero se borró al instante y acto seguido la protección
 * antiborrado de la base de datos vio la escala sin adjuntos y devolvió la
 * lista anterior. La escala quedó apuntando a dos ficheros que ya no
 * existían. Una hoja de carga no se repite: el avión ya se ha ido.
 *
 * Mientras exista esa protección —y tiene que existir—, borrar el fichero
 * antes de saber si el cambio se va a conservar es destruir una foto a
 * ciegas. El fichero se queda huérfano y lo recoge la limpieza de
 * huérfanos, que sólo borra lo que no menciona ni la escala ni el histórico.
 *
 * Esta prueba mira el código fuente a propósito: es una regla sobre lo que
 * el código NO debe hacer, y eso no se puede comprobar ejecutando.
 */
const PANTALLAS = [
  'src/components/turnaround/LoadingSheetField.tsx',
  'src/components/turnaround/FileUploadField.tsx',
  'src/components/turnaround/ObservationPhotos.tsx',
];

describe('quitar una foto no borra el fichero', () => {
  it.each(PANTALLAS)('%s no borra del almacén', (ruta) => {
    const fuente = readFileSync(ruta, 'utf-8');
    expect(fuente).not.toMatch(/borrarDelAlmacen/);
    expect(fuente).not.toMatch(/storage\s*\.from\([^)]*\)\s*\.remove/);
  });

  it.each(PANTALLAS)('%s sí quita la foto de la lista', (ruta) => {
    const fuente = readFileSync(ruta, 'utf-8');
    expect(fuente).toMatch(/onChange\(\w+\.filter\(\(_, i\) => i !== index\)\)/);
  });
});
