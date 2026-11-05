import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const select = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select }), rpc: vi.fn() },
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { RecuperarDatosCard } from './RecuperarDatosCard';

const cadena = (data: unknown) => ({
  order: () => ({ limit: () => Promise.resolve({ data, error: null }) }),
});

beforeEach(() => { select.mockReset(); });

describe('RecuperarDatosCard', () => {
  it('sin pérdidas, tranquiliza en vez de enseñar una lista vacía', async () => {
    select.mockReturnValue(cadena([]));
    render(<RecuperarDatosCard />);
    await waitFor(() => expect(screen.getByText(/Recuperar datos borrados \(0\)/)).toBeTruthy());
    screen.getByRole('button', { name: /Ver histórico/ }).click();
    await waitFor(() => expect(screen.getByText(/Ninguna escala ha perdido horas/)).toBeTruthy());
  });

  it('enseña la pérdida con el vuelo, el usuario y cuántas horas se fueron', async () => {
    select.mockReturnValue(cadena([{
      id: 'h1', turnaround_id: 't1', user_id: 'u1',
      flight_number: 'AZ058', date: '2026-11-05',
      times: { chocksOnArrival: '12:30', chocksOff: '13:39' },
      horas_antes: 8, horas_despues: 0, saved_at: '2026-11-05T14:00:00Z',
    }]));
    render(<RecuperarDatosCard usuarios={[{ user_id: 'u1', email: 'o@x.com', display_name: 'Óscar' }]} />);
    await waitFor(() => expect(screen.getByText(/Recuperar datos borrados \(1\)/)).toBeTruthy());
    screen.getByRole('button', { name: /Ver histórico/ }).click();
    await waitFor(() => expect(screen.getByText('AZ058')).toBeTruthy());
    expect(screen.getByText(/Óscar/)).toBeTruthy();
    expect(screen.getByText(/se quedó en 0 de 8 horas/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ver 2 horas/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Devolver/ })).toBeTruthy();
  });
});
