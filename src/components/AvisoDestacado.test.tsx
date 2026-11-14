import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvisoDestacado, BotonDeAviso } from './AvisoDestacado';

const caja = () => screen.getByText('Título').closest('div.rounded-xl')!;

describe('Aviso destacado', () => {
  it('va en el azul de los botones con texto blanco puro', () => {
    render(<AvisoDestacado icono={<span />} titulo="Título">Detalle</AvisoDestacado>);
    const c = caja();
    expect(c.className).toContain('bg-primary');
    expect(c.className).toContain('text-primary-foreground');
  });

  it('el detalle también es blanco: bajarle la opacidad era el problema', () => {
    render(<AvisoDestacado icono={<span />} titulo="Título">Detalle</AvisoDestacado>);
    const detalle = screen.getByText('Detalle');
    expect(detalle.className).toContain('text-white');
    expect(detalle.className).not.toContain('opacity');
  });

  it('el título nunca se atenúa', () => {
    render(<AvisoDestacado icono={<span />} titulo="Título" />);
    expect(screen.getByText('Título').className).toContain('text-white');
  });

  it('una alerta va en rojo, no en azul: no es un aviso más', () => {
    render(<AvisoDestacado tono="alerta" icono={<span />} titulo="Título" />);
    expect(caja().className).toContain('bg-destructive');
    expect(caja().className).not.toContain('bg-primary');
  });

  it('sin detalle no pinta un hueco vacío', () => {
    const { container } = render(<AvisoDestacado icono={<span />} titulo="Título" />);
    expect(container.querySelectorAll('div.mt-0\\.5').length).toBe(0);
  });

  it('el botón del aviso es blanco sobre el color de fondo', () => {
    render(<BotonDeAviso>Recuperar</BotonDeAviso>);
    const b = screen.getByRole('button', { name: 'Recuperar' });
    expect(b.className).toContain('bg-white');
    expect(b.className).toContain('text-primary');
  });
});
