import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const select = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select }), rpc: vi.fn() },
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { RecuperarDatosCard } from './RecuperarDatosCard';

/** La tarjeta navega a la escala, así que necesita un router alrededor. */
const pintar = (props = {}) =>
  render(<MemoryRouter><RecuperarDatosCard {...props} /></MemoryRouter>);

const cadena = (data: unknown) => ({
  order: () => ({ limit: () => Promise.resolve({ data, error: null }) }),
});

beforeEach(() => { select.mockReset(); });

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
