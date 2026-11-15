import { describe, it, expect } from 'vitest';
import {
  ventanaDeEscala, observacionesDeLaVentana, peorDelIntervalo, resumenMeteo,
  momentoDe, registrarMeteoDeEscala, previsionParaVentana, sePuedeRellenar, type ObsCruda,
} from './meteoEscala';

const DIA = new Date(2026, 10, 15); // 15/11/2026

/** Una observación como las que manda aviationweather.gov. */
const obs = (hhmmUTC: string, kt: number, racha: number | null = null): ObsCruda => ({
  reportTime: `2026-11-15T${hhmmUTC}:00.000Z`,
  wdir: 220, wspd: kt, wgst: racha,
  rawOb: `METAR LEMD 15${hhmmUTC.replace(':', '')}Z 220${String(kt).padStart(2, '0')}KT 9000`,
});

describe('el intervalo de la escala', () => {
  it('va de calzos de llegada a calzos de salida', () => {
    const v = ventanaDeEscala(DIA, { chocksOnArrival: '09:20', chocksOff: '10:05' })!;
    expect(v.desde.getHours()).toBe(9);
    expect(v.desde.getMinutes()).toBe(20);
    expect(v.hasta.getHours()).toBe(10);
    expect(v.hasta.getMinutes()).toBe(5);
  });

  it('si falta un calzo, usa la primera y la última hora apuntada', () => {
    const v = ventanaDeEscala(DIA, {
      unloadingStart: '09:25', firstBag: '09:31', loadingEnd: '09:58',
    })!;
    expect(v.desde.getMinutes()).toBe(25);
    expect(v.hasta.getMinutes()).toBe(58);
  });

  it('una escala que cruza la medianoche no da un intervalo negativo', () => {
    const v = ventanaDeEscala(DIA, { chocksOnArrival: '23:40', chocksOff: '00:25' })!;
    expect(v.hasta.getTime()).toBeGreaterThan(v.desde.getTime());
    expect((v.hasta.getTime() - v.desde.getTime()) / 60000).toBe(45);
  });

  it('con una sola hora no hay intervalo: no se inventa nada', () => {
    expect(ventanaDeEscala(DIA, { chocksOnArrival: '09:20' })).toBeNull();
    expect(ventanaDeEscala(DIA, {})).toBeNull();
  });

  it('las horas de ARION no cuentan como trabajo', () => {
    expect(ventanaDeEscala(DIA, { scheduledArrival: '09:10', departureTime: '10:30' })).toBeNull();
  });

  it('momentoDe rechaza lo que no es una hora', () => {
    expect(momentoDe(DIA, '25:00')).toBeNull();
    expect(momentoDe(DIA, 'NIL')).toBeNull();
    expect(momentoDe(DIA, null)).toBeNull();
  });
});

describe('qué observaciones cubren el intervalo', () => {
  // METAR cada media hora, como los emite LEMD
  const partes = [obs('08:00', 10), obs('08:30', 12, 20), obs('09:00', 14, 28),
                  obs('09:30', 15, 30), obs('10:00', 11, 23), obs('10:30', 9)];

  const v = (desde: string, hasta: string) =>
    ventanaDeEscala(DIA, { chocksOnArrival: desde, chocksOff: hasta })!;

  it('coge las del intervalo MÁS la vigente al empezar', () => {
    // Escala 09:20-10:05 en hora local; en noviembre Madrid va UTC+1.
    const r = observacionesDeLaVentana(partes, {
      desde: new Date('2026-11-15T09:20:00Z'), hasta: new Date('2026-11-15T10:05:00Z'),
    });
    expect(r.map((o) => o.hora.slice(11, 16))).toEqual(['09:00', '09:30', '10:00']);
  });

  it('una escala corta entre dos emisiones no se queda sin parte', () => {
    const r = observacionesDeLaVentana(partes, {
      desde: new Date('2026-11-15T09:35:00Z'), hasta: new Date('2026-11-15T09:50:00Z'),
    });
    expect(r).toHaveLength(1);
    expect(r[0].hora.slice(11, 16)).toBe('09:30');
  });

  it('marca el nivel de alerta de cada observación', () => {
    const r = observacionesDeLaVentana([obs('09:00', 14, 28)], {
      desde: new Date('2026-11-15T09:00:00Z'), hasta: new Date('2026-11-15T09:30:00Z'),
    });
    expect(r[0].alerta).toBe('precaucion');   // racha 28 kt pasa de 25
    expect(r[0].raw).toContain('METAR LEMD');
  });

  it('aguanta observaciones sin viento o con datos rotos', () => {
    const r = observacionesDeLaVentana(
      [{ reportTime: '2026-11-15T09:00:00.000Z' }, { rawOb: 'sin fecha' }],
      { desde: new Date('2026-11-15T09:00:00Z'), hasta: new Date('2026-11-15T10:00:00Z') },
    );
    expect(r).toHaveLength(1);
    expect(r[0].kt).toBeNull();
    expect(r[0].alerta).toBeNull();
  });

  it('sin observaciones no revienta', () => {
    expect(observacionesDeLaVentana([], {
      desde: new Date(), hasta: new Date(),
    })).toEqual([]);
  });
});

describe('lo peor del intervalo', () => {
  const o = (kt: number, racha: number | null) =>
    observacionesDeLaVentana([obs('09:00', kt, racha)], {
      desde: new Date('2026-11-15T09:00:00Z'), hasta: new Date('2026-11-15T09:30:00Z'),
    })[0];

  it('se queda con la racha más fuerte, no con la última', () => {
    const peor = peorDelIntervalo([o(10, 15), o(12, 30), o(11, 20)]);
    expect(peor).toEqual({ kt: 12, racha: 30, alerta: 'precaucion' });
  });

  it('sin racha compara el viento sostenido', () => {
    expect(peorDelIntervalo([o(10, null), o(42, null)])!.alerta).toBe('restriccion');
  });

  it('sin observaciones no hay máximo', () => {
    expect(peorDelIntervalo([])).toBeNull();
  });
});

describe('el resumen de una línea', () => {
  const meteo = (kt: number, racha: number | null) => ({
    ventana: { desde: '', hasta: '' }, registradoEn: '', observaciones: [], taf: null,
    maximo: { kt, racha, alerta: null } as never,
  });

  it('enseña el pico y la racha', () => {
    expect(resumenMeteo({ ...meteo(15, 28), maximo: { kt: 15, racha: 28, alerta: 'precaucion' } }))
      .toBe('Viento máx. 28 kt (racha 28) · PRECAUCION');
  });

  it('sin alerta no pone etiqueta', () => {
    expect(resumenMeteo({ ...meteo(10, null), maximo: { kt: 10, racha: null, alerta: null } }))
      .toBe('Viento máx. 10 kt');
  });

  it('sin datos no dice nada', () => {
    expect(resumenMeteo(null)).toBe('');
  });
});

describe('registrar la meteorología al cerrar la escala', () => {
  const times = { chocksOnArrival: '09:20', chocksOff: '10:05' };
  const respuesta = {
    observaciones: [
      { reportTime: '2026-11-15T08:00:00.000Z', wspd: 14, wgst: 28, wdir: 220, rawOb: 'METAR LEMD 150800Z 22014G28KT' },
      { reportTime: '2026-11-15T08:30:00.000Z', wspd: 15, wgst: 30, wdir: 220, rawOb: 'METAR LEMD 150830Z 22015G30KT' },
    ],
    taf: 'TAF LEMD 150500Z 1506/1612 22012G25KT',
  };
  const invocarOk = async () => ({ data: respuesta, error: null });

  it('guarda las observaciones, el peor momento y la previsión', async () => {
    const m = (await registrarMeteoDeEscala(DIA, times, invocarOk))!;
    expect(m.observaciones.length).toBeGreaterThan(0);
    expect(m.maximo!.racha).toBe(30);
    expect(m.maximo!.alerta).toBe('precaucion');
    expect(m.taf).toContain('TAF LEMD');
    expect(m.registradoEn).toMatch(/^\d{4}-/);
  });

  it('guarda el METAR crudo, que es lo que vale como prueba', async () => {
    const m = (await registrarMeteoDeEscala(DIA, times, invocarOk))!;
    expect(m.observaciones.every((o) => o.raw.startsWith('METAR LEMD'))).toBe(true);
  });

  it('sin intervalo no se registra nada', async () => {
    expect(await registrarMeteoDeEscala(DIA, { chocksOnArrival: '09:20' }, invocarOk)).toBeNull();
  });

  it('si el aeropuerto no da partes de ese rato, no se guarda un registro vacío', async () => {
    const vacio = async () => ({ data: { observaciones: [], taf: null }, error: null });
    expect(await registrarMeteoDeEscala(DIA, times, vacio)).toBeNull();
  });

  it('un fallo del servicio se propaga: no se da por bueno en silencio', async () => {
    const roto = async () => ({ data: null, error: new Error('502') });
    await expect(registrarMeteoDeEscala(DIA, times, roto)).rejects.toThrow('502');
  });
});

describe('qué decía la previsión para el intervalo de la escala', () => {
  const periodo = (desde: string, hasta: string, kt: number, racha: number | null, tipo = 'TEMPO') => ({
    from: new Date(`2026-11-15T${desde}:00Z`),
    to: new Date(`2026-11-15T${hasta}:00Z`),
    level: (Math.max(kt, racha ?? 0) >= 40 ? 'restriccion' : 'precaucion') as never,
    speed: kt, gust: racha, changeType: tipo,
  });
  const ventana = {
    desde: new Date('2026-11-15T09:20:00Z'),
    hasta: new Date('2026-11-15T10:05:00Z'),
  };

  it('una previsión que empieza antes y acaba después sí afecta', () => {
    const p = previsionParaVentana([periodo('09:00', '12:00', 20, 30)], ventana)!;
    expect(p.alerta).toBe('precaucion');
    expect(p.racha).toBe(30);
    expect(p.tipo).toBe('TEMPO');
  });

  it('una que solapa sólo el final también cuenta', () => {
    const p = previsionParaVentana([periodo('10:00', '14:00', 22, 35)], ventana);
    expect(p).not.toBeNull();
  });

  it('una que termina antes de empezar la escala NO cuenta', () => {
    expect(previsionParaVentana([periodo('06:00', '09:00', 30, 45)], ventana)).toBeNull();
  });

  it('una que empieza después de acabar la escala tampoco', () => {
    expect(previsionParaVentana([periodo('11:00', '14:00', 30, 45)], ventana)).toBeNull();
  });

  it('con varias que solapan se queda con la peor', () => {
    const p = previsionParaVentana([
      periodo('09:00', '10:00', 18, 26),
      periodo('09:30', '11:00', 30, 48),
    ], ventana)!;
    expect(p.racha).toBe(48);
    expect(p.alerta).toBe('restriccion');
  });

  it('sin previsión o sin periodos con alerta, no se anota nada', () => {
    expect(previsionParaVentana(null, ventana)).toBeNull();
    expect(previsionParaVentana([], ventana)).toBeNull();
  });
});

describe('rellenar la meteorología de una escala ya trabajada', () => {
  const HOY = new Date(2026, 10, 15, 12, 0);
  const trabajada = { chocksOnArrival: '09:20', chocksOff: '10:05' };
  const dias = (n: number) => new Date(2026, 10, 15 - n);

  it('una escala de ayer sí se puede rellenar', () => {
    expect(sePuedeRellenar(dias(1), trabajada, HOY)).toBe(true);
  });

  it('una de hace 7 días también: el histórico llega', () => {
    expect(sePuedeRellenar(dias(7), trabajada, HOY)).toBe(true);
  });

  it('una de hace 10 días NO: el aeropuerto ya no la tiene', () => {
    expect(sePuedeRellenar(dias(10), trabajada, HOY)).toBe(false);
  });

  it('una que ya tiene meteorología no se vuelve a pedir', () => {
    expect(sePuedeRellenar(dias(1), { ...trabajada, meteo: { observaciones: [] } }, HOY)).toBe(false);
  });

  it('una sin intervalo tampoco: no hay nada que pedir', () => {
    expect(sePuedeRellenar(dias(1), { chocksOnArrival: '09:20' }, HOY)).toBe(false);
  });
});
