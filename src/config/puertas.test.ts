import { describe, it, expect, beforeEach } from 'vitest';
import {
  CLAVE_DE_SESION, PUERTA_ALTERNATIVA, puertaElegida, recordarPermiso,
  urlDeFotos, usandoAlternativa,
} from './puertas';

/**
 * La puerta alternativa decide a qué servidor habla la app entera. Un fallo
 * aquí no se ve: la app arranca igual y, sencillamente, no encuentra nada.
 */
describe('puertas', () => {
  beforeEach(() => { localStorage.clear(); });

  it('sin elegir nada, se entra por la puerta normal', () => {
    expect(puertaElegida()).toBe('normal');
    expect(usandoAlternativa()).toBe(false);
  });

  it('recuerda el permiso que concede el administrador', () => {
    recordarPermiso(true);
    expect(usandoAlternativa()).toBe(true);
    recordarPermiso(false);
    expect(usandoAlternativa()).toBe(false);
  });

  it('avisa de si el permiso ha cambiado, que es cuando hay que recargar', () => {
    // Recargar sin motivo cada vez que la app arranca sería insoportable:
    // sólo se recarga cuando la respuesta del servidor difiere de lo guardado.
    expect(recordarPermiso(false)).toBe(false); // ya estaba en normal
    expect(recordarPermiso(true)).toBe(true);   // cambia
    expect(recordarPermiso(true)).toBe(false);  // no cambia
    expect(recordarPermiso(false)).toBe(true);  // vuelve a cambiar
  });

  it('un valor raro guardado no enciende la alternativa', () => {
    // Una versión futura, un dedazo o un sincronizador ajeno pueden dejar
    // cualquier cosa ahí. Ante la duda, el camino de siempre.
    localStorage.setItem('v2avel.puerta', 'ALTERNATIVA');
    expect(usandoAlternativa()).toBe(false);
  });

  it('las fotos van por la puerta en uso', () => {
    expect(urlDeFotos('https://fotos.devavel.com')).toBe('https://fotos.devavel.com');
    recordarPermiso(true);
    expect(urlDeFotos('https://fotos.devavel.com')).toBe(PUERTA_ALTERNATIVA.fotos);
  });

  it('la clave de sesión es la que ya usaban los móviles', () => {
    /*
     * La librería la calculaba como `sb-<primera parte del dominio>-auth-token`.
     * Si este valor cambiara, todos los agentes aparecerían deslogueados al
     * actualizar, con las escalas a medias y sin saber por qué.
     */
    expect(CLAVE_DE_SESION).toBe('sb-imkvoywmakzwcjvrlrfx-auth-token');
  });

  it('la puerta alternativa lleva puerto propio y no pasa por Cloudflare', () => {
    // Si alguien la apuntara a un dominio proxiado por Cloudflare, la puerta
    // dejaría de servir para lo único que existe.
    expect(PUERTA_ALTERNATIVA.supabase).toContain(':8443');
    expect(PUERTA_ALTERNATIVA.fotos).toContain(':8443');
  });
});
