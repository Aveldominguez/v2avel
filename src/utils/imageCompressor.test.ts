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
