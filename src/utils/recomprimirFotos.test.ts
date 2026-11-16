import { describe, it, expect } from 'vitest';
import {
  valeLaPenaTocar, mereceReemplazo, ahorroEstimado, enMegas,
  MINIMO_PARA_TOCAR, MEJORA_MINIMA, LADO_MAXIMO,
  type FotoEnServidor,
} from './recomprimirFotos';

const foto = (p: Partial<FotoEnServidor> = {}): FotoEnServidor => ({
  bucket: 'loading-sheets',
  ruta: 'u1/esc-ls-1.jpg',
  bytes: 663 * 1024,
  ...p,
});

describe('qué fotos vale la pena tocar', () => {
  it('una hoja de carga en JPEG, sí', () => {
    expect(valeLaPenaTocar(foto())).toBe(true);
  });

  it('una que ya está en WebP, no: bajarla sería para nada', () => {
    expect(valeLaPenaTocar(foto({ tipo: 'image/webp' }))).toBe(false);
    expect(valeLaPenaTocar(foto({ ruta: 'u1/esc-ls-1.WEBP' }))).toBe(false);
  });

  it('una pequeña tampoco: no hay nada que rascar', () => {
    expect(valeLaPenaTocar(foto({ bytes: MINIMO_PARA_TOCAR - 1 }))).toBe(false);
    expect(valeLaPenaTocar(foto({ bytes: MINIMO_PARA_TOCAR }))).toBe(true);
  });
});

describe('cuándo se reemplaza la original', () => {
  it('sólo si la nueva gana de verdad', () => {
    const antes = 1000;
    expect(mereceReemplazo(antes, 500)).toBe(true);
    expect(mereceReemplazo(antes, antes * MEJORA_MINIMA)).toBe(true);
  });

  it('por un 5% no se toca una hoja de carga', () => {
    expect(mereceReemplazo(1000, 950)).toBe(false);
  });

  it('si sale más gorda, ni hablar', () => {
    expect(mereceReemplazo(1000, 1400)).toBe(false);
  });

  it('un resultado vacío no cuenta como mejora', () => {
    expect(mereceReemplazo(1000, 0)).toBe(false);
  });
});

describe('lo que se le enseña al usuario antes de empezar', () => {
  it('el ahorro sólo cuenta las fotos que de verdad se van a tocar', () => {
    const fotos = [
      foto({ bytes: 1_000_000 }),
      foto({ bytes: 1_000_000, tipo: 'image/webp' }),  // ya está
      foto({ bytes: 1_000 }),                           // pequeña
    ];
    expect(ahorroEstimado(fotos, 0.4)).toBe(400_000);
  });

  it('sin nada que tocar, el ahorro es cero y no promete nada', () => {
    expect(ahorroEstimado([foto({ tipo: 'image/webp' })])).toBe(0);
    expect(ahorroEstimado([])).toBe(0);
  });

  it('los tamaños se leen en cristiano', () => {
    expect(enMegas(500 * 1024)).toBe('500 KB');
    expect(enMegas(1024 * 1024)).toBe('1.0 MB');
    expect(enMegas(450 * 1024 * 1024)).toBe('450.0 MB');
  });
});

describe('la resolución no se toca', () => {
  it('se mantienen los 1920 px: hay que leer números de contenedor', () => {
    expect(LADO_MAXIMO).toBe(1920);
  });
});
