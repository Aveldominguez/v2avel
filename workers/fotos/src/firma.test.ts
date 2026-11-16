import { describe, it, expect } from 'vitest';
import { firmar, verificar, rutaSegura, duenoDe, puedeTocar, mismaFirma } from './firma';

const SECRETO = 'un-secreto-de-prueba';
const EN_UNA_HORA = Math.floor(Date.now() / 1000) + 3600;
const HACE_UNA_HORA = Math.floor(Date.now() / 1000) - 3600;

describe('el enlace firmado', () => {
  it('vale si está bien firmado y no ha caducado', async () => {
    const sig = await firmar('u1/foto.webp', EN_UNA_HORA, SECRETO);
    expect(await verificar('u1/foto.webp', EN_UNA_HORA, sig, SECRETO)).toBe(true);
  });

  it('no vale una vez caducado, aunque la firma sea buena', async () => {
    const sig = await firmar('u1/foto.webp', HACE_UNA_HORA, SECRETO);
    expect(await verificar('u1/foto.webp', HACE_UNA_HORA, sig, SECRETO)).toBe(false);
  });

  it('no sirve para OTRA foto: la ruta va dentro de la firma', async () => {
    const sig = await firmar('u1/foto.webp', EN_UNA_HORA, SECRETO);
    expect(await verificar('u1/otra.webp', EN_UNA_HORA, sig, SECRETO)).toBe(false);
  });

  it('no se puede estirar la caducidad cambiando el número', async () => {
    const sig = await firmar('u1/foto.webp', EN_UNA_HORA, SECRETO);
    expect(await verificar('u1/foto.webp', EN_UNA_HORA + 86400, sig, SECRETO)).toBe(false);
  });

  it('con otro secreto no cuela', async () => {
    const sig = await firmar('u1/foto.webp', EN_UNA_HORA, 'otro');
    expect(await verificar('u1/foto.webp', EN_UNA_HORA, sig, SECRETO)).toBe(false);
  });

  it('una firma vacía o inventada tampoco', async () => {
    expect(await verificar('u1/foto.webp', EN_UNA_HORA, '', SECRETO)).toBe(false);
    expect(await verificar('u1/foto.webp', EN_UNA_HORA, 'a'.repeat(64), SECRETO)).toBe(false);
  });

  it('un exp que no es un número se rechaza, no se interpreta', async () => {
    const sig = await firmar('u1/foto.webp', EN_UNA_HORA, SECRETO);
    expect(await verificar('u1/foto.webp', Number('abc'), sig, SECRETO)).toBe(false);
  });

  it('comparar firmas no delata la buena por su longitud', () => {
    expect(mismaFirma('abc', 'abc')).toBe(true);
    expect(mismaFirma('abc', 'abd')).toBe(false);
    expect(mismaFirma('abc', 'abcd')).toBe(false);
  });
});

describe('rutas que intentan salirse de su sitio', () => {
  it('una ruta normal pasa', () => {
    expect(rutaSegura('41778992-28da/esc-1.webp')).toBe(true);
  });

  it('«..» no, que es como se llega a la carpeta de otro agente', () => {
    expect(rutaSegura('u1/../u2/foto.webp')).toBe(false);
    expect(rutaSegura('../u2/foto.webp')).toBe(false);
  });

  it('ni barras raras, ni vacías, ni el separador de la firma', () => {
    expect(rutaSegura('/u1/foto.webp')).toBe(false);
    expect(rutaSegura('u1//foto.webp')).toBe(false);
    expect(rutaSegura('')).toBe(false);
    expect(rutaSegura('u1/fo|to.webp')).toBe(false);
  });
});

describe('de quién es cada foto', () => {
  it('el dueño es la primera carpeta', () => {
    expect(duenoDe('u1/foto.webp')).toBe('u1');
    expect(duenoDe('suelta.webp')).toBeNull();
  });

  it('cada agente, lo suyo', () => {
    expect(puedeTocar('u1/foto.webp', 'u1', false)).toBe(true);
    expect(puedeTocar('u1/foto.webp', 'u2', false)).toBe(false);
  });

  it('el administrador, todo: igual que en Supabase', () => {
    expect(puedeTocar('u1/foto.webp', 'u2', true)).toBe(true);
  });

  it('una ruta tramposa no se salva ni siendo admin', () => {
    expect(puedeTocar('u1/../u2/f.webp', 'u2', true)).toBe(false);
  });
});
