import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CompartmentsTable } from './CompartmentsTable';
import { getCompartmentsByAirline } from '@/data/compartmentDefinitions';
import type { FieldValue } from '@/types/turnaround';

const compartimentos = () => getCompartmentsByAirline('AZUL', 'B787-8');

/**
 * Pinta la tabla con un estado vivo: lo que el componente cambia se guarda y
 * se vuelve a pintar, igual que en la escala real.
 */
const pintar = (iniciales: FieldValue[] = []) => {
  let valores = iniciales;
  const onChange = vi.fn((id: string | string[], value: string | string[]) => {
    const ids = Array.isArray(id) ? id : [id];
    const vals = Array.isArray(value) ? value : [value];
    ids.forEach((fid, i) => {
      const resto = valores.filter((v) => v.fieldDefinitionId !== fid);
      valores = [...resto, { fieldDefinitionId: fid, value: vals[i] } as FieldValue];
    });
    vista.rerender(
      <CompartmentsTable
        compartments={compartimentos()}
        values={valores}
        onChange={onChange as never}
        airline="AZUL"
      />,
    );
  });
  const vista = render(
    <CompartmentsTable
      compartments={compartimentos()}
      values={valores}
      onChange={onChange as never}
      airline="AZUL"
    />,
  );
  return { get valores() { return valores; } };
};

/** El bloque entero de una posición, con su interruptor y sus campos. */
const bloque = (posición: string, n = 0): HTMLElement => {
  const títulos = screen.getAllByText(`Posición ${posición}`);
  const t = títulos[n];
  if (!t) throw new Error(`no hay posición ${posición} nº ${n}`);
  return t.closest('div')!.parentElement as HTMLElement;
};

const pulsar = (posición: string, botón: 'Palé' | 'L / R', n = 0) => {
  fireEvent.click(within(bloque(posición, n)).getByText(botón));
};

const escribirContenido = (dentro: HTMLElement, texto: string, i = 0) => {
  const campos = dentro.querySelectorAll('input[placeholder="Contenido bodega"]');
  fireEvent.change(campos[i], { target: { value: texto } });
};

describe('CompartmentsTable — posiciones divisibles del Azul B787-8', () => {
  it('abre cada posición como la trae la hoja de carga', () => {
    pintar();
    // La 11 y la primera 13 vienen partidas; la 12 y la segunda 13, en palé.
    expect(screen.getByText('11L')).toBeTruthy();
    expect(screen.getByText('11R')).toBeTruthy();
    expect(screen.getByText('13L')).toBeTruthy();
    expect(screen.getByText('13R 🚪')).toBeTruthy();
    expect(screen.getByText('13P:')).toBeTruthy();
    expect(screen.getByText('12P:')).toBeTruthy();
  });

  it('pinta la 13 dos veces, como la imprime la hoja', () => {
    pintar();
    expect(screen.getAllByText('Posición 13')).toHaveLength(2);
  });

  it('pone el interruptor en todas las posiciones del avión', () => {
    pintar();
    ['11', '12', '21', '22', '31', '32', '41', '42', '43'].forEach((p) => {
      expect(screen.getByText(`Posición ${p}`)).toBeTruthy();
    });
    expect(screen.getAllByText('Palé')).toHaveLength(11);
    expect(screen.getAllByText('L / R')).toHaveLength(11);
  });

  it('pone las dos mitades en la misma fila, una al lado de la otra', () => {
    pintar();
    const dentro = bloque('11');
    const rejilla = dentro.querySelector('.grid.grid-cols-2')!;
    expect(rejilla).toBeTruthy();
    expect(within(rejilla as HTMLElement).getByText('11L')).toBeTruthy();
    expect(within(rejilla as HTMLElement).getByText('11R')).toBeTruthy();
    // Y cada mitad lleva sus tres campos: tipo, número y contenido.
    expect(rejilla.querySelectorAll('input[placeholder="Contenido bodega"]')).toHaveLength(2);
    expect(rejilla.querySelectorAll('input[placeholder="00000"]')).toHaveLength(2);
  });

  it('al partir una posición de palé aparecen las dos mitades', () => {
    pintar();
    expect(screen.getByText('13P:')).toBeTruthy();
    pulsar('13', 'L / R', 1);
    expect(screen.getAllByText('13L')).toHaveLength(2);
    expect(screen.queryByText('13P:')).toBeNull();
  });

  it('guarda el modo elegido, para que siga igual al reabrir la escala', () => {
    const estado = pintar();
    pulsar('13', 'L / R', 1);
    const modo = estado.valores.find((v) => v.fieldDefinitionId.endsWith('b787813b-modo'));
    expect(modo?.value).toBe('LR');
  });

  it('cada 13 guarda lo suyo: lo de una no aparece en la otra', () => {
    pintar();
    escribirContenido(bloque('13', 1), 'PAG58322R7');
    expect(screen.getAllByDisplayValue('PAG58322R7')).toHaveLength(1);
    expect(within(bloque('13', 0)).queryByDisplayValue('PAG58322R7')).toBeNull();
  });

  it('no pierde lo escrito en el palé al partir y volver', () => {
    const estado = pintar();
    escribirContenido(bloque('13', 1), 'PAG58322R7');
    pulsar('13', 'L / R', 1);
    expect(screen.queryByDisplayValue('PAG58322R7')).toBeNull();
    pulsar('13', 'Palé', 1);
    expect(screen.getByDisplayValue('PAG58322R7')).toBeTruthy();
    expect(estado.valores.some((v) => v.value === 'PAG58322R7')).toBe(true);
  });

  it('el total del compartimiento suma sólo el modo que está puesto', () => {
    pintar();
    escribirContenido(bloque('13', 1), '7 CONSOLIDATION');
    expect(screen.getByText('7')).toBeTruthy();
    pulsar('13', 'L / R', 1);
    const partida = bloque('13', 1);
    escribirContenido(partida, '4 LOCAL', 0);
    escribirContenido(partida, '5 LOCAL', 1);
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.queryByText('16')).toBeNull();
  });

  it('no cuenta el equipaje de tripulación en el granel', () => {
    pintar();
    const bulk = screen.getByText('COMPARTIMIENTO 5 BULK — granel').parentElement!;
    const campos = bulk.querySelectorAll('textarea, input');
    fireEvent.change(campos[0], { target: { value: '6 BY 8 CREW' } });
    expect(within(bulk).getByText('6')).toBeTruthy();
    expect(within(bulk).queryByText('14')).toBeNull();
  });
});

describe('terminación del número de contenedor', () => {
  /** Una escala en la que ya se eligió el tipo de contenedor de esa posición. */
  const conTipo = (idParcial: string, tipo: string) => {
    const hold = compartimentos()
      .flatMap((c) => c.holds)
      .find((h) => 'id' in h && h.id.includes(idParcial)) as { id: string };
    return [{ fieldDefinitionId: `${hold.id}-p-type`, value: tipo }] as FieldValue[];
  };

  it('no aparece hasta elegir un tipo', () => {
    pintar();
    expect(within(bloque('12')).queryByText('—')).toBeNull();
  });

  it('sale al lado de la numeración cuando el tipo la lleva', () => {
    pintar(conTipo('b787812', 'AKE'));
    const fila = within(bloque('12')).getByPlaceholderText('00000').parentElement!;
    expect(within(fila).getByText('—')).toBeTruthy();
  });

  it('lo guarda en su propio campo, aparte del número', () => {
    const estado = pintar([
      ...conTipo('b787821', 'PMC'),
      { fieldDefinitionId: 'azul-hold-b787821-p-num', value: '36713' } as FieldValue,
      { fieldDefinitionId: 'azul-hold-b787821-p-suf', value: 'R9' } as FieldValue,
    ]);
    expect(within(bloque('21')).getByDisplayValue('36713')).toBeTruthy();
    expect(within(bloque('21')).getByText('R9')).toBeTruthy();
    expect(estado.valores.find((v) => v.fieldDefinitionId.endsWith('-suf'))?.value).toBe('R9');
  });

  it('cada mitad de una posición partida lleva la suya', () => {
    const hold = compartimentos()[0].holds[0] as { id: string };
    pintar([
      { fieldDefinitionId: `${hold.id}-l-type`, value: 'AKE' },
      { fieldDefinitionId: `${hold.id}-l-suf`, value: 'AD' },
      { fieldDefinitionId: `${hold.id}-r-type`, value: 'PMC' },
      { fieldDefinitionId: `${hold.id}-r-suf`, value: 'R7' },
    ] as FieldValue[]);
    const dentro = bloque('11');
    expect(within(dentro).getByText('AD')).toBeTruthy();
    expect(within(dentro).getByText('R7')).toBeTruthy();
  });
});
