import { TurnaroundTimes, AirlineCode, AIRLINES, getTimeFieldsForAirline, getPushBackField, FieldValue } from '@/types/turnaround';
import { getFieldsByAirline } from '@/data/fieldDefinitions';
import { getCompartmentsByAirline, isPairedHold } from '@/data/compartmentDefinitions';
import { format } from 'date-fns';
import { getSignedUrl, getSignedUrls } from '@/utils/storageUrl';
import { es } from 'date-fns/locale';

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
  const baseTimeFields = getTimeFieldsForAirline(data.airline, data.isRemote, data.times.soloLlegada);
  // Append Push Back field if applicable (parking T always, or remote with toggle on)
  const showPushBack = !data.isRemote || data.times.pushBack;
  const timeFields = showPushBack ? [...baseTimeFields, getPushBackField()] : baseTimeFields;
  const fields = getFieldsByAirline(data.airline);
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
      const holdsHtml = comp.holds.map(hold => {
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

  // Build codes table
  const codesHtml = fields.map(f =>
    `<tr><td class="code">${f.code}</td><td>${f.label}</td></tr>`
  ).join('');

  // Resolve signed URLs for images
  const loadingSheetSignedUrl = await getSignedUrl(data.times.loadingSheetUrl);
  const fileUrls = data.times.fileUrls?.length ? data.times.fileUrls : (data.times.fileUrl ? [data.times.fileUrl] : []);
  const fileSignedUrls = fileUrls.length ? await getSignedUrls(fileUrls) : [];
  const obsPhotoSignedUrls = data.times.observationPhotos?.length
    ? await getSignedUrls(data.times.observationPhotos)
    : [];

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
  .data-table td.code { width: 50px; text-align: center; font-family: monospace; }
  .obs { white-space: pre-wrap; border: 1px solid #ccc; padding: 8px; min-height: 40px; background: #fafafa; }
  @media print {
    body { padding: 0; }
    @page { margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>✈️ ${data.flightNumber}</h1>
      <div class="meta">
        <span><b>Aerolínea:</b> ${airlineInfo?.name || data.airline}</span>
        <span><b>Modelo:</b> ${data.aircraftModel || '—'}</span>
        <span><b>Fecha:</b> ${format(data.date, "dd 'de' MMMM yyyy", { locale: es })}</span>
      </div>
      <div class="meta">
        ${!data.isRemote && data.tango ? `<span><b>Tango:</b> ${data.tango}</span>` : ''}
        ${data.isRemote ? `<span><b>🟠 Remoto:</b> ${data.remoteLocation || '—'}</span>` : ''}
      </div>
    </div>
  </div>

  <h2>Control de Horas</h2>
  <table class="data-table">
    ${timesRows}
  </table>

  ${compartmentsHtml ? `<h2>Carga de Salida — Compartimentos</h2>${compartmentsHtml}` : ''}

  ${codesHtml ? `
  <h2>Códigos de Carga</h2>
  <table class="data-table">
    ${codesHtml}
  </table>` : ''}

  ${data.observations ? `
  <h2>Observaciones</h2>
  <div class="obs">${data.observations}</div>` : ''}

  ${loadingSheetSignedUrl ? `
  <h2>Hoja de Carga</h2>
  <div style="text-align:center;">
    <img src="${loadingSheetSignedUrl}" alt="Hoja de carga" style="max-width:100%;max-height:600px;border:1px solid #ccc;border-radius:4px;" />
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
