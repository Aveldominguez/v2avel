import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MeteoEscalaSection } from './MeteoEscalaSection';
import type { MeteoEscala } from '@/utils/meteoEscala';

const conPartes = (): MeteoEscala => ({
  ventana: {
    desde: new Date('2026-11-15T12:00:00Z').toISOString(),
    hasta: new Date('2026-11-15T14:00:00Z').toISOString(),
  },
  registradoEn: new Date('2026-11-15T12:00:00Z').toISOString(),
  observaciones: [{
    hora: new Date('2026-11-15T12:30:00Z').toISOString(),
    direccion: 230, kt: 26, racha: 32, alerta: 'restriccion',
    raw: 'LEMD 151230Z 23026G32KT',
  }],
  maximo: {
    hora: new Date('2026-11-15T12:30:00Z').toISOString(),
    direccion: 230, kt: 26, racha: 32, alerta: 'restriccion',
    raw: 'LEMD 151230Z 23026G32KT',
  },
  taf: 'TAF LEMD 151100Z',
  prevision: null,
} as MeteoEscala);

describe('la escala siempre dice en qué estado está su meteorología', () => {
  it('con partes anotados, enseña el viento y el METAR oficial', () => {
    render(<MeteoEscalaSection meteo={conPartes()} />);
    expect(screen.getByText('Meteorología de la escala')).toBeTruthy();
    expect(screen.getByText(/Viento máx\. 32 kt/)).toBeTruthy();
  });

  it('sin partes pero recuperables, ofrece pedirlos al aeropuerto', () => {
    render(<MeteoEscalaSection sePuedeRellenar onRellenar={vi.fn()} />);
    expect(screen.getByText('Esta escala no tiene meteorología registrada')).toBeTruthy();
    expect(screen.getByText('Registrar meteorología')).toBeTruthy();
  });

  it('en una escala de hoy sin parte todavía, lo dice en vez de callarse', () => {
    // Antes aquí no se pintaba NADA y era imposible saber si la app lo
    // registraba o no. La meteorología es prueba de decisiones de seguridad.
    render(<MeteoEscalaSection />);
    expect(screen.getByText('Meteorología: esperando el primer parte')).toBeTruthy();
    expect(screen.queryByText('Registrar meteorología')).toBeNull();
  });

  it('en una escala vieja avisa de que ya no se puede recuperar', () => {
    render(<MeteoEscalaSection fueraDePlazo />);
    expect(screen.getByText('Esta escala se quedó sin meteorología')).toBeTruthy();
    expect(screen.getByText(/ya no están/)).toBeTruthy();
    expect(screen.queryByText('Registrar meteorología')).toBeNull();
  });

  it('un registro abierto pero vacío no se hace pasar por registrado', () => {
    const vacio = { ...conPartes(), observaciones: [], maximo: null } as unknown as MeteoEscala;
    render(<MeteoEscalaSection meteo={vacio} sePuedeRellenar onRellenar={vi.fn()} />);
    expect(screen.getByText('Esta escala no tiene meteorología registrada')).toBeTruthy();
  });
});
