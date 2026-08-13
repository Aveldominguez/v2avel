import { describe, it, expect } from 'vitest';
import { AIRLINES } from '@/types/turnaround';
import { getFilteredEquipmentCategories } from './equipmentDefinitions';

const ids = (airline: string, remote: boolean, push: boolean) =>
  getFilteredEquipmentCategories(airline as never, remote, 'A320', push).map(c => c.id);

describe('Equipos que se ofrecen según la escala', () => {
  it('en remoto aparecen escaleras, GPU y jardineras; en terminal no', () => {
    expect(ids('WIZZ', true, false)).toEqual(
      expect.arrayContaining(['ESCALERAS', 'GPUS', 'JARDINERAS']));
    expect(ids('WIZZ', false, false)).not.toEqual(
      expect.arrayContaining(['ESCALERAS', 'GPUS', 'JARDINERAS']));
  });

  it('al marcar Push Back en remoto se añade el pushback', () => {
    expect(ids('WIZZ', true, false)).not.toContain('PUSHBACK');
    expect(ids('WIZZ', true, true)).toContain('PUSHBACK');
  });

  it('en parking de terminal el pushback está siempre disponible', () => {
    expect(ids('WIZZ', false, false)).toContain('PUSHBACK');
  });

  it('tractores, cintas y furgonetas están siempre', () => {
    for (const caso of [[true, true], [true, false], [false, false]] as const) {
      expect(ids('WIZZ', caso[0], caso[1])).toEqual(
        expect.arrayContaining(['TRACTORES', 'CINTAS', 'FURGONETAS']));
    }
  });

  it('la misma lógica se aplica a TODAS las aerolíneas del catálogo', () => {
    // Sin reglas propias una aerolínea cae en "todo siempre visible", que es lo
    // que le pasaba a SkyUp: le salían plataformas y transfer sin usarlos.
    for (const a of AIRLINES) {
      const remotoSinPush = ids(a.code, true, false);
      const remotoConPush = ids(a.code, true, true);
      expect(remotoConPush).toContain('PUSHBACK');
      // Nadie debe ofrecer las 10 categorías a la vez salvo Sin Marca, que es
      // el comodín para aviones sin compañía asignada.
      if (a.code !== 'SIN_MARCA') {
        expect(remotoSinPush.length).toBeLessThan(10);
      }
    }
  });
});
