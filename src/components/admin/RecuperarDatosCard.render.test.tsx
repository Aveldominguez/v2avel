import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const select = vi.fn();
const borrados: string[][] = [];
const del = vi.fn(() => ({ in: (_c: string, ids: string[]) => { borrados.push(ids); return Promise.resolve({ error: null }); } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select, delete: del }), rpc: vi.fn() },
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { RecuperarDatosCard } from './RecuperarDatosCard';

/** La tarjeta navega a la escala, así que necesita un router alrededor. */
const pintar = (props = {}) =>
  render(<MemoryRouter><RecuperarDatosCard {...props} /></MemoryRouter>);

const cadena = (data: unknown) => ({
  order: () => ({ limit: () => Promise.resolve({ data, error: null }) }),
});

beforeEach(() => { select.mockReset(); borrados.length = 0; });

const fila = (extra: Record<string, unknown> = {}) => ({
  id: 'h1', turnaround_id: 't1', user_id: 'u1',
  flight_number: 'AZ058', date: '2026-11-05',
  times: { chocksOnArrival: '12:30' }, field_values: [], observations: '',
  extra: null, motivo: 'perdida',
  horas_antes: 8, horas_despues: 0, saved_at: new Date().toISOString(),
  ...extra,
});

describe('RecuperarDatosCard', () => {
  it('sin pérdidas, tranquiliza en vez de enseñar una lista vacía', async () => {
    select.mockReturnValue(cadena([]));
    pintar();
    await waitFor(() => expect(screen.getByText(/Recuperar datos borrados \(0\)/)).toBeTruthy());
    screen.getByRole('button', { name: /Ver histórico/ }).click();
    await waitFor(() => expect(screen.getByText(/Ninguna escala ha perdido horas/)).toBeTruthy());
  });

  it('enseña la pérdida con el vuelo, el usuario y cuántas horas se fueron', async () => {
    select.mockReturnValue(cadena([{
      id: 'h1', turnaround_id: 't1', user_id: 'u1',
      flight_number: 'AZ058', date: '2026-11-05',
      times: { chocksOnArrival: '12:30', chocksOff: '13:39', bodegasData: { f1: '12' } },
      field_values: [{ fieldDefinitionId: 'maletas', value: '140' }],
      observations: '', extra: null, motivo: 'perdida',
      horas_antes: 8, horas_despues: 0, saved_at: '2026-11-05T14:00:00Z',
    }]));
    pintar({ usuarios: [{ user_id: 'u1', email: 'o@x.com', display_name: 'Óscar' }] });
    await waitFor(() => expect(screen.getByText(/Recuperar datos borrados \(1\)/)).toBeTruthy());
    screen.getByRole('button', { name: /Ver histórico/ }).click();
    await waitFor(() => expect(screen.getByText('AZ058')).toBeTruthy());
    expect(screen.getByText(/Óscar/)).toBeTruthy();
    expect(screen.getByText(/se perdieron datos/)).toBeTruthy();
    // El resumen enseña TODO lo recuperable, no sólo las horas.
    expect(screen.getByText('2 horas · 1 bodega · 1 recuento')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ver 2 horas/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Devolver/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ver escala/ })).toBeTruthy();
  });
});


describe('limpiar el histórico', () => {
  const abrir = async () => {
    await waitFor(() => expect(screen.getByRole('button', { name: /Ver histórico/ })).toBeTruthy());
    screen.getByRole('button', { name: /Ver histórico/ }).click();
  };

  it('pulsar la papelera NO borra: antes pregunta', async () => {
    select.mockReturnValue(cadena([fila()]));
    pintar();
    await abrir();
    const papelera = await screen.findByRole('button', { name: /Eliminar la copia de AZ058/ });
    papelera.click();
    await waitFor(() => expect(screen.getByText('Eliminar esta copia')).toBeTruthy());
    expect(borrados).toEqual([]);   // nada borrado todavía
  });

  it('el aviso dice que no se puede deshacer', async () => {
    select.mockReturnValue(cadena([fila()]));
    pintar();
    await abrir();
    (await screen.findByRole('button', { name: /Eliminar la copia de AZ058/ })).click();
    await waitFor(() => expect(screen.getByText(/No se puede deshacer/)).toBeTruthy());
  });

  it('al confirmar sí borra, y sólo esa', async () => {
    select.mockReturnValue(cadena([fila(), fila({ id: 'h2', flight_number: 'W123' })]));
    pintar();
    await abrir();
    (await screen.findByRole('button', { name: /Eliminar la copia de AZ058/ })).click();
    (await screen.findByRole('button', { name: 'Eliminar' })).click();
    await waitFor(() => expect(borrados).toEqual([['h1']]));
  });

  it('la limpieza por antigüedad no aparece si no hay nada viejo', async () => {
    select.mockReturnValue(cadena([fila()]));   // de hoy
    pintar();
    await abrir();
    await waitFor(() => expect(screen.getByText('AZ058')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Limpiar/ })).toBeNull();
  });

  it('con copias viejas ofrece limpiarlas, diciendo cuántas', async () => {
    const vieja = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();
    select.mockReturnValue(cadena([fila({ saved_at: vieja }), fila({ id: 'h2', saved_at: vieja })]));
    pintar();
    await abrir();
    expect(await screen.findByRole('button', { name: /Limpiar 2 de más de 30 días/ })).toBeTruthy();
    expect(borrados).toEqual([]);
  });
});
