/**
 * Armazón común de los PDF de la app.
 *
 * Los dos informes (el de escala y la hoja de Control de Rampa) se generan
 * igual: se abre un HTML con dos botones, y al pulsarlos html2canvas pasa cada
 * bloque `data-pdf-section` a una hoja A4 con jsPDF. Esto vivía dentro del
 * generador del informe; se saca aquí tal cual para que la hoja nueva no tenga
 * que repetirlo ni se puedan ir separando con el tiempo.
 *
 * El guion no depende de los datos de la escala: se apaña con el título del
 * documento y con los bloques que encuentre, así que vale para cualquier
 * informe que respete esa marca.
 */

/** Librerías que necesita el guion de arriba. Van por CDN, como hasta ahora. */
export const PDF_LIBS = `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>`;

/** Barra con «Compartir» y «Descargar PDF», y el guion que los hace funcionar. */
export const PDF_TOOLBAR_Y_SCRIPT = "  <div class=\"pdf-toolbar\" id=\"pdf-toolbar\">\n    <button class=\"btn-share\" id=\"btn-share\" type=\"button\">📤 Compartir</button>\n    <button class=\"btn-download\" id=\"btn-download\" type=\"button\">⬇️ Descargar PDF</button>\n  </div>\n<script>\n(function(){\n  var toolbar = document.getElementById('pdf-toolbar');\n  var btnDownload = document.getElementById('btn-download');\n  var btnShare = document.getElementById('btn-share');\n  var title = document.title || 'escala';\n  var fileName = title.replace(/[^a-zA-Z0-9-_]+/g,'-').replace(/^-+|-+$/g,'') + '.pdf';\n\n  function setBusy(text){\n    btnDownload.disabled = true; btnShare.disabled = true;\n    btnDownload.style.opacity = '0.6'; btnShare.style.opacity = '0.6';\n    if(text){ btnDownload.textContent = text; }\n  }\n  function resetBtns(){\n    btnDownload.disabled = false; btnShare.disabled = false;\n    btnDownload.style.opacity = ''; btnShare.style.opacity = '';\n    btnDownload.textContent = '⬇️ Descargar PDF';\n    btnShare.textContent = '📤 Compartir';\n  }\n\n  async function buildPdfBlob(){\n    if(!window.jspdf || !window.html2canvas){\n      throw new Error('PDF libraries not loaded');\n    }\n    toolbar.style.display = 'none';\n    await new Promise(function(r){ requestAnimationFrame(function(){ r(null); }); });\n    try {\n      var jsPDF = window.jspdf.jsPDF;\n      var pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });\n      var PAGE_W = pdf.internal.pageSize.getWidth();\n      var PAGE_H = pdf.internal.pageSize.getHeight();\n      var MARGIN = 10;\n      var CONTENT_W = PAGE_W - MARGIN * 2;\n      var CONTENT_H = PAGE_H - MARGIN * 2;\n      var GAP = 3;\n\n      var sections = Array.prototype.slice.call(document.querySelectorAll('[data-pdf-section]'));\n      var currentY = MARGIN;\n      var first = true;\n\n      for (var i = 0; i < sections.length; i++) {\n        var el = sections[i];\n        if (!el || !el.offsetHeight) continue;\n        var canvas = await window.html2canvas(el, {\n          scale: 2,\n          useCORS: true,\n          allowTaint: false,\n          backgroundColor: '#ffffff',\n          logging: false,\n        });\n        var pxW = canvas.width;\n        var pxH = canvas.height;\n        var scale = CONTENT_W / (pxW / 2); // undo scale:2 for mm mapping\n        var wMM = CONTENT_W;\n        var hMM = (pxH / 2) * scale;\n\n        // If a single section is taller than a page, scale it down to fit one page.\n        if (hMM > CONTENT_H) {\n          var shrink = CONTENT_H / hMM;\n          hMM = CONTENT_H;\n          wMM = wMM * shrink;\n        }\n\n        var remaining = PAGE_H - MARGIN - currentY;\n        if (!first && hMM > remaining) {\n          pdf.addPage();\n          currentY = MARGIN;\n        }\n\n        var xMM = MARGIN + (CONTENT_W - wMM) / 2;\n        var imgData = canvas.toDataURL('image/jpeg', 0.92);\n        pdf.addImage(imgData, 'JPEG', xMM, currentY, wMM, hMM);\n        currentY += hMM + GAP;\n        first = false;\n      }\n\n      return pdf.output('blob');\n    } finally {\n      toolbar.style.display = '';\n    }\n  }\n\n  function downloadBlob(blob){\n    var url = URL.createObjectURL(blob);\n    var a = document.createElement('a');\n    a.href = url; a.download = fileName;\n    document.body.appendChild(a);\n    a.click();\n    document.body.removeChild(a);\n    setTimeout(function(){ URL.revokeObjectURL(url); }, 15000);\n  }\n\n  btnDownload.addEventListener('click', async function(){\n    setBusy('Generando…');\n    try {\n      var blob = await buildPdfBlob();\n      var file = new File([blob], fileName, { type: 'application/pdf' });\n      if(navigator.canShare && navigator.canShare({ files: [file] })){\n        try { await navigator.share({ title: title, files: [file] }); resetBtns(); return; }\n        catch(e){ if(e && e.name === 'AbortError'){ resetBtns(); return; } }\n      }\n      try {\n        downloadBlob(blob);\n      } catch(e){\n        var url = URL.createObjectURL(blob);\n        window.open(url, '_blank');\n      }\n    } catch(e){\n      alert('No se pudo generar el PDF: ' + (e && e.message ? e.message : e));\n    } finally {\n      resetBtns();\n    }\n  });\n\n  btnShare.addEventListener('click', async function(){\n    setBusy('Preparando…');\n    try {\n      var blob = await buildPdfBlob();\n      var file = new File([blob], fileName, { type: 'application/pdf' });\n      if(navigator.canShare && navigator.canShare({ files: [file] })){\n        try { await navigator.share({ title: title, files: [file] }); }\n        catch(e){ if(!e || e.name !== 'AbortError'){ downloadBlob(blob); } }\n      } else {\n        downloadBlob(blob);\n      }\n    } catch(e){\n      alert('No se pudo compartir el PDF: ' + (e && e.message ? e.message : e));\n    } finally {\n      resetBtns();\n    }\n  });\n})();\n</script>\n";

/**
 * Entrega el HTML al usuario.
 *
 * En la app instalada (PWA) ni `window.open` ni las descargas por blob
 * funcionan, así que se enseña a pantalla completa dentro de un iframe. Fuera
 * de la app se abre en una pestaña, y si el navegador la bloquea se descarga.
 */
export const entregarPdfHtml = (html: string, nombreArchivo: string, titulo: string): void => {
  const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) {
    const anterior = document.getElementById('pdf-overlay');
    if (anterior) document.body.removeChild(anterior);

    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:white;display:flex;flex-direction:column;';

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#1a1a2e;color:#fff;font-family:sans-serif;font-size:15px;';

    const title = document.createElement('span');
    title.textContent = titulo;
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
    return;
  }

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const nueva = window.open(url, '_blank');

  if (!nueva) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  setTimeout(() => URL.revokeObjectURL(url), 15000);
};
