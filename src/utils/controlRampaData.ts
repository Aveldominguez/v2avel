/**
 * Traducción de una escala a la hoja de papel «CONTROL RAMPA» de Aviapartner.
 *
 * Es la hoja que se rellena a mano en plataforma y de la que nació la app. Se
 * respeta su rejilla tal cual para que se reconozca de un vistazo, con tres
 * decisiones tomadas con el usuario:
 *
 * - Las casillas que nunca se rellenan (TTL. BAGS A/C, FORMA DE CARGA, DESC.
 *   EXTRA, CGA EXTRA, N1 BULTOS, Nº BULTOS) se quitan: ese espacio hace falta.
 * - «JARD. SALIDA» pasa a llamarse «Última Jardinera», que es como se llama en
 *   la app, y «CIERRE BAGS» es el total de maletas facturadas de la salida.
 * - Todo lo que la app registra y no tiene casilla propia (VB del coordinador,
 *   ediciones de la LIR, muelles, ACU…) baja a «Otros registros», que se
 *   rellena solo con lo que tenga esa escala y esa aerolínea. Así cabe en un
 *   A4 sin perder un dato.
 */

import type { AirlineCode, FieldValue, TurnaroundTimes } from '@/types/turnaround';
import { getEscalaTimeFields, getPushBackField } from '@/types/turnaround';
import { getCompartmentsByAirline, isPairedHold } from '@/data/compartmentDefinitions';
import { getEquipmentCategories } from '@/data/equipmentDefinitions';
import type { EquipmentSelection } from '@/data/equipmentDefinitions';
import { formatBaggageBelt } from './baggageBelt';
import { filledLirEditions } from './lirEditions';

export interface ControlRampaInput {
  flightNumber: string;
  date: Date;
  airline: AirlineCode;
  aircraftModel: string;
  isRemote: boolean;
  remoteLocation: string;
  tango: string;
  times: TurnaroundTimes;
  fieldValues: FieldValue[];
  observations: string;
  /** Nombre del capataz: el del perfil, o el correo si no hay nombre puesto. */
  capataz: string;
}

export interface ParejaDato { label: string; value: string }
export interface Contenedor { posicion: string; uld: string }

export interface ControlRampa {
  cabecera: {
    fecha: string;
    capataz: string;
    tipoAvion: string;
    matricula: string;
  };
  vuelo: {
    llegada: string; origen: string; sta: string; parking: string; pushback: string;
    salida: string; destino: string; std: string;
  };
  /** Las dos filas de tiempos, en el orden de la hoja. */
  tiempos: ParejaDato[];
  bodegas: ParejaDato[];
  extras: ParejaDato[];
  especial: string[];
  codigos: string[];
  equipos: ParejaDato[];
  contenedores: Contenedor[];
  observaciones: string;
  otros: ParejaDato[];
}

const V = (x: string | null | undefined): string => (x ?? '').toString().trim();

/**
 * Nombre de bodega para el papel: sin "Bodega" delante ni el emoji de puerta,
 * que en el PDF sale como un cuadrado. La puerta se marca con un asterisco.
 */
export const nombreBodega = (etiqueta: string): string =>
  etiqueta.replace(/^Bodega\s*/i, '').replace(/🚪/g, '*').replace(/\s+/g, ' ').trim();
const siNo = (b: boolean | null | undefined): string => (b ? 'SÍ' : 'NO');

/** Claves de jardinera, en el orden en que las enseña la escala. */
const JARDINERAS: Array<keyof TurnaroundTimes> = ['busArrival', 'bus2', 'bus3', 'bus4', 'bus5', 'bus6'];

export const jardinerasConHora = (times: TurnaroundTimes): string[] =>
  JARDINERAS.map((k) => V(times[k] as string | null)).filter(Boolean);

/**
 * Casillas de la hoja que ya llevan un dato de la escala. Lo que no esté aquí
 * y tenga valor baja a «Otros registros»: así no se duplica ni se pierde nada.
 */
const EN_LA_HOJA = new Set<string>([
  'chocksOnArrival', 'stairsTime', 'loadingStart', 'loadingEnd', 'chocksOff',
  'unloadingStart', 'unloadingEnd', 'firstBag', 'transitBags', 'checkedBagsTotal',
  'cargoArrival', 'cargoDeparture', 'gpuOn', 'gpuOff', 'asu', 'acu',
  'ropeCount', 'ringCount', 'pushBackTime', 'aviArrival', 'aviDeparture',
  'mailArrival', 'mailDeparture', 'bagSearchStart', 'bagSearchEnd',
  ...JARDINERAS.map(String),
]);

/**
 * Número de compartimento. Sale del nombre ("COMPARTIMIENTO 3 AFT" → 3) y, si
 * el nombre no lo lleva (el Bulk), de la primera cifra de sus bodegas: en el
 * A320 el bulk es la bodega 5, que en la hoja es BOD-5.
 */
export const numeroCompartimento = (nombre: string, etiquetasBodegas: string[] = []): string => {
  const m = nombre.match(/(\d+)/);
  if (m) return m[1];
  for (const etiqueta of etiquetasBodegas) {
    const n = etiqueta.match(/(\d)/);
    if (n) return n[1];
  }
  return '';
};

export function buildControlRampa(d: ControlRampaInput): ControlRampa {
  const t = d.times;
  const valor = (id: string): string => V(d.fieldValues.find((v) => v.fieldDefinitionId === id)?.value);

  // --- Jardineras: la hoja pide la primera, cuántas hubo y la última ---
  // «Última Jardinera» es la de hora más tardía, no la del campo que la app
  // llama así: con tres jardineras, la última es la tercera. Con una sola no
  // hay «posicionada» y «última» que distinguir, y se deja sólo la última.
  const jards = jardinerasConHora(t);
  const primeraJard = jards.length > 1 ? jards[0] : '';
  const ultimaJard = jards.length > 0 ? jards[jards.length - 1] : '';

  // --- Bodegas y contenedores, de los compartimentos de esa aerolínea/modelo ---
  const compartimentos = getCompartmentsByAirline(d.airline, d.aircraftModel);
  const bodegas: ParejaDato[] = [];
  const contenedores: Contenedor[] = [];

  for (const comp of compartimentos) {
    const contenido: string[] = [];
    const sueltas = comp.holds.flatMap((h) => (isPairedHold(h) ? [h.left, h.right] : [h]));
    for (const hold of sueltas) {
      const v = valor(hold.id);
      if (!v) continue;
      contenido.push(v);
      // Sólo los compartimentos paletizados (ITA y TAP) van al control de
      // contenedores: en el resto el dato son bultos, no ULD.
      if (comp.holdStyle === 'ita') {
        contenedores.push({ posicion: nombreBodega(hold.label), uld: v });
      }
    }
    const n = numeroCompartimento(comp.compartmentName, sueltas.map((x) => x.label));
    if (n) bodegas.push({ label: `BOD-${n}`, value: contenido.join(' · ') });
  }

  // --- Equipaje y cargo especial: se marca lo que la app sabe ---
  const especial: string[] = [];
  if (t.aviArrival) especial.push('AVI llegada');
  if (t.aviDeparture) especial.push('AVI salida');
  if (t.mailArrival) especial.push('MAIL llegada');
  if (t.mailDeparture) especial.push('MAIL salida');

  // --- Códigos de carga/descarga que la app puede deducir ---
  const codigos: string[] = [];
  if (V(t.bagSearchStart) || V(t.bagSearchEnd)) {
    const desde = V(t.bagSearchStart);
    const hasta = V(t.bagSearchEnd);
    codigos.push(`Búsqueda de bags${desde || hasta ? ` (${desde || '—'} → ${hasta || '—'})` : ''}`);
  }

  // --- Equipos utilizados ---
  const categorias = getEquipmentCategories(d.aircraftModel);
  const equipos: ParejaDato[] = ((t.equipment ?? []) as EquipmentSelection[])
    .filter((e) => e.equipmentId)
    .flatMap((sel) => {
      const cat = categorias.find((c) => c.id === sel.categoryId);
      const item = cat?.items.find((i) => i.id === sel.equipmentId);
      if (!cat || !item) return [];
      return [{ label: cat.label, value: sel.percentage ? `${item.label} (${sel.percentage}%)` : item.label }];
    });

  // --- Otros registros: lo que la escala tiene y la hoja no contempla ---
  const campos = [
    ...getEscalaTimeFields(d.airline, d.isRemote, t.soloLlegada, t.soloSalida),
    ...(!d.isRemote || t.pushBack ? [getPushBackField()] : []),
  ];
  const otros: ParejaDato[] = [];
  const yaPuesto = new Set<string>();
  for (const campo of campos) {
    const clave = String(campo.key);
    if (EN_LA_HOJA.has(clave) || yaPuesto.has(clave)) continue;
    yaPuesto.add(clave);
    const bruto = t[campo.key];
    if (typeof bruto === 'boolean') {
      if (bruto) otros.push({ label: campo.label, value: 'SÍ' });
      continue;
    }
    const v = V(bruto as string | null);
    if (v) otros.push({ label: campo.label, value: v });
  }
  // Las reediciones de la LIR no son campos de la escala sino un añadido suyo,
  // así que hay que pedirlas aparte o se perderían.
  for (const ed of filledLirEditions(t)) otros.push({ label: ed.label, value: ed.value });

  // Datos de la escala que no son campos de hora pero interesan en la hoja.
  const equipaje = formatBaggageBelt(t.baggageBelt);
  if (equipaje) otros.push({ label: 'Equipaje', value: equipaje });
  if (V(t.scheduledEta)) otros.push({ label: 'ETA', value: V(t.scheduledEta) });
  if (V(t.scheduledEtd)) otros.push({ label: 'ETD', value: V(t.scheduledEtd) });
  if (t.soloLlegada) otros.push({ label: 'Modo', value: 'Sólo llegada' });
  if (t.soloSalida) otros.push({ label: 'Modo', value: 'Sólo salida' });

  const parking = V(d.tango) || V(d.remoteLocation);

  return {
    cabecera: {
      fecha: `${String(d.date.getDate()).padStart(2, '0')}/${String(d.date.getMonth() + 1).padStart(2, '0')}/${String(d.date.getFullYear()).slice(2)}`,
      capataz: d.capataz,
      tipoAvion: V(d.aircraftModel),
      matricula: V(t.matricula),
    },
    vuelo: {
      llegada: t.soloSalida ? '' : V(d.flightNumber),
      origen: V(t.originStation),
      sta: V(t.scheduledArrival),
      parking: parking + (d.isRemote ? ' (R)' : ''),
      pushback: V(t.pushBackTime),
      salida: t.soloLlegada ? '' : V(t.departureFlightNumber),
      destino: V(t.destStation),
      std: V(t.scheduledStd) || V(t.departureTime),
    },
    tiempos: [
      { label: 'CALZOS LLEG.', value: V(t.chocksOnArrival) },
      { label: 'ESC. POSIC.', value: V(t.stairsTime) },
      { label: 'JARD. POSIC.', value: primeraJard },
      { label: 'Nº JARD. LLEG.', value: jards.length ? String(jards.length) : '' },
      { label: 'COM. CARGA', value: V(t.loadingStart) },
      { label: 'FIN CARGA', value: V(t.loadingEnd) },
      { label: 'ÚLTIMA JARDINERA', value: ultimaJard },
      { label: 'CALZOS SAL.', value: V(t.chocksOff) },
      { label: 'TRÁNSITOS', value: V(t.transitBags) },
      { label: 'COM. DESC.', value: V(t.unloadingStart) },
      { label: '1ª MALETA', value: V(t.firstBag) },
      { label: 'FIN DESCARGA', value: V(t.unloadingEnd) },
      { label: 'CIERRE BAGS', value: V(t.checkedBagsTotal) },
      { label: 'GPU', value: [V(t.gpuOn), V(t.gpuOff)].filter(Boolean).join(' → ') },
      { label: 'CGO LLEG.', value: siNo(t.cargoArrival) },
      { label: 'CGO SAL.', value: siNo(t.cargoDeparture) },
    ],
    bodegas,
    extras: [
      { label: 'ASU', value: t.asu ? (V(t.asuData) || 'SÍ') : 'NO' },
      { label: 'Nº CUERDAS', value: V(t.ropeCount) },
      { label: 'Nº ANILLAS', value: V(t.ringCount) },
    ],
    especial,
    codigos,
    equipos,
    contenedores,
    observaciones: [
      V(d.observations),
      t.incidentReport?.descripcion
        ? `Incidencia${t.incidentReport.nombre ? ` (${t.incidentReport.nombre})` : ''}: ${t.incidentReport.descripcion}`
        : '',
    ].filter(Boolean).join('\n'),
    otros,
  };
}
