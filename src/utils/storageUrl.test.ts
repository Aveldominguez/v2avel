import { describe, it, expect } from 'vitest';
import {
  parseStoragePath, buildStoragePath, buildR2Path, esRutaDeR2, ALMACEN_R2,
} from './storageUrl';

describe('las direcciones de siempre se siguen entendiendo', () => {
  it('el formato de ahora, «cubo:ruta»', () => {
    expect(parseStoragePath('loading-sheets:41778992/esc-1.webp'))
      .toEqual({ bucket: 'loading-sheets', path: '41778992/esc-1.webp' });
    expect(parseStoragePath('turnaround-files:u1/foto.jpg'))
      .toEqual({ bucket: 'turnaround-files', path: 'u1/foto.jpg' });
  });

  it('la URL pública antigua, que es la de las fotos más pesadas', () => {
    expect(parseStoragePath('https://x.supabase.co/storage/v1/object/public/loading-sheets/u1/a.jpg'))
      .toEqual({ bucket: 'loading-sheets', path: 'u1/a.jpg' });
  });

  it('la URL antigua con su token detrás', () => {
    expect(parseStoragePath('https://x.supabase.co/.../turnaround-files/u1/a.jpg?token=abc'))
      .toEqual({ bucket: 'turnaround-files', path: 'u1/a.jpg' });
  });

  it('una ruta con dos puntos en el nombre del fichero no se parte mal', () => {
    expect(parseStoragePath('loading-sheets:u1/12:30 salida.webp'))
      .toEqual({ bucket: 'loading-sheets', path: 'u1/12:30 salida.webp' });
  });

  it('lo que no se entiende se deja en paz', () => {
    expect(parseStoragePath('no-es-una-foto')).toBeNull();
  });
});

describe('la dirección nueva de R2', () => {
  it('se reconoce', () => {
    expect(esRutaDeR2('r2:u1/esc-1.webp')).toBe(true);
    expect(esRutaDeR2('loading-sheets:u1/esc-1.webp')).toBe(false);
  });

  it('se parte en almacén y ruta', () => {
    expect(parseStoragePath('r2:41778992/esc-1.webp'))
      .toEqual({ bucket: ALMACEN_R2, path: '41778992/esc-1.webp' });
  });

  it('NO se confunde con un cubo de Supabase llamado «r2»', () => {
    // Si el orden de comprobación cambiara, esto devolvería bucket «r2» como
    // si fuera un cubo normal y la app pediría la foto al sitio equivocado.
    const r = parseStoragePath('r2:u1/a.webp');
    expect(r?.bucket).toBe(ALMACEN_R2);
    expect(r?.path).not.toContain('r2:');
  });

  it('se construye tal como se va a guardar en la escala', () => {
    expect(buildR2Path('u1/esc-1.webp')).toBe('r2:u1/esc-1.webp');
    expect(parseStoragePath(buildR2Path('u1/esc-1.webp'))?.path).toBe('u1/esc-1.webp');
  });
});

describe('ida y vuelta', () => {
  it('lo que se guarda se vuelve a leer igual, en los dos almacenes', () => {
    const casos: Array<[string, string]> = [
      ['loading-sheets', 'u1/a.webp'],
      ['turnaround-files', 'u1/b.jpg'],
    ];
    for (const [cubo, ruta] of casos) {
      expect(parseStoragePath(buildStoragePath(cubo, ruta))).toEqual({ bucket: cubo, path: ruta });
    }
    expect(parseStoragePath(buildR2Path('u1/c.webp'))).toEqual({ bucket: ALMACEN_R2, path: 'u1/c.webp' });
  });
});
