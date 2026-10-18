import { describe, it, expect } from 'vitest';
import { fechaImpresa, nombreArchivoInforme, resumenInforme } from './StandaloneReportDialog';

describe('informe suelto', () => {
  it('la fecha del campo sale impresa como se escribe en papel', () => {
    expect(fechaImpresa('2026-10-18')).toBe('18/10/2026');
    expect(fechaImpresa('2026-01-05')).toBe('05/01/2026');
  });

  it('una fecha que no se entiende se deja tal cual en vez de inventarse una', () => {
    expect(fechaImpresa('')).toBe('');
    expect(fechaImpresa('vaya')).toBe('vaya');
  });

  it('el nombre del fichero no lleva nada que rompa una descarga', () => {
    expect(nombreArchivoInforme('2026-10-18', 'T16')).toBe('informe-T16-2026-10-18.pdf');
    expect(nombreArchivoInforme('2026-10-18', 'Sala 6 / cinta 17')).toBe('informe-Sala-6-cinta-17-2026-10-18.pdf');
  });

  it('sin ubicación sigue teniendo nombre', () => {
    expect(nombreArchivoInforme('2026-10-18', '')).toBe('informe-general-2026-10-18.pdf');
    expect(nombreArchivoInforme('2026-10-18', '///')).toBe('informe-general-2026-10-18.pdf');
  });

  it('una ubicación larguísima no desborda el nombre del fichero', () => {
    const n = nombreArchivoInforme('2026-10-18', 'A'.repeat(100));
    expect(n.length).toBeLessThan(50);
  });
});

describe('resumen en la lista de informes guardados', () => {
  it('un informe corto se enseña entero', () => {
    expect(resumenInforme('Red rota en la 41.')).toBe('Red rota en la 41.');
  });

  it('uno largo se corta: si no, estira el diálogo fuera de la pantalla', () => {
    const r = resumenInforme('A'.repeat(300));
    expect(r.length).toBe(80);
    expect(r.endsWith('…')).toBe(true);
  });

  it('los saltos de línea se aplanan, que en una lista sobran', () => {
    expect(resumenInforme('Primera línea.\n\nSegunda línea.')).toBe('Primera línea. Segunda línea.');
  });

  it('no deja un espacio colgando antes de los puntos suspensivos', () => {
    expect(resumenInforme('palabra '.repeat(20), 20)).not.toContain(' …');
  });

  it('aguanta el vacío', () => {
    expect(resumenInforme('')).toBe('');
  });
});
