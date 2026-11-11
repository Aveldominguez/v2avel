import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import {
  buscarEmpleados, nombreCompleto, normalizar, empleadosGuardados, cacheCaducada,
} from './personalArion';

const gente = [
  { id: '1019297', nombre: 'Juan Jose', apellidos: 'Millan Sanz' },
  { id: '1019198', nombre: 'Juan', apellidos: 'Cabrerizo Garcia' },
  { id: '1112223', nombre: 'Óscar', apellidos: 'Dávila' },
  { id: '7654321', nombre: 'María', apellidos: 'Gómez' },
];

beforeEach(() => localStorage.clear());

describe('buscar personal', () => {
  it('encuentra por nombre', () => {
    expect(buscarEmpleados(gente, 'juan')).toHaveLength(2);
  });

  it('el orden de las palabras da igual', () => {
    expect(buscarEmpleados(gente, 'millan juan').map(e => e.id)).toEqual(['1019297']);
    expect(buscarEmpleados(gente, 'juan millan').map(e => e.id)).toEqual(['1019297']);
  });

  it('las tildes no estorban, se escriban o no', () => {
    expect(buscarEmpleados(gente, 'oscar davila')).toHaveLength(1);
    expect(buscarEmpleados(gente, 'Óscar')).toHaveLength(1);
    expect(buscarEmpleados(gente, 'gomez maria')).toHaveLength(1);
  });

  it('busca también por número de empleado, entero o a trozos', () => {
    expect(buscarEmpleados(gente, '7654321')[0].nombre).toBe('María');
    expect(buscarEmpleados(gente, '1019')).toHaveLength(2);   // prefijo que comparten
    expect(buscarEmpleados(gente, '10192')).toHaveLength(1);  // este sólo es de uno
  });

  it('con la caja vacía no devuelve a toda la plantilla', () => {
    expect(buscarEmpleados(gente, '')).toEqual([]);
    expect(buscarEmpleados(gente, '  ')).toEqual([]);
  });

  it('corta por el límite: 534 personas no caben en una pantalla', () => {
    const muchos = Array.from({ length: 300 }, (_, i) => ({ id: String(i), nombre: 'Juan', apellidos: 'X' }));
    expect(buscarEmpleados(muchos, 'juan')).toHaveLength(20);
    expect(buscarEmpleados(muchos, 'juan', 3)).toHaveLength(3);
  });
});

describe('cómo se enseña un empleado', () => {
  it('apellidos primero, que es como se busca a alguien en una lista', () => {
    expect(nombreCompleto(gente[0])).toBe('Millan Sanz, Juan Jose');
  });

  it('sin nombre ni apellidos queda el número, nunca una fila en blanco', () => {
    expect(nombreCompleto({ id: '999', nombre: '', apellidos: '' })).toBe('999');
  });
});

describe('la lista guardada en el móvil', () => {
  it('sin nada guardado no revienta y pide refresco', () => {
    expect(empleadosGuardados()).toEqual([]);
    expect(cacheCaducada()).toBe(true);
  });

  it('una lista recién guardada no está caducada', () => {
    localStorage.setItem('arion_empleados_v1', JSON.stringify({ empleados: gente, bajado: Date.now() }));
    expect(empleadosGuardados()).toHaveLength(4);
    expect(cacheCaducada()).toBe(false);
  });

  it('una de hace dos semanas sí caduca, pero se sigue pudiendo usar', () => {
    const hace15dias = Date.now() - 15 * 24 * 60 * 60 * 1000;
    localStorage.setItem('arion_empleados_v1', JSON.stringify({ empleados: gente, bajado: hace15dias }));
    expect(cacheCaducada()).toBe(true);
    expect(empleadosGuardados()).toHaveLength(4);
  });

  it('una caché corrupta no deja la app sin buscador', () => {
    localStorage.setItem('arion_empleados_v1', '{esto no es json');
    expect(empleadosGuardados()).toEqual([]);
  });

  it('normalizar aguanta lo que no es texto', () => {
    expect(normalizar(null)).toBe('');
    expect(normalizar(123)).toBe('123');
  });
});
