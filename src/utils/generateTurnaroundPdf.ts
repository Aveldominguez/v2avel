import { TurnaroundTimes, AirlineCode, AIRLINES, getTimeFieldsForAirline, getPushBackField, FieldValue } from '@/types/turnaround';
// getFieldsByAirline removed: códigos de carga ya no se exportan en PDF
import { getCompartmentsByAirline, isPairedHold } from '@/data/compartmentDefinitions';
import { getEquipmentCategories, EquipmentSelection } from '@/data/equipmentDefinitions';
import { format } from 'date-fns';
import { getSignedUrl, getSignedUrls } from '@/utils/storageUrl';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const escapeHtml = (s: string) =>
  String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

async function buildAirCanadaScannerHtml(flightNumber: string, flightDate: string): Promise<string> {
  if (!flightNumber || !flightDate) return '';
  const [{ data: positions }, { data: bulkRows }] = await Promise.all([
    supabase
      .from('ac_load_sheet_data')
      .select('*')
      .eq('flight_number', flightNumber)
      .eq('flight_date', flightDate),
    supabase
      .from('ac_bulk_data')
      .select('*')
      .eq('flight_number', flightNumber)
      .eq('flight_date', flightDate),
  ]);

  const pos = positions ?? [];
  const bulks = bulkRows ?? [];
  if (pos.length === 0 && bulks.length === 0) return '';

  const bulkLabels: Array<[string, string]> = [
    ['bf', 'BF'], ['by_val', 'BY'], ['dom', 'DOM'], ['usa', 'USA'],
    ['int_val', 'INT'], ['bg', 'BG'], ['rush', 'RUSH'],
  ];

  const renderSection = (scanType: 'arrival' | 'departure', title: string) => {
    const rows = pos.filter((r: any) => r.scan_type === scanType);
    const bulk = bulks.find((b: any) => b.scan_type === scanType);
    if (rows.length === 0 && !bulk) return '';

    const renderTable = (section: 'FWD' | 'AFT') => {
      const sec = rows
        .filter((r: any) => r.fwd_section === section)
        .sort((a: any, b: any) => String(a.position).localeCompare(String(b.position)));
      if (sec.length === 0) return '';
      const body = sec.map((r: any) => `
        <tr>
          <td style="text-align:center;font-family:monospace;">${escapeHtml(r.position)}${r.is_door_position ? ' 🚪' : ''}</td>
          <td style="font-family:monospace;">${escapeHtml(r.container_id ?? '')}</td>
          <td style="text-align:right;">${r.weight_kg ?? ''}</td>
          <td style="text-align:right;">${r.pieces ?? ''}</td>
          <td style="text-align:right;">${r.percentage ?? ''}</td>
          <td>${escapeHtml(r.notes ?? '')}</td>
          <td style="text-align:center;">${escapeHtml(r.manual_order ?? '')}</td>
        </tr>
      `).join('');
      return `
        <h3>${section}</h3>
        <table class="data-table">
          <tr style="background:#e5e5e5;font-weight:bold;">
            <td style="text-align:center;">Pos</td>
            <td>Contenedor</td>
            <td style="text-align:right;">Peso (kg)</td>
            <td style="text-align:right;">Piezas</td>
            <td style="text-align:right;">%</td>
            <td>Notas</td>
            <td style="text-align:center;">Orden</td>
          </tr>
          ${body}
        </table>
      `;
    };

    let bulkHtml = '';
    if (bulk) {
      const active = bulkLabels.filter(([k]) => Number((bulk as any)[k] ?? 0) > 0);
      if (active.length > 0) {
        bulkHtml = `
          <h3>BULK</h3>
          <table class="data-table">
            <tr style="background:#e5e5e5;font-weight:bold;">
              ${active.map(([, l]) => `<td style="text-align:center;">${l}</td>`).join('')}
            </tr>
            <tr>
              ${active.map(([k]) => `<td style="text-align:center;font-family:monospace;">${(bulk as any)[k]}</td>`).join('')}
            </tr>
          </table>
        `;
      }
    }

    return `
      <h2>${title}</h2>
      ${renderTable('FWD')}
      ${renderTable('AFT')}
      ${bulkHtml}
    `;
  };

  return renderSection('arrival', 'Escáner Descarga (Arrival)') +
         renderSection('departure', 'Escáner Carga (Departure)');
}

interface PdfData {
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
}

export const generateTurnaroundPdf = async (data: PdfData) => {
  const airlineInfo = AIRLINES.find(a => a.code === data.airline);
  const baseTimeFields = getTimeFieldsForAirline(data.airline, data.isRemote, data.times.soloLlegada, data.times.soloSalida);
  // Append Push Back field if applicable (parking T always, or remote with toggle on)
  const showPushBack = !data.isRemote || data.times.pushBack;
  const timeFields = showPushBack ? [...baseTimeFields, getPushBackField()] : baseTimeFields;
  // const fields = getFieldsByAirline(data.airline); // eliminado del PDF
  const compartments = getCompartmentsByAirline(data.airline, data.aircraftModel);

  const getValue = (fieldId: string): string =>
    data.fieldValues.find(v => v.fieldDefinitionId === fieldId)?.value || '—';

  // Build times rows
  const timesRows = timeFields.map(f => {
    if (f.type === 'boolean') {
      const val = data.times[f.key] as boolean;
      return `<tr><td>${f.label}</td><td>${val ? 'SÍ' : 'NO'}</td></tr>`;
    }
    if (f.type === 'boolean-text') {
      const boolVal = data.times[f.key] as boolean;
      const textKey = `${String(f.key)}Data` as keyof TurnaroundTimes;
      const textVal = (data.times[textKey] as string) || '';
      return `<tr><td>${f.label}</td><td>${boolVal ? `SÍ — ${textVal || '—'}` : 'NO'}</td></tr>`;
    }
    const val = data.times[f.key] as string | null;
    let row = `<tr><td>${f.label}</td><td>${val || '—'}</td></tr>`;

    // Add extra ristra rows for Amazon after firstBag
    if (f.key === 'firstBag' && data.airline === 'AMAZON') {
      const ristraFields: { key: keyof TurnaroundTimes; label: string }[] = [
        { key: 'ristra2', label: 'Envío 2ª Ristra' },
        { key: 'ristra3', label: 'Envío 3ª Ristra' },
        { key: 'ristra4', label: 'Envío 4ª Ristra' },
      ];
      for (const r of ristraFields) {
        const rVal = data.times[r.key] as string | null;
        if (rVal) {
          row += `<tr><td>${r.label}</td><td>${rVal}</td></tr>`;
        }
      }
    }

    // Add extra jardinera rows after busArrival
    if (f.key === 'busArrival') {
      const busFields: { key: keyof TurnaroundTimes; label: string }[] = [
        { key: 'bus2', label: '2ª Jardinera' },
        { key: 'bus3', label: '3ª Jardinera' },
        { key: 'bus4', label: '4ª Jardinera' },
        { key: 'bus5', label: '5ª Jardinera' },
        { key: 'bus6', label: '6ª Jardinera' },
      ];
      for (const b of busFields) {
        const bVal = data.times[b.key] as string | null;
        if (bVal) {
          row += `<tr><td>${b.label}</td><td>${bVal}</td></tr>`;
        }
      }
    }

    return row;
  }).join('');

  // Build compartments
  let compartmentsHtml = '';
  if (compartments.length > 0) {
    compartmentsHtml = compartments.map(comp => {
      const isItaStyle = comp.holdStyle === 'ita';
      let holdsHtml = '';

      if (isItaStyle) {
        // ITA-style: type + número + contenido per hold
        holdsHtml = comp.holds.map(hold => {
          if (isPairedHold(hold)) return '';
          const typeVal = data.fieldValues.find(v => v.fieldDefinitionId === `${hold.id}-type`)?.value || '—';
          const numVal = data.fieldValues.find(v => v.fieldDefinitionId === `${hold.id}-num`)?.value || '—';
          const contentVal = data.fieldValues.find(v => v.fieldDefinitionId === `${hold.id}-content`)?.value || '—';
          const isNil = typeVal === 'NIL';
          return `
            <tr>
              <td rowspan="2" style="vertical-align:middle;text-align:center;font-size:13px;">${hold.label}</td>
              <td style="width:18%;text-align:center;">${isNil ? 'NIL' : typeVal}</td>
              <td style="width:18%;text-align:center;font-family:monospace;">${isNil ? 'NIL' : numVal}</td>
            </tr>
            <tr>
              <td colspan="2" style="background:#fafafa;">${isNil ? 'NIL' : contentVal}</td>
            </tr>
          `;
        }).join('');

        return `
          <h3>${comp.compartmentName}</h3>
          <table class="data-table ita-table">
            <tr style="background:#e5e5e5;font-weight:bold;">
              <td style="width:14%;text-align:center;">Bodega</td>
              <td style="text-align:center;">Tipo</td>
              <td style="text-align:center;">Nº Contenedor</td>
            </tr>
            ${holdsHtml}
          </table>
        `;
      }

      holdsHtml = comp.holds.map(hold => {
        if (isPairedHold(hold)) {
          return `<tr><td>${hold.left.label}</td><td>${getValue(hold.left.id)}</td><td>${hold.right.label}</td><td>${getValue(hold.right.id)}</td></tr>`;
        }
        return `<tr><td>${hold.label}</td><td colspan="3">${getValue(hold.id)}</td></tr>`;
      }).join('');

      // Expandable extra fields
      let extrasHtml = '';
      if (comp.expandable) {
        let i = 0;
        while (true) {
          const fieldId = `${comp.id}-extra-${i}`;
          const val = data.fieldValues.find(v => v.fieldDefinitionId === fieldId)?.value;
          if (val === undefined && i >= (comp.expandableDefault ?? 5)) break;
          if (val) {
            extrasHtml += `<tr><td>${i + 1}</td><td colspan="3">${val}</td></tr>`;
          }
          i++;
          if (i > 50) break; // safety
        }
      }

      return `
        <h3>${comp.compartmentName}</h3>
        <table class="data-table">
          ${holdsHtml}
          ${extrasHtml}
        </table>
      `;
    }).join('');
  }

  // Build equipment section
  let equipmentHtml = '';
  const equipmentSelections = (data.times.equipment || []) as EquipmentSelection[];
  const filledEquipment = equipmentSelections.filter(e => e.equipmentId);
  if (filledEquipment.length > 0) {
    const allCategories = getEquipmentCategories(data.aircraftModel);
    const grouped = new Map<string, { label: string; items: { label: string; percentage: string }[] }>();
    
    for (const sel of filledEquipment) {
      const cat = allCategories.find(c => c.id === sel.categoryId);
      if (!cat) continue;
      const item = cat.items.find(i => i.id === sel.equipmentId);
      if (!item) continue;
      
      if (!grouped.has(sel.categoryId)) {
        grouped.set(sel.categoryId, { label: cat.label, items: [] });
      }
      grouped.get(sel.categoryId)!.items.push({
        label: item.label,
        percentage: sel.percentage || '—',
      });
    }
    
    const rows = Array.from(grouped.values()).map(g =>
      g.items.map(item =>
        `<tr><td>${g.label}</td><td>${item.label}</td><td style="text-align:center;">${item.percentage}${item.percentage !== '—' ? '%' : ''}</td></tr>`
      ).join('')
    ).join('');
    
    equipmentHtml = `
      <h2>Equipos Utilizados</h2>
      <table class="data-table">
        <tr style="background:#e5e5e5;font-weight:bold;"><td>Categoría</td><td>Equipo</td><td style="text-align:center;">%</td></tr>
        ${rows}
      </table>`;
  }

  // Códigos de carga eliminados de la exportación PDF a petición del usuario

  // Resolve signed URLs for images
  const loadingSheetUrlsList = data.times.loadingSheetUrls?.length ? data.times.loadingSheetUrls : (data.times.loadingSheetUrl ? [data.times.loadingSheetUrl] : []);
  const loadingSheetSignedUrls = loadingSheetUrlsList.length ? await getSignedUrls(loadingSheetUrlsList) : [];
  const fileUrls = data.times.fileUrls?.length ? data.times.fileUrls : (data.times.fileUrl ? [data.times.fileUrl] : []);
  const fileSignedUrls = fileUrls.length ? await getSignedUrls(fileUrls) : [];
  const obsPhotoSignedUrls = data.times.observationPhotos?.length
    ? await getSignedUrls(data.times.observationPhotos)
    : [];


  const acScannerHtml = (data.airline === 'AIR_CANADA' || data.airline === 'AIR_CANADA_CARGO')
    ? await buildAirCanadaScannerHtml(data.flightNumber, format(data.date, 'yyyy-MM-dd'))
    : '';


  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Escala ${data.flightNumber} — ${format(data.date, 'dd/MM/yyyy', { locale: es })}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; padding: 16px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin: 14px 0 6px; border-bottom: 2px solid #333; padding-bottom: 3px; }
  h3 { font-size: 12px; margin: 10px 0 4px; color: #444; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 3px solid #000; padding-bottom: 8px; }
  .header-left { flex: 1; }
  .meta { font-size: 11px; color: #555; margin-top: 2px; }
  .meta span { margin-right: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .data-table td { border: 1px solid #ccc; padding: 4px 8px; }
  .data-table td:first-child { font-weight: bold; width: 30%; background: #f5f5f5; }
  .ita-table td { background: #fff !important; font-weight: normal; width: auto !important; }
  .ita-table tr:first-child td { background: #e5e5e5 !important; font-weight: bold; }
  .data-table td.code { width: 50px; text-align: center; font-family: monospace; }
  .obs { white-space: pre-wrap; border: 1px solid #ccc; padding: 8px; min-height: 40px; background: #fafafa; }
  .pdf-toolbar { position: sticky; top: 0; z-index: 9999; display: flex; gap: 8px; justify-content: flex-end; padding: 10px 12px; background: #1a1a2e; border-bottom: 2px solid #000; margin: -16px -16px 12px -16px; }
  .pdf-toolbar button { font-family: inherit; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; padding: 10px 16px; cursor: pointer; color: #fff; display: inline-flex; align-items: center; gap: 6px; -webkit-tap-highlight-color: transparent; }
  .pdf-toolbar .btn-download { background: #2563eb; }
  .pdf-toolbar .btn-share { background: #16a34a; }
  @media print {
    body { padding: 0; }
    @page { margin: 12mm; }
    .pdf-toolbar { display: none !important; }
  }
</style>
</head>
<body>
  <div class="pdf-toolbar">
    <button class="btn-share" type="button" onclick="(async()=>{try{const title=document.title;const text='Escala '+title;if(navigator.share){try{const html='<!DOCTYPE html>'+document.documentElement.outerHTML;const file=new File([html],(title||'escala')+'.html',{type:'text/html'});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:title,text:text,files:[file]});return;}}catch(e){}try{await navigator.share({title:title,text:text,url:location.href});return;}catch(e){if(e&&e.name==='AbortError')return;}}window.print();}catch(e){if(e&&e.name!=='AbortError'){window.print();}}})()">📤 Compartir</button>
    <button class="btn-download" type="button" onclick="window.print()">⬇️ Descargar PDF</button>
  </div>
  <div class="header">
    <div class="header-left">
      <h1>✈️ Escala</h1>
      <div class="meta">
        <span><b>🛬 Vuelo de llegada:</b> ${data.flightNumber || '—'}${data.times.originStation && data.times.homeStation ? ` <span style="color:#555;">(${data.times.originStation} → ${data.times.homeStation})</span>` : ''}</span>
        <span><b>🛫 Vuelo de salida:</b> ${data.times.departureFlightNumber || '—'}${data.times.homeStation && data.times.destStation ? ` <span style="color:#555;">(${data.times.homeStation} → ${data.times.destStation})</span>` : ''}</span>
      </div>
      <div class="meta">
        <span><b>Aerolínea:</b> ${airlineInfo?.name || data.airline}</span>
        <span><b>Modelo:</b> ${data.aircraftModel || '—'}</span>
        <span><b>Matrícula:</b> ${data.times.matricula || '—'}</span>
        <span><b>Fecha:</b> ${format(data.date, "dd 'de' MMMM yyyy", { locale: es })}</span>
      </div>
      <div class="meta">
        ${!data.isRemote && data.tango ? `<span><b>Tango:</b> ${data.tango}</span>` : ''}
        ${data.isRemote ? `<span><b>🟠 Remoto:</b> ${data.remoteLocation || '—'}</span>` : ''}
      </div>
    </div>
    ${data.times.airlineLogo ? `<div class="header-right"><img src="${data.times.airlineLogo}" alt="Logo aerolínea" style="max-height:60px;max-width:120px;object-fit:contain;" onerror="this.style.display='none'" /></div>` : ''}
  </div>


  ${(data.times.scheduledArrival || data.times.scheduledEta || data.times.scheduledStd || data.times.scheduledEtd) ? `
  <h2>Horarios Programados</h2>
  <table class="data-table">
    ${data.times.scheduledArrival ? `<tr><td>STA (Programada Llegada)</td><td>${data.times.scheduledArrival}</td></tr>` : ''}
    ${data.times.scheduledEta ? `<tr><td>ETA (Estimada Llegada)</td><td>${data.times.scheduledEta}</td></tr>` : ''}
    ${data.times.scheduledStd ? `<tr><td>STD (Programada Salida)</td><td>${data.times.scheduledStd}</td></tr>` : ''}
    ${data.times.scheduledEtd ? `<tr><td>ETD (Estimada Salida)</td><td>${data.times.scheduledEtd}</td></tr>` : ''}
  </table>` : ''}

  ${data.times.ldmRaw ? `
  <h2>LDM</h2>
  <pre class="obs" style="font-family:monospace;font-size:10px;">${data.times.ldmRaw.replace(/[<>&]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;' }[c] as string))}</pre>` : ''}

  ${(data.times.cpmRawLines && data.times.cpmRawLines.length > 0) ? `
  <h2>CPM</h2>
  <pre class="obs" style="font-family:monospace;font-size:10px;">${data.times.cpmRawLines.join('\n').replace(/[<>&]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;' }[c] as string))}</pre>` : ''}

  <h2>Control de Horas</h2>
  <table class="data-table">
    ${timesRows}
  </table>


  ${compartmentsHtml ? `<h2>Carga de Salida — Compartimentos</h2>${compartmentsHtml}` : ''}

  ${acScannerHtml}


  ${equipmentHtml}

  ${data.observations ? `
  <h2>Observaciones</h2>
  <div class="obs">${data.observations}</div>` : ''}

  ${loadingSheetSignedUrls.filter(Boolean).length > 0 ? `
  <h2>Hoja de Carga</h2>
  <div style="text-align:center; display:flex; flex-wrap:wrap; gap:8px; justify-content:center;">
    ${loadingSheetSignedUrls.filter(Boolean).map((url, i) => `<img src="${url}" alt="Hoja de carga ${i + 1}" style="max-width:48%;max-height:400px;border:1px solid #ccc;border-radius:4px;" />`).join('\n    ')}
  </div>` : ''}

  ${fileSignedUrls.filter(Boolean).length > 0 ? `
  <h2>Adjuntar File</h2>
  <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
    ${fileSignedUrls.filter(Boolean).map((url, i) => `<img src="${url}" alt="File ${i + 1}" style="max-width:48%;max-height:400px;border:1px solid #ccc;border-radius:4px;" />`).join('\n    ')}
  </div>` : ''}

  ${obsPhotoSignedUrls.filter(Boolean).length > 0 ? `
  <h2>Fotos de Observaciones</h2>
  <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
    ${obsPhotoSignedUrls.filter(Boolean).map((url, i) => `<img src="${url}" alt="Observación ${i + 1}" style="max-width:48%;max-height:400px;border:1px solid #ccc;border-radius:4px;" />`).join('\n    ')}
  </div>` : ''}
</body>
</html>`;

  // Detect standalone mode (PWA / home screen web app on iOS)
  const isStandalone = (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) {
    // In standalone (PWA) mode, window.open and blob downloads are blocked.
    // Open the HTML content in a full-screen overlay iframe.
    const existingOverlay = document.getElementById('pdf-overlay');
    if (existingOverlay) document.body.removeChild(existingOverlay);

    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:white;display:flex;flex-direction:column;';

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#1a1a2e;color:#fff;font-family:sans-serif;font-size:15px;';

    const title = document.createElement('span');
    title.textContent = `Escala ${data.flightNumber}`;
    toolbar.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Cerrar';
    closeBtn.style.cssText = 'background:#ef4444;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:14px;font-weight:600;cursor:pointer;';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    toolbar.appendChild(closeBtn);

    overlay.appendChild(toolbar);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'flex:1;border:none;width:100%;';
    iframe.srcdoc = html;
    overlay.appendChild(iframe);

    document.body.appendChild(overlay);
  } else {
    // Standard browser: try opening in a new tab
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');

    if (!newWindow) {
      // Fallback: trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `escala-${data.flightNumber}-${format(data.date, 'yyyyMMdd')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
};
