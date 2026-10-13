/**
 * Hoja «CONTROL RAMPA» en PDF, una sola A4.
 *
 * Es la hoja de papel de Aviapartner de la que nació la app, rellenada con lo
 * que la escala ya tiene. El reparto de casillas y las decisiones de qué entra
 * y qué no están en utils/controlRampaData.ts.
 *
 * Va en un único bloque `data-pdf-section`: el armazón de PDF encoge un bloque
 * más alto que la hoja hasta que entra, así que la hoja nunca se parte en dos
 * por mucho que crezca «Otros registros».
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AIRLINES } from '@/types/turnaround';
import { buildControlRampa, type ControlRampa, type ControlRampaInput } from './controlRampaData';
import { PDF_LIBS, PDF_TOOLBAR_Y_SCRIPT, entregarPdfHtml } from './pdfShell';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

/** Fila de etiquetas + fila de valores, como las casillas del papel. */
const bloqueCasillas = (pares: { label: string; value: string }[]): string => {
  if (pares.length === 0) return '';
  const ancho = (100 / pares.length).toFixed(4);
  return `<table class="t">
    <tr>${pares.map((p) => `<td class="k" style="width:${ancho}%">${esc(p.label)}</td>`).join('')}</tr>
    <tr>${pares.map((p) => `<td class="v">${esc(p.value) || '&nbsp;'}</td>`).join('')}</tr>
  </table>`;
};

/** Título de sección a todo lo ancho, como las bandas grises de la hoja. */
const banda = (texto: string): string => `<table class="t"><tr><td class="band">${esc(texto)}</td></tr></table>`;

const cuerpoHoja = (h: ControlRampa, logoUrl: string, aerolinea: string): string => {
  const tiemposA = h.tiempos.slice(0, 8);
  const tiemposB = h.tiempos.slice(8);

  const bodegasYExtras = [...h.bodegas, ...h.extras];

  const especial = h.especial.length
    ? h.especial.map(esc).join(' · ')
    : '';

  const codigos = h.codigos.length ? h.codigos.map(esc).join(' · ') : '';

  const equipos = h.equipos.length
    ? h.equipos.map((e) => `<div>${esc(e.label)}: <b>${esc(e.value)}</b></div>`).join('')
    : '&nbsp;';

  const contenedores = h.contenedores.length ? `
    ${banda('CONTROL CONTENEDORES')}
    <table class="t">
      <tr><td class="k" style="width:18%">BODEGA</td><td class="k">Nº DE ULD</td><td class="k" style="width:18%">BODEGA</td><td class="k">Nº DE ULD</td></tr>
      ${(() => {
        const filas: string[] = [];
        for (let i = 0; i < h.contenedores.length; i += 2) {
          const a = h.contenedores[i];
          const b = h.contenedores[i + 1];
          filas.push(`<tr>
            <td class="v">${esc(a.posicion)}</td><td class="v" style="text-align:left">${esc(a.uld)}</td>
            <td class="v">${b ? esc(b.posicion) : '&nbsp;'}</td><td class="v" style="text-align:left">${b ? esc(b.uld) : '&nbsp;'}</td>
          </tr>`);
        }
        return filas.join('');
      })()}
    </table>` : '';

  const otros = h.otros.length ? `
    ${banda('OTROS REGISTROS')}
    <table class="t">
      ${(() => {
        const filas: string[] = [];
        for (let i = 0; i < h.otros.length; i += 4) {
          const trozo = h.otros.slice(i, i + 4);
          while (trozo.length < 4) trozo.push({ label: '', value: '' });
          filas.push(`<tr>${trozo.map((p) => (p.label
            ? `<td class="k" style="width:13%">${esc(p.label)}</td><td class="v" style="width:12%">${esc(p.value)}</td>`
            : '<td class="vacia"></td><td class="vacia"></td>')).join('')}</tr>`);
        }
        return filas.join('');
      })()}
    </table>` : '';

  return `
  <table class="cab">
    <tr>
      <td style="width:26%"><img src="${logoUrl}" alt="Aviapartner" class="logo" onerror="this.style.display='none'" /></td>
      <td style="text-align:center"><span class="titulo">CONTROL RAMPA</span><div class="sub">${esc(aerolinea)}</div></td>
      <td style="width:26%;text-align:right"><div class="sub">AEROPUERTO DE</div><span class="mad">MAD</span></td>
    </tr>
  </table>

  ${bloqueCasillas([
    { label: 'Nº FILE', value: '' },
    { label: 'FECHA', value: h.cabecera.fecha },
    { label: 'NOMBRE CAPATAZ', value: h.cabecera.capataz },
    { label: 'TIPO AVIÓN', value: h.cabecera.tipoAvion },
    { label: 'REG.', value: h.cabecera.matricula },
    { label: 'COORDINAD@R', value: '' },
  ])}

  ${bloqueCasillas([
    { label: 'LLEGADA', value: h.vuelo.llegada },
    { label: 'ORIGEN', value: h.vuelo.origen },
    { label: 'STA', value: h.vuelo.sta },
    { label: 'PARKING', value: h.vuelo.parking },
    { label: 'PUSHBACK', value: h.vuelo.pushback },
    { label: 'SALIDA', value: h.vuelo.salida },
    { label: 'DESTINO', value: h.vuelo.destino },
    { label: 'STD', value: h.vuelo.std },
  ])}

  ${banda('CONTROL DE HORAS')}
  ${bloqueCasillas(tiemposA)}
  ${bloqueCasillas(tiemposB)}

  ${bodegasYExtras.length ? banda('CARGA REAL EN BODEGAS · EXTRAS') + bloqueCasillas(bodegasYExtras) : ''}

  <table class="t">
    <tr><td class="band" style="width:58%">OBSERVACIONES</td><td class="band">PERSONAL / EQUIPOS ASIGNADOS AVIÓN</td></tr>
    <tr>
      <td class="libre">${esc(h.observaciones).replace(/\n/g, '<br>') || '&nbsp;'}</td>
      <td class="libre">${equipos}</td>
    </tr>
  </table>

  <table class="t">
    <tr><td class="k" style="width:34%">EQUIPAJE / CARGO ESPECIAL</td><td class="v" style="text-align:left">${especial || 'DAA / AVI / HUM / FKT / CAT / MAIL'}</td></tr>
    <tr><td class="k">CÓDIGOS CARGA / DESCARGA</td><td class="v" style="text-align:left">${codigos || '&nbsp;'}</td></tr>
  </table>

  ${contenedores}
  ${otros}
  `;
};

export interface ControlRampaOptions {
  /** Detalle de la LIR escaneada de Air Canada, en hojas aparte. */
  lirAirCanada?: string;
}

/**
 * El documento entero, como texto. Separado de la entrega para poder mirarlo
 * tal cual sale, sin tener que generar un PDF ni abrir la app.
 */
export const construirHtmlControlRampa = (
  d: ControlRampaInput,
  opciones: ControlRampaOptions = {},
  logoUrl = '/images/aviapartner-logo.png',
): { html: string; titulo: string; nombreArchivo: string } => {
  const hoja = buildControlRampa(d);
  const aerolinea = AIRLINES.find((a) => a.code === d.airline)?.name ?? d.airline;
  const titulo = `Control Rampa ${d.flightNumber || hoja.vuelo.salida} ${format(d.date, 'dd-MM-yyyy', { locale: es })}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 10px; background: #e9e9e9; color: #000; }
  #pdf-root { max-width: 820px; margin: 0 auto; }
  .hoja { background: #fff; padding: 10px 12px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .t { margin-bottom: 3px; }
  .t td { border: 1px solid #000; padding: 2px 3px; font-size: 9px; overflow: hidden; }
  /* Etiqueta de casilla: gris y en mayúsculas, como el impreso. */
  .k { background: #d9d9d9; font-weight: bold; font-size: 7.5px; text-align: center; line-height: 1.15; }
  /* El valor va en cuerpo grande: esta hoja se lee a dos metros, en plataforma. */
  .v { text-align: center; font-size: 11px; font-weight: bold; height: 17px; font-family: 'Courier New', monospace; }
  .vacia { border: 1px solid #000; background: #fff; }
  .band { background: #c6c6c6; font-weight: bold; font-size: 8.5px; text-align: center; letter-spacing: 0.5px; }
  .libre { height: 62px; vertical-align: top; font-size: 9px; line-height: 1.3; white-space: pre-wrap; }
  .cab { border: none; margin-bottom: 4px; }
  .cab td { border: none; vertical-align: middle; }
  .logo { max-height: 30px; max-width: 100%; }
  .titulo { font-size: 19px; font-weight: bold; letter-spacing: 1px; }
  .sub { font-size: 8px; font-weight: bold; color: #333; }
  .mad { font-size: 17px; font-weight: bold; }
  .pdf-toolbar { position: sticky; top: 0; z-index: 9999; display: flex; gap: 8px; justify-content: flex-end; padding: 10px 12px; background: #1a1a2e; border-bottom: 2px solid #000; }
  .pdf-toolbar button { font-family: inherit; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; padding: 10px 16px; cursor: pointer; color: #fff; display: inline-flex; align-items: center; gap: 6px; -webkit-tap-highlight-color: transparent; }
  .pdf-toolbar .btn-download { background: #2563eb; }
  .pdf-toolbar .btn-share { background: #16a34a; }
  .data-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .data-table td { border: 1px solid #999; padding: 3px 5px; font-size: 9px; }
  h2, h3 { font-size: 11px; margin: 6px 0 3px; }
  @media print {
    body { padding: 0; background: #fff; }
    @page { margin: 10mm; }
    .pdf-toolbar { display: none !important; }
  }
</style>
${PDF_LIBS}
</head>
<body>
${PDF_TOOLBAR_Y_SCRIPT}
<div id="pdf-root">
  <section class="hoja" data-pdf-section>
    ${cuerpoHoja(hoja, logoUrl, aerolinea)}
  </section>
  ${opciones.lirAirCanada ?? ''}
</div>
</body>
</html>`;

  return {
    html,
    titulo,
    nombreArchivo: `control-rampa-${d.flightNumber || hoja.vuelo.salida}-${format(d.date, 'yyyyMMdd')}`,
  };
};

export const generateControlRampaPdf = async (
  d: ControlRampaInput,
  opciones: ControlRampaOptions = {},
): Promise<void> => {
  const { html, titulo, nombreArchivo } = construirHtmlControlRampa(
    d, opciones, `${window.location.origin}/images/aviapartner-logo.png`,
  );
  entregarPdfHtml(html, nombreArchivo, titulo);
};
