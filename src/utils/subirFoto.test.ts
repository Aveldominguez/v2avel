import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const subidaSupabase = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
    storage: { from: () => ({ upload: subidaSupabase }) },
  },
}));

import { subirFoto } from './subirFoto';

const foto = new Blob(['x'], { type: 'image/webp' }) as File;
const RUTA = 'u1/esc-ls-1.webp';

beforeEach(() => {
  subidaSupabase.mockReset().mockResolvedValue({ error: null });
  vi.stubEnv('VITE_R2_BASE_URL', 'https://fotos.devavel.com');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('cuando R2 funciona', () => {
  it('la foto va a R2 y la escala guarda una dirección r2:', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const r = await subirFoto('loading-sheets', RUTA, foto);
    expect(r).toEqual({ ruta: 'r2:u1/esc-ls-1.webp', almacen: 'r2' });
    expect(subidaSupabase).not.toHaveBeenCalled();
  });
});

describe('la red de seguridad: una foto no se pierde nunca', () => {
  it('si R2 contesta que no, la foto se sube a Supabase', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const r = await subirFoto('loading-sheets', RUTA, foto);
    expect(r.almacen).toBe('supabase');
    expect(r.ruta).toBe('loading-sheets:u1/esc-ls-1.webp');
    expect(subidaSupabase).toHaveBeenCalledOnce();
  });

  it('si no hay cobertura y la subida a R2 revienta, también', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const r = await subirFoto('turnaround-files', RUTA, foto);
    expect(r.almacen).toBe('supabase');
    expect(subidaSupabase).toHaveBeenCalledOnce();
  });

  it('mientras R2 no esté configurado, todo sigue yendo a Supabase', async () => {
    vi.stubEnv('VITE_R2_BASE_URL', '');
    const red = vi.fn();
    vi.stubGlobal('fetch', red);
    const r = await subirFoto('loading-sheets', RUTA, foto);
    expect(r.almacen).toBe('supabase');
    expect(red).not.toHaveBeenCalled();   // ni se intenta
  });

  it('si fallan los dos, se avisa: callarse dejaría al agente creyendo que subió', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    subidaSupabase.mockResolvedValue({ error: new Error('sin sitio') });
    await expect(subirFoto('loading-sheets', RUTA, foto)).rejects.toThrow('sin sitio');
  });
});

describe('la dirección que se manda a R2', () => {
  it('va por /f/ y con la sesión en la cabecera, nunca en la dirección', async () => {
    const red = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', red);
    await subirFoto('loading-sheets', RUTA, foto);
    const [url, opciones] = red.mock.calls[0];
    expect(url).toBe('https://fotos.devavel.com/f/u1/esc-ls-1.webp');
    expect(url).not.toContain('tok');
    expect(opciones.headers.authorization).toBe('Bearer tok');
    expect(opciones.method).toBe('PUT');
  });
});
