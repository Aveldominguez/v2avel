import { describe, it, expect } from 'vitest';
import { fechaImpresa, nombreArchivoInforme } from './StandaloneReportDialog';

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
