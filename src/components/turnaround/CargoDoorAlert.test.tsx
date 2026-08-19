import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CargoDoorAlert } from './CargoDoorAlert';

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * El componente lee el reloj real, así que las horas se construyen a partir de
 * `now` en vez de fijarlas: nada de tests que sólo pasan a ciertas horas.
 *
 * Salida a 7 min de ahora → límite H-5 dentro de 2 min. `cierreOffsetMin` es
 * el minuto de cierre respecto a esa salida: -2 llega tarde (2 min después del
 * límite), -8 llega con 3 min de margen.
 */
const pintarCierre = (cierreOffsetMin: number) => {
  const now = new Date();
  const salida = new Date(now.getTime() + 7 * 60_000);
  render(
    <CargoDoorAlert
      aircraftModel="A320"
      departureTime={hhmm(salida)}
      chocksOnArrival={hhmm(new Date(now.getTime() - 60 * 60_000))}
      turnaroundMinutes={10}
      cargoDoorsClosed={hhmm(new Date(salida.getTime() + cierreOffsetMin * 60_000))}
      flightDate={now}
      onCloseDoors={() => {}}
    />,
  );
  return screen.getByText(/bodegas cerradas/i).closest('div')!;
};

describe('banner de bodegas cerradas', () => {
  it('en rojo cuando se cerró fuera del límite', () => {
    const banner = pintarCierre(-2);
    expect(banner.textContent).toMatch(/min tarde/);
    expect(banner.className).toContain('border-red-600');
    expect(banner.className).not.toContain('emerald');
  });

  it('en verde cuando se cerró con margen', () => {
    const banner = pintarCierre(-8);
    expect(banner.textContent).toMatch(/min de margen/);
    expect(banner.className).toContain('border-emerald-600');
    expect(banner.className).not.toContain('red-600');
  });
});
