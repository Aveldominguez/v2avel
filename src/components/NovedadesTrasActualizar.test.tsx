import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/config/version', () => ({
  APP_VERSION: '4.850',
  APP_CHANGELOG: ['Arreglada una cosa', 'Y otra más'],
}));

import { NovedadesTrasActualizar } from './NovedadesTrasActualizar';

beforeEach(() => localStorage.clear());

describe('aviso de novedades tras actualizar', () => {
  it('la primera vez en un móvil NO sale: no has actualizado nada', () => {
    render(<NovedadesTrasActualizar />);
    expect(screen.queryByText(/se ha actualizado/i)).toBeNull();
    expect(localStorage.getItem('version_vista')).toBe('4.850');
  });

  it('tras actualizar sale, con la lista de cambios', () => {
    localStorage.setItem('version_vista', '4.842');
    render(<NovedadesTrasActualizar />);
    expect(screen.getByText(/se ha actualizado a la v4.85/i)).toBeTruthy();
    expect(screen.getByText('Arreglada una cosa')).toBeTruthy();
    expect(screen.getByText('Y otra más')).toBeTruthy();
  });

  it('con la misma versión no molesta', () => {
    localStorage.setItem('version_vista', '4.850');
    render(<NovedadesTrasActualizar />);
    expect(screen.queryByText(/se ha actualizado/i)).toBeNull();
  });

  it('al cerrarlo no vuelve a salir', () => {
    localStorage.setItem('version_vista', '4.842');
    render(<NovedadesTrasActualizar />);
    screen.getByRole('button', { name: 'Entendido' }).click();
    expect(localStorage.getItem('version_vista')).toBe('4.850');
  });
});
