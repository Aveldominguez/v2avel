import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compressImage } from './imageCompressor';

const archivo = (nombre: string, tipo: string, bytes: number): File =>
  new File([new Uint8Array(bytes)], nombre, { type: tipo });

describe('compresión de imágenes', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it('una foto pequeña se deja tal cual, sin tocar el lienzo', async () => {
    const f = archivo('pequena.jpg', 'image/jpeg', 1000);
    expect(await compressImage(f)).toBe(f);
  });

  it('lo que no es imagen se devuelve sin tocar', async () => {
    const f = archivo('documento.pdf', 'application/pdf', 2_000_000);
    expect(await compressImage(f)).toBe(f);
  });

  it('reconoce una imagen aunque Android no diga de qué tipo es', async () => {
    // Chrome en Android entrega a veces archivos con el tipo vacío: si se
    // tratan como "no imagen" se suben en crudo, de 8 MB.
    vi.useFakeTimers();
    const f = archivo('IMG_0001.heic', '', 2_000_000);
    const p = compressImage(f);
    await vi.advanceTimersByTimeAsync(10_500);
    // Entra al camino de decodificación (y acaba por tope), no sale de vacío.
    expect(await p).toBe(f);
  });

  it('el caso que colgaba la app: la imagen nunca carga y aun así termina', async () => {
    // Sin el tope, esta promesa no se resolvía nunca y bloqueaba TODAS las
    // fotos elegidas, que se procesan una detrás de otra.
    vi.useFakeTimers();
    const f = archivo('rota.jpg', 'image/jpeg', 3_000_000);
    const p = compressImage(f);
    let resuelta = false;
    void p.then(() => { resuelta = true; });

    await vi.advanceTimersByTimeAsync(9_000);
    expect(resuelta, 'no debe rendirse antes de tiempo').toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(await p, 'pasado el tope, se sigue con el original').toBe(f);
  });
});

describe('formato de guardado', () => {
  /** Un lienzo de mentira que responde lo que le digamos a toBlob. */
  const lienzoQueDevuelve = (porTipo: Record<string, { type: string; size: number }>) => {
    const original = document.createElement;
    document.createElement = ((etiqueta: string) => {
      if (etiqueta !== 'canvas') return original.call(document, etiqueta);
      return {
        width: 0, height: 0,
        getContext: () => ({ drawImage: () => {} }),
        toBlob: (cb: (b: Blob | null) => void, tipo: string) => {
          const r = porTipo[tipo];
          cb(r ? ({ type: r.type, size: r.size } as Blob) : null);
        },
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement;
    return () => { document.createElement = original; };
  };

  const fotoGrande = () => {
    const f = new File([new Uint8Array(4_000_000)], 'foto.jpg', { type: 'image/jpeg' });
    return f;
  };

  /** Dispara el onload de la imagen en cuanto el compresor le pone el src. */
  const imagenQueCarga = () => {
    const proto = globalThis.Image.prototype as unknown as Record<string, unknown>;
    Object.defineProperty(proto, 'src', {
      configurable: true,
      set(this: HTMLImageElement) {
        Object.defineProperty(this, 'width', { value: 4000, configurable: true });
        Object.defineProperty(this, 'height', { value: 3000, configurable: true });
        setTimeout(() => this.onload?.(new Event('load')), 0);
      },
    });
    return () => { delete proto.src; };
  };

  it('guarda en WebP cuando el navegador sabe', async () => {
    const limpiarLienzo = lienzoQueDevuelve({
      'image/webp': { type: 'image/webp', size: 250_000 },
      'image/jpeg': { type: 'image/jpeg', size: 500_000 },
    });
    const limpiarImg = imagenQueCarga();
    const r = await compressImage(fotoGrande());
    expect(r.type).toBe('image/webp');
    expect(r.name).toBe('foto.webp');
    limpiarLienzo(); limpiarImg();
  });

  it('cae a JPEG si el navegador devuelve un PNG en vez de WebP', async () => {
    // Safari antiguo hace justo esto, y sin avisar: un PNG de una foto pesa
    // MÁS que el original, así que tragárselo sería empeorar las cosas.
    const limpiarLienzo = lienzoQueDevuelve({
      'image/webp': { type: 'image/png', size: 9_000_000 },
      'image/jpeg': { type: 'image/jpeg', size: 500_000 },
    });
    const limpiarImg = imagenQueCarga();
    const r = await compressImage(fotoGrande());
    expect(r.type).toBe('image/jpeg');
    expect(r.name).toBe('foto.jpeg');
    limpiarLienzo(); limpiarImg();
  });

  it('si ninguno de los dos mejora, sube el original sin tocarlo', async () => {
    const limpiarLienzo = lienzoQueDevuelve({
      'image/webp': { type: 'image/webp', size: 9_000_000 },
      'image/jpeg': { type: 'image/jpeg', size: 9_000_000 },
    });
    const limpiarImg = imagenQueCarga();
    const f = fotoGrande();
    expect(await compressImage(f)).toBe(f);
    limpiarLienzo(); limpiarImg();
  });
});
