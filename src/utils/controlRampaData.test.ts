import { describe, it, expect } from 'vitest';
import { buildControlRampa, jardinerasConHora, nombreBodega, numeroCompartimento } from './controlRampaData';
import type { ControlRampaInput } from './controlRampaData';
import { getEmptyTimes } from '@/hooks/useTurnaroundStore';

const escala = (extra: Partial<ControlRampaInput> = {}): ControlRampaInput => ({
  flightNumber: 'TP1018',
  date: new Date(2026, 9, 13),
  airline: 'TAP',
  aircraftModel: 'A320',
  isRemote: false,
  remoteLocation: '',
  tango: 'T16',
  capataz: 'Avel',
  observations: '',
  fieldValues: [],
  times: getEmptyTimes(),
  ...extra,
});

const buscar = (pares: { label: string; value: string }[], label: string) =>
  pares.find((p) => p.label === label)?.value;

describe('hoja de Control de Rampa', () => {
  it('rellena la cabecera y la fila del vuelo', () => {
    const h = buildControlRampa(escala({
      times: {
        ...getEmptyTimes(), matricula: 'CSTNV', originStation: 'LIS', destStation: 'OPO',
        scheduledArrival: '15:30', scheduledStd: '16:50', departureFlightNumber: 'TP1019',
        pushBackTime: '16:55',
      },
    }));
    expect(h.cabecera).toMatchObject({ fecha: '13/10/26', capataz: 'Avel', tipoAvion: 'A320', matricula: 'CSTNV' });
    expect(h.vuelo).toMatchObject({
      llegada: 'TP1018', origen: 'LIS', sta: '15:30', parking: 'T16',
      pushback: '16:55', salida: 'TP1019', destino: 'OPO', std: '16:50',
    });
  });

  it('marca el parking remoto, que es una información distinta', () => {
    const h = buildControlRampa(escala({ tango: '', remoteLocation: '35', isRemote: true }));
    expect(h.vuelo.parking).toBe('35 (R)');
  });

  it('en sólo salida no se imprime un vuelo de llegada que no se trabaja', () => {
    const h = buildControlRampa(escala({
      times: { ...getEmptyTimes(), soloSalida: true, departureFlightNumber: 'TP1019' },
    }));
    expect(h.vuelo.llegada).toBe('');
    expect(h.vuelo.salida).toBe('TP1019');
  });

  describe('jardineras', () => {
    it('cuenta las que tienen hora y separa la primera de la última', () => {
      const h = buildControlRampa(escala({
        times: { ...getEmptyTimes(), busArrival: '15:45', bus2: '15:52', bus3: '16:01' },
      }));
      expect(buscar(h.tiempos, 'Nº JARD. LLEG.')).toBe('3');
      expect(buscar(h.tiempos, 'JARD. POSIC.')).toBe('15:45');
      expect(buscar(h.tiempos, 'ÚLTIMA JARDINERA')).toBe('16:01');
    });

    it('con una sola jardinera no se repite la misma hora en dos casillas', () => {
      const h = buildControlRampa(escala({ times: { ...getEmptyTimes(), busArrival: '15:45' } }));
      expect(buscar(h.tiempos, 'JARD. POSIC.')).toBe('');
      expect(buscar(h.tiempos, 'ÚLTIMA JARDINERA')).toBe('15:45');
      expect(buscar(h.tiempos, 'Nº JARD. LLEG.')).toBe('1');
    });

    it('sin jardineras no se inventa un cero', () => {
      expect(jardinerasConHora(getEmptyTimes())).toEqual([]);
      const h = buildControlRampa(escala());
      expect(buscar(h.tiempos, 'Nº JARD. LLEG.')).toBe('');
    });
  });

  it('los recuentos nuevos van a sus casillas', () => {
    const h = buildControlRampa(escala({
      times: { ...getEmptyTimes(), transit: true, transitBags: '12', ropeCount: '4', ringCount: '8' },
    }));
    expect(buscar(h.tiempos, 'TRÁNSITOS')).toBe('12');
    expect(buscar(h.extras, 'Nº CUERDAS')).toBe('4');
    expect(buscar(h.extras, 'Nº ANILLAS')).toBe('8');
  });

  describe('tránsitos', () => {
    it('sin tránsitos la casilla lo dice, que es un dato en sí', () => {
      const h = buildControlRampa(escala());
      expect(buscar(h.tiempos, 'TRÁNSITOS')).toBe('NO');
    });

    it('marcados pero sin contar, queda en SÍ', () => {
      const h = buildControlRampa(escala({ times: { ...getEmptyTimes(), transit: true } }));
      expect(buscar(h.tiempos, 'TRÁNSITOS')).toBe('SÍ');
    });
  });

  it('el cierre de bodegas ocupa la casilla que dejó el total de maletas', () => {
    const h = buildControlRampa(escala({ times: { ...getEmptyTimes(), cargoDoorsClosed: '16:40' } }));
    expect(buscar(h.tiempos, 'CIERRE BODEGAS')).toBe('16:40');
    // Y por tanto ya no se repite abajo.
    expect(h.otros.map((o) => o.label)).not.toContain('Cierre Puertas Bodega');
  });

  describe('bodegas y contenedores', () => {
    const conCarga = escala({
      fieldValues: [
        { fieldDefinitionId: 'tap-hold-a32011', value: 'AKE12345TP', updatedAt: new Date() },
        { fieldDefinitionId: 'tap-hold-a32041', value: 'AKE55512TP', updatedAt: new Date() },
        { fieldDefinitionId: 'tap-hold-a3205', value: '23 BULTOS', updatedAt: new Date() },
      ],
    });

    it('agrupa la carga real por número de compartimento', () => {
      const h = buildControlRampa(conCarga);
      expect(buscar(h.bodegas, 'BOD-1')).toBe('AKE12345TP');
      expect(buscar(h.bodegas, 'BOD-4')).toBe('AKE55512TP');
      // El Bulk no lleva número en el nombre: se saca de su bodega (la 5).
      expect(buscar(h.bodegas, 'BOD-5')).toBe('23 BULTOS');
    });

    it('al control de contenedores sólo van los compartimentos paletizados', () => {
      const h = buildControlRampa(conCarga);
      expect(h.contenedores).toEqual([
        { posicion: '11 *', uld: 'AKE12345TP' },
        { posicion: '41 *', uld: 'AKE55512TP' },
      ]);
    });

    it('una aerolínea sin ULD no lleva control de contenedores', () => {
      const h = buildControlRampa(escala({
        airline: 'WIZZ', aircraftModel: 'A321',
        fieldValues: [{ fieldDefinitionId: 'wizz-hold-11', value: '40 BULTOS', updatedAt: new Date() }],
      }));
      expect(h.contenedores).toEqual([]);
    });
  });

  it('baja a «Otros registros» lo que la hoja no tiene, sin repetir lo que sí', () => {
    const h = buildControlRampa(escala({
      times: {
        ...getEmptyTimes(),
        chocksOnArrival: '15:32',          // tiene casilla propia
        coordinatorApproval: '15:35',      // no la tiene
        lirReception: '16:00', lirReception2: '16:20',
        baggageBelt: 'N617', scheduledEta: '15:28',
      },
    }));
    const etiquetas = h.otros.map((o) => o.label);
    expect(etiquetas).toContain('VB Coordinador');
    expect(etiquetas).toContain('LIR Ed. 2');
    expect(buscar(h.otros, 'Equipaje')).toBe('Sala 6 · Cinta 17');
    expect(buscar(h.otros, 'ETA')).toBe('15:28');
    // Lo que ya está en una casilla de la hoja no se repite abajo.
    expect(etiquetas).not.toContain('Calzos Llegada');
  });

  it('las observaciones recogen también la incidencia', () => {
    const h = buildControlRampa(escala({
      observations: 'Red rota en la 41.',
      times: { ...getEmptyTimes(), incidentReport: { nombre: 'Red', descripcion: 'Deshilachada.' } },
    }));
    expect(h.observaciones).toContain('Red rota en la 41.');
    expect(h.observaciones).toContain('Deshilachada.');
  });

  it('marca el equipaje especial y la búsqueda de maleta que la app conoce', () => {
    const h = buildControlRampa(escala({
      times: { ...getEmptyTimes(), aviArrival: true, mailDeparture: true, bagSearchStart: '16:15', bagSearchEnd: '16:22' },
    }));
    expect(h.especial).toEqual(['AVI llegada', 'MAIL salida']);
    expect(h.codigos[0]).toContain('16:15');
  });

  it('sin datos no revienta y deja la hoja en blanco para rellenar a mano', () => {
    const h = buildControlRampa(escala());
    expect(h.tiempos).toHaveLength(16);
    expect(h.otros).toEqual([]);
    expect(h.observaciones).toBe('');
  });
});

describe('detalles de etiquetado', () => {
  it('quita el emoji de puerta, que en el PDF sale como un cuadrado', () => {
    expect(nombreBodega('Bodega 11 🚪')).toBe('11 *');
    expect(nombreBodega('42')).toBe('42');
  });

  it('saca el número del compartimento del nombre o de sus bodegas', () => {
    expect(numeroCompartimento('COMPARTIMIENTO 3 AFT')).toBe('3');
    expect(numeroCompartimento('Bulk', ['5 🚪'])).toBe('5');
    expect(numeroCompartimento('Bulk', [])).toBe('');
  });
});
