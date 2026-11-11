import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const gente = [
  { id: '1019297', nombre: 'Juan Jose', apellidos: 'Millan Sanz' },
  { id: '1019198', nombre: 'Juan', apellidos: 'Cabrerizo Garcia' },
  { id: '1112223', nombre: 'Óscar', apellidos: 'Dávila' },
];

vi.mock('@/utils/personalArion', async (orig) => {
  const real = await orig<typeof import('@/utils/personalArion')>();
  return {
    ...real,
    empleadosGuardados: () => gente,
    cacheCaducada: () => false,
    refrescarEmpleados: vi.fn(async () => gente),
  };
});

import { PersonalSection, type PersonaEnEscala } from './PersonalSection';

const pintar = (personal: PersonaEnEscala[] = []) => {
  const onChange = vi.fn();
  render(<PersonalSection personal={personal} onChange={onChange} />);
  return onChange;
};

const abrir = () => fireEvent.click(screen.getByRole('button', { name: /Personal/ }));

beforeEach(() => vi.clearAllMocks());

describe('Personal de la escala', () => {
  it('nace plegado: en el móvil cada sección abierta estorba', () => {
    pintar();
    expect(screen.getByText('Nadie asignado')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Buscar por nombre/)).toBeNull();
  });

  it('la cabecera cuenta cuánta gente hay sin abrirlo', () => {
    pintar([
      { employeeId: '1', nombre: 'Ana', funcion: 'Cinta' },
      { employeeId: '2', nombre: 'Luis', funcion: '' },
    ]);
    expect(screen.getByText('2 personas')).toBeTruthy();
  });

  it('busca y añade a alguien de ARION, sin función todavía', async () => {
    const onChange = pintar();
    abrir();
    const caja = await screen.findByPlaceholderText(/Buscar por nombre/);
    fireEvent.change(caja, { target: { value: 'millan' } });
    const fila = await screen.findByRole('button', { name: /Millan Sanz/ });
    fireEvent.click(fila);
    expect(onChange).toHaveBeenCalledWith([
      { employeeId: '1019297', nombre: 'Millan Sanz, Juan Jose', funcion: '' },
    ]);
  });

  it('no ofrece a quien ya está en la escala', async () => {
    pintar([{ employeeId: '1019297', nombre: 'Millan Sanz, Juan Jose', funcion: 'Conductor' }]);
    abrir();
    const caja = await screen.findByPlaceholderText(/Buscar por nombre/);
    fireEvent.change(caja, { target: { value: 'juan' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Cabrerizo/ })).toBeTruthy());
    expect(screen.queryByRole('button', { name: /^Millan Sanz, Juan Jose nº/ })).toBeNull();
  });

  it('la caja de búsqueda sigue ahí para añadir a más gente', async () => {
    pintar([{ employeeId: '1', nombre: 'Ana', funcion: 'Cinta' }]);
    abrir();
    expect(await screen.findByPlaceholderText(/Buscar por nombre/)).toBeTruthy();
  });

  it('un atajo de función rellena el campo', async () => {
    const onChange = pintar([{ employeeId: '1', nombre: 'Ana', funcion: '' }]);
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Bodega' }));
    expect(onChange).toHaveBeenCalledWith([{ employeeId: '1', nombre: 'Ana', funcion: 'Bodega' }]);
  });

  it('y la función también se puede escribir a mano', async () => {
    const onChange = pintar([{ employeeId: '1', nombre: 'Ana', funcion: '' }]);
    abrir();
    fireEvent.change(await screen.findByPlaceholderText('Función en la escala'), {
      target: { value: 'Jefe de equipo' },
    });
    expect(onChange).toHaveBeenCalledWith([{ employeeId: '1', nombre: 'Ana', funcion: 'Jefe de equipo' }]);
  });

  it('a quien no está en ARION se le escribe a mano', async () => {
    const onChange = pintar();
    abrir();
    fireEvent.change(await screen.findByPlaceholderText(/Buscar por nombre/), {
      target: { value: 'Eventual de refuerzo' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Añadir .*Eventual de refuerzo/ }));
    expect(onChange).toHaveBeenCalledWith([
      { employeeId: null, nombre: 'Eventual de refuerzo', funcion: '' },
    ]);
  });

  it('el nombre a mano NO se ofrece mientras haya alguien que encaje', async () => {
    pintar();
    abrir();
    fireEvent.change(await screen.findByPlaceholderText(/Buscar por nombre/), {
      target: { value: 'davila' },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /Dávila/ })).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Añadir «/ })).toBeNull();
  });

  it('se puede quitar a alguien', async () => {
    const onChange = pintar([
      { employeeId: '1', nombre: 'Ana', funcion: 'Cinta' },
      { employeeId: '2', nombre: 'Luis', funcion: 'Bodega' },
    ]);
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar a Ana' }));
    expect(onChange).toHaveBeenCalledWith([{ employeeId: '2', nombre: 'Luis', funcion: 'Bodega' }]);
  });
});
