import { describe, it, expect } from 'vitest';
import {
  getCompartmentsByAirline,
  isPairedHold,
  activeSubHolds,
  readSplitMode,
  splitModeFieldId,
  sufijosDeUld,
  sufijoYaNoVale,
  ITA_STYLE_TYPE_OPTIONS,
  nombreDeCampoDeBodega,
  type HoldDefinition,
} from './compartmentDefinitions';
import { getModelsForAirline } from './aircraftModels';
import { riqueza, tiposQueSeVacian, mandaElBorrador } from '@/utils/guardadoSeguro';

const comps = () => getCompartmentsByAirline('AZUL', 'B787-8');

const sueltas = (): HoldDefinition[] =>
  comps().flatMap((c) => c.holds.filter((h): h is HoldDefinition => !isPairedHold(h)));

const todasConEtiqueta = (label: string): HoldDefinition[] =>
  sueltas().filter((x) => x.label === label);

const porEtiqueta = (label: string, n = 0): HoldDefinition => {
  const h = todasConEtiqueta(label)[n];
  if (!h) throw new Error(`no existe la posición ${label} nº ${n}`);
  return h;
};

/** Lector de campos a partir de un objeto plano, como el de la escala. */
const lector = (campos: Record<string, string> = {}) => (id: string) => campos[id] ?? '';

describe('Azul B787-8', () => {
  it('está en la lista de modelos de Azul', () => {
    const modelos = getModelsForAirline('AZUL').map((m) => m.model);
    expect(modelos).toContain('B787-8');
  });

  it('tiene los cinco compartimientos de la hoja de carga', () => {
    expect(comps().map((c) => c.compartmentName)).toEqual([
      'COMPARTIMIENTO 1 FWD',
      'COMPARTIMIENTO 2 FWD',
      'COMPARTIMIENTO 3 AFT',
      'COMPARTIMIENTO 4 AFT',
      'COMPARTIMIENTO 5 BULK — granel',
    ]);
  });

  it('coloca las posiciones de cada compartimiento como la hoja', () => {
    const porComp = comps().map((c) =>
      c.holds.filter((h): h is HoldDefinition => !isPairedHold(h)).map((h) => h.label),
    );
    expect(porComp).toEqual([
      ['11', '12', '13', '13'],
      ['21', '22'],
      ['31', '32'],
      ['41', '42', '43'],
      ['Bulk 5'],
    ]);
  });

  it('usa el estilo de contenedores (tipo + número + contenido) salvo en el granel', () => {
    const estilos = comps().map((c) => c.holdStyle);
    expect(estilos).toEqual(['ita', 'ita', 'ita', 'ita', undefined]);
    expect(comps()[4].bulk).toBe(true);
  });

  it('la 13 va doble, como la imprime la hoja en dos bloques', () => {
    const trece = todasConEtiqueta('13');
    expect(trece).toHaveLength(2);
    // Mismo nombre, pero cada una con sus propios campos: lo escrito en una
    // no puede aparecer en la otra.
    expect(trece[0].id).not.toBe(trece[1].id);
  });

  it('marca la puerta de delante en la primera 13R y la de atrás en la 41R', () => {
    expect(porEtiqueta('13', 0).split?.right).toBe('13R 🚪');
    expect(porEtiqueta('13', 1).split?.right).toBe('13R');
    expect(porEtiqueta('41').split?.right).toBe('41R 🚪');
  });

  it('abre cada posición en el modo que trae impreso la hoja', () => {
    const vacío = lector();
    expect(readSplitMode(porEtiqueta('11'), vacío)).toBe('LR');
    expect(readSplitMode(porEtiqueta('12'), vacío)).toBe('P');
    expect(readSplitMode(porEtiqueta('13', 0), vacío)).toBe('LR');
    expect(readSplitMode(porEtiqueta('13', 1), vacío)).toBe('P');
    expect(readSplitMode(porEtiqueta('21'), vacío)).toBe('P');
    expect(readSplitMode(porEtiqueta('31'), vacío)).toBe('P');
    expect(readSplitMode(porEtiqueta('41'), vacío)).toBe('LR');
    expect(readSplitMode(porEtiqueta('43'), vacío)).toBe('LR');
  });
});

describe('posiciones divisibles', () => {
  it('en palé da una sola posición y en partida da las dos mitades', () => {
    const p13 = porEtiqueta('13', 1);
    expect(activeSubHolds(p13, lector()).map((h) => h.label)).toEqual(['13P']);
    const partida = lector({ [splitModeFieldId(p13.id)]: 'LR' });
    expect(activeSubHolds(p13, partida).map((h) => h.label)).toEqual(['13L', '13R']);
  });

  it('cada modo escribe en campos distintos, así que cambiar no borra nada', () => {
    const p13 = porEtiqueta('13', 1);
    const enPalé = activeSubHolds(p13, lector())[0].id;
    const [izq, der] = activeSubHolds(p13, lector({ [splitModeFieldId(p13.id)]: 'LR' })).map((h) => h.id);
    expect(new Set([enPalé, izq, der]).size).toBe(3);
    expect(enPalé).not.toBe(izq);
    expect(enPalé).not.toBe(der);
  });

  it('vuelve al palé con lo que ya había escrito en él', () => {
    const p13 = porEtiqueta('13', 1);
    const idPalé = `${p13.id}-p`;
    const campos: Record<string, string> = {
      [`${idPalé}-content`]: 'PAG58322R7',
      [splitModeFieldId(p13.id)]: 'LR',
    };
    // Mientras está partida, el palé no se pinta pero su dato sigue guardado.
    expect(activeSubHolds(p13, lector(campos)).map((h) => h.id)).not.toContain(idPalé);
    campos[splitModeFieldId(p13.id)] = 'P';
    expect(activeSubHolds(p13, lector(campos))[0].id).toBe(idPalé);
    expect(lector(campos)(`${idPalé}-content`)).toBe('PAG58322R7');
  });

  it('una posición que no se divide se devuelve tal cual', () => {
    const bulk = porEtiqueta('Bulk 5');
    expect(bulk.split).toBeUndefined();
    expect(activeSubHolds(bulk, lector())).toEqual([bulk]);
  });

  it('no cambia nada en las aerolíneas que ya existían', () => {
    const ita = getCompartmentsByAirline('ITA', 'A319')
      .flatMap((c) => c.holds.filter((h): h is HoldDefinition => !isPairedHold(h)));
    expect(ita.every((h) => h.split === undefined)).toBe(true);
    expect(ita.every((h) => activeSubHolds(h, lector())[0].id === h.id)).toBe(true);
  });
});

describe('las bodegas del 787 están protegidas y se pueden recuperar', () => {
  /** Una escala con las posiciones del 787 rellenas, como la deja el operario. */
  const escalaTrabajada = () => {
    const campos: Array<{ fieldDefinitionId: string; value: string }> = [];
    comps().forEach((c) =>
      c.holds.filter((h): h is HoldDefinition => !isPairedHold(h)).forEach((h) => {
        activeSubHolds(h, lector()).forEach((sub) => {
          campos.push({ fieldDefinitionId: `${sub.id}-type`, value: 'AKE' });
          campos.push({ fieldDefinitionId: `${sub.id}-content`, value: '12 BY' });
        });
      }),
    );
    // El granel, que en el 787 va por campos sueltos.
    campos.push({ fieldDefinitionId: 'azul-b7878-bulk5-extra-0', value: '3 DAA' });
    campos.push({ fieldDefinitionId: 'azul-b7878-bulk5-extra-1', value: '1 BICI' });
    return { times: { horaCalzos: '13:25' }, fieldValues: campos, observations: 'sin novedad' };
  };

  it('cuenta todas las posiciones y el granel como información de la escala', () => {
    const r = riqueza(escalaTrabajada());
    // 17 posiciones con la hoja puesta como viene (11, 13 primera, 41, 42 y
    // 43 abren partidas) por dos campos cada una, más los dos del granel.
    expect(r.campos).toBe(17 * 2 + 2);
    expect(r.observaciones).toBe(1);
  });

  it('un guardado que las vacía de golpe no pasa', () => {
    const buena = escalaTrabajada();
    const vacía = { times: { horaCalzos: '13:25' }, fieldValues: [], observations: '' };
    expect(tiposQueSeVacian(buena, vacía)).toContain('recuentos');
    // Con dos tipos de dato vaciados, el borrador local deja de mandar aunque
    // sea más nuevo: así lo que está en pantalla no pisa lo que hay guardado.
    expect(mandaElBorrador({ ...vacía, savedAt: 2 }, { ...buena, updatedAt: 1 })).toBe(false);
  });

  it('cambiar el reparto de una posición no vacía nada', () => {
    const antes = escalaTrabajada();
    const despues = {
      ...antes,
      fieldValues: [
        ...antes.fieldValues,
        { fieldDefinitionId: `${porEtiqueta('13', 1).id}-modo`, value: 'LR' },
      ],
    };
    expect(tiposQueSeVacian(antes, despues)).toEqual([]);
  });
});

describe('terminación del número de contenedor', () => {
  it('los AKE y AKN de Azul terminan en AD', () => {
    expect(sufijosDeUld('AZUL', 'AKE')).toEqual(['AD']);
    expect(sufijosDeUld('AZUL', 'AKN')).toEqual(['AD']);
  });

  it('los palés terminan en R7 o R9', () => {
    ['PAG', 'PLA', 'PMC'].forEach((t) => {
      expect(sufijosDeUld('AZUL', t)).toEqual(['R7', 'R9']);
    });
  });

  it('las aerolíneas que no la usan no ven el selector', () => {
    expect(sufijosDeUld('ITA', 'AKH-AZ')).toEqual([]);
    expect(sufijosDeUld(undefined, 'AKE')).toEqual([]);
    expect(sufijosDeUld('AZUL', '')).toEqual([]);
    expect(sufijosDeUld('AZUL', 'NIL')).toEqual([]);
  });

  it('se borra la terminación que no vale para el tipo nuevo', () => {
    // Un AKE no termina en R7: dejarla daría un contenedor que no existe.
    expect(sufijoYaNoVale('AZUL', 'AKE', 'R7')).toBe(true);
    expect(sufijoYaNoVale('AZUL', 'PMC', 'R7')).toBe(false);
    expect(sufijoYaNoVale('AZUL', 'PAG', 'R9')).toBe(false);
    // Sin nada puesto no hay nada que borrar.
    expect(sufijoYaNoVale('AZUL', 'AKE', '')).toBe(false);
  });

  it('la terminación cuenta como información de la escala y se recupera', () => {
    const copia = {
      times: {},
      fieldValues: [
        { fieldDefinitionId: 'azul-hold-b787821-p-type', value: 'PMC' },
        { fieldDefinitionId: 'azul-hold-b787821-p-num', value: '36713' },
        { fieldDefinitionId: 'azul-hold-b787821-p-suf', value: 'R9' },
      ],
    };
    expect(riqueza(copia).campos).toBe(3);
    expect(tiposQueSeVacian(copia, { times: {}, fieldValues: [] })).toContain('recuentos');
  });
});

describe('Azul B767-3', () => {
  const b767 = () => getCompartmentsByAirline('AZUL', 'B767');
  const sueltasB767 = (): HoldDefinition[] =>
    b767().flatMap((c) => c.holds.filter((h): h is HoldDefinition => !isPairedHold(h)));

  it('se llama B767-3 pero conserva su código, para no perder lo ya trabajado', () => {
    const m = getModelsForAirline('AZUL').find((x) => x.label === 'B767-3');
    expect(m).toBeTruthy();
    expect(m!.model).toBe('B767');
  });

  it('tiene los cinco compartimientos de la hoja, sin la cubierta principal', () => {
    expect(b767().map((c) => c.compartmentName)).toEqual([
      'COMPARTIMIENTO 1 FWD',
      'COMPARTIMIENTO 2 FWD',
      'COMPARTIMIENTO 3 AFT',
      'COMPARTIMIENTO 4 AFT',
      'COMPARTIMIENTO 5 BULK — granel',
    ]);
  });

  it('coloca las posiciones como la hoja, con la 12 repetida', () => {
    expect(b767().map((c) =>
      c.holds.filter((h): h is HoldDefinition => !isPairedHold(h)).map((h) => h.label),
    )).toEqual([
      ['11', '12', '12'],
      ['21', '22'],
      ['31', '32', '33', '34'],
      ['41', '42', '43'],
      ['Bulk 5'],
    ]);
  });

  it('todas las posiciones se pueden partir', () => {
    const conInterruptor = sueltasB767().filter((h) => h.split);
    expect(conInterruptor).toHaveLength(12);
    expect(sueltasB767().find((h) => h.label === 'Bulk 5')?.split).toBeUndefined();
  });

  it('se carga por el lado izquierdo: todo abre de una pieza salvo la 12', () => {
    const vacío = lector();
    const porDefecto = sueltasB767()
      .filter((h) => h.split)
      .map((h) => `${h.label}:${readSplitMode(h, vacío)}`);
    expect(porDefecto).toEqual([
      '11:P', '12:LR', '12:P', '21:P', '22:P',
      '31:P', '32:P', '33:P', '34:P', '41:P', '42:P', '43:P',
    ]);
  });

  it('marca la puerta de delante en la 12 y la de atrás en la 41', () => {
    const doce = sueltasB767().filter((h) => h.label === '12');
    expect(doce[0].split?.right).toBe('12R 🚪');
    expect(doce[0].split?.p).toBe('12P 🚪');
    expect(doce[1].split?.p).toBe('12P');
    const cuarentayuno = sueltasB767().find((h) => h.label === '41')!;
    expect(cuarentayuno.split?.p).toBe('41 🚪');
  });

  it('ofrece los AKE y AKN junto a los palés en el selector de tipo', () => {
    expect(ITA_STYLE_TYPE_OPTIONS.AZUL).toEqual(['AKE', 'AKN', 'PAG', 'PLA', 'PMC']);
  });

  it('el recuperador nombra sus posiciones como se ven en la escala', () => {
    const once = sueltasB767().find((h) => h.label === '11')!;
    expect(nombreDeCampoDeBodega(`${once.id}-p-content`)).toBe('Bodega 11');
    expect(nombreDeCampoDeBodega(`${once.id}-l-num`)).toBe('Bodega 11L · nº');
    expect(nombreDeCampoDeBodega(`${once.id}-p-suf`)).toBe('Bodega 11 · terminación');
  });
});
