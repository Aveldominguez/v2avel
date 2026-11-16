import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

/** Parte de viento que la app ya tiene cargado para la insignia. */
const viento = {
  direction: 230,
  speed: 8,
  gust: 19,
  rawMetar: 'LEMD 151300Z 23008G19KT',
  updatedAt: new Date('2026-11-15T13:00:00Z'),
};

let hayViento = true;

vi.mock('@/hooks/useMetar', () => ({
  useMetar: () => ({ windData: hayViento ? viento : null }),
  getWindAlertLevel: () => 'precaucion',
}));
vi.mock('@/hooks/useWindForecast', () => ({
  useWindForecast: () => ({ forecast: null, refresh: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: {}, error: null })) } },
}));

import { useRegistroMeteo } from './useRegistroMeteo';

/** Monta el enganche con un estado de escala vivo, como en el formulario. */
const trabajarEscala = (fecha: Date, iniciales: Record<string, unknown> = {}) => {
  const caja = { times: iniciales };
  const Prueba: React.FC = () => {
    const [times, setTimes] = React.useState<Record<string, unknown>>(iniciales);
    caja.times = times;
    useRegistroMeteo({ activo: true, fecha, times, setTimes });
    return null;
  };
  render(<Prueba />);
  return caja;
};

const hoy = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
};

describe('la meteorología se registra sola al abrir la escala', () => {
  beforeEach(() => { hayViento = true; });
  afterEach(() => { vi.clearAllMocks(); });

  it('se anota sin calzos de llegada, que es el caso de una escala de salida', () => {
    const caja = trabajarEscala(hoy());
    const m = caja.times.meteo as { observaciones: unknown[] } | undefined;
    expect(m).toBeTruthy();
    expect(m!.observaciones).toHaveLength(1);
  });

  it('guarda el parte que había: viento, racha y el METAR en crudo', () => {
    const caja = trabajarEscala(hoy());
    const obs = (caja.times.meteo as { observaciones: Array<Record<string, unknown>> })
      .observaciones[0];
    expect(obs.kt).toBe(8);
    expect(obs.racha).toBe(19);
    expect(obs.raw).toContain('LEMD');
  });

  it('cuando hay calzos de llegada, manda esa hora y no la de ahora', () => {
    const fecha = hoy();
    const caja = trabajarEscala(fecha, { chocksOnArrival: '08:30', departureTime: '10:00' });
    const v = (caja.times.meteo as { ventana: { desde: string; hasta: string } }).ventana;
    expect(new Date(v.desde).getHours()).toBe(8);
    expect(new Date(v.desde).getMinutes()).toBe(30);
    expect(new Date(v.hasta).getHours()).toBe(10);
  });

  it('no inventa meteorología en una escala de otro día', () => {
    const viejo = new Date();
    viejo.setDate(viejo.getDate() - 4);
    const caja = trabajarEscala(viejo);
    // Para esas está el botón que pide los partes al aeropuerto.
    expect(caja.times.meteo).toBeUndefined();
  });

  it('no abre un registro vacío si todavía no hay parte', () => {
    hayViento = false;
    const caja = trabajarEscala(hoy());
    // Un registro vacío diría «ya registrada» y quitaría el botón de rescate.
    expect(caja.times.meteo).toBeUndefined();
  });

  it('no vuelve a abrir el registro de una escala que ya lo tenía', () => {
    const desde = new Date('2026-11-15T08:00:00Z').toISOString();
    const previa = { ventana: { desde, hasta: desde }, observaciones: [], maximo: null };
    const caja = trabajarEscala(hoy(), { meteo: previa });
    const m = caja.times.meteo as { ventana: { desde: string }; observaciones: unknown[] };
    // El intervalo sigue siendo el suyo, no el de ahora; lo único que hace es
    // añadir el parte que acaba de entrar, que es para lo que está.
    expect(m.ventana.desde).toBe(desde);
    expect(m.observaciones).toHaveLength(1);
  });
});
