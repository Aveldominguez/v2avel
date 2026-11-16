import { describe, it, expect } from 'vitest';
import { enMegas, totalBytes, tipoPorNombre, type FotoAMudar } from './mudarFotos';

const foto = (p: Partial<FotoAMudar> = {}): FotoAMudar =>
  ({ bucket: 'loading-sheets', ruta: 'u1/a.jpg', bytes: 1024, ...p });

describe('lo que se le enseña al usuario', () => {
  it('suma sólo lo que hay', () => {
    expect(totalBytes([foto({ bytes: 1000 }), foto({ bytes: 500 })])).toBe(1500);
    expect(totalBytes([])).toBe(0);
  });

  it('los tamaños se leen en cristiano', () => {
    expect(enMegas(500 * 1024)).toBe('500 KB');
    expect(enMegas(1024 * 1024)).toBe('1.0 MB');
  });
});

describe('el tipo de fichero', () => {
  it('se saca del nombre: en R2 lo escribimos nosotros', () => {
    expect(tipoPorNombre('u1/a.jpg')).toBe('image/jpeg');
    expect(tipoPorNombre('u1/a.JPEG')).toBe('image/jpeg');
    expect(tipoPorNombre('u1/a.webp')).toBe('image/webp');
    expect(tipoPorNombre('u1/a.png')).toBe('image/png');
    expect(tipoPorNombre('u1/doc.pdf')).toBe('application/pdf');
  });

  it('lo que no se reconoce no se disfraza de imagen', () => {
    // Decir que un fichero raro es una foto lo rompe al abrirlo; así al menos
    // se descarga y se puede mirar.
    expect(tipoPorNombre('u1/cosa')).toBe('application/octet-stream');
  });
});
