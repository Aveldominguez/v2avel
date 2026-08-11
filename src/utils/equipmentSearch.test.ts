import { describe, it, expect } from 'vitest';
import { matchEquipment, normalizeEquipmentCode } from './equipmentSearch';

const parque = [
  { id: '1', code: 'PQ 8501', label: 'Pushback 8501' },
  { id: '2', code: 'PQ 8500', label: 'Pushback 8500' },
  { id: '3', code: 'GD 8703', label: 'Pushback GD 8703' },
  { id: '4', code: 'CINTA 4501', label: 'Cinta 4501' },
  { id: '5', code: 'TRACTOR 8501', label: 'Tractor 8501' },
];

describe('normalizeEquipmentCode', () => {
  it('quita espacios y guiones y pone en mayúsculas', () => {
    expect(normalizeEquipmentCode('PQ 8501')).toBe('PQ8501');
    expect(normalizeEquipmentCode('pq-8501')).toBe('PQ8501');
  });
});

describe('matchEquipment', () => {
  it('encuentra el equipo tecleando los últimos números', () => {
    const r = matchEquipment(parque, '4501');
    expect(r.map(u => u.code)).toEqual(['CINTA 4501']);
  });

  it('cuando varios acaban igual, los devuelve todos', () => {
    const r = matchEquipment(parque, '8501');
    expect(r.map(u => u.code).sort()).toEqual(['PQ 8501', 'TRACTOR 8501']);
  });

  it('prioriza los que TERMINAN en lo tecleado sobre los que solo lo contienen', () => {
    const conParecido = [
      { id: 'a', code: 'CINTA 85012', label: 'Cinta' },
      { id: 'b', code: 'PQ 8501', label: 'Pushback' },
    ];
    expect(matchEquipment(conParecido, '8501')[0].code).toBe('PQ 8501');
  });

  it('también busca por letras del código', () => {
    expect(matchEquipment(parque, 'GD').map(u => u.code)).toEqual(['GD 8703']);
  });

  it('ignora los espacios que escriba el usuario', () => {
    expect(matchEquipment(parque, 'PQ 85 01').map(u => u.code)).toEqual(['PQ 8501']);
  });

  it('no devuelve nada con menos de 2 caracteres, para no listar el parque entero', () => {
    expect(matchEquipment(parque, '')).toEqual([]);
    expect(matchEquipment(parque, '8')).toEqual([]);
  });

  it('respeta el límite de resultados', () => {
    const muchos = Array.from({ length: 20 }, (_, i) => ({
      id: String(i), code: `CINTA 45${String(i).padStart(2, '0')}`, label: 'Cinta',
    }));
    expect(matchEquipment(muchos, 'CINTA', 8)).toHaveLength(8);
  });
});
