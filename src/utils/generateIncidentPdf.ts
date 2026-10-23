import { format } from 'date-fns';

/**
 * jsPDF y html2canvas se piden al usarlos, NO al cargar la app.
 *
 * Entre los dos pesan 189 KB comprimidos y entraban en el arranque por una
 * cadena de importaciones: el formulario de escala trae el diálogo de
 * informe, que traía esto. Resultado: todo el mundo se descargaba y compilaba
 * el generador de PDF para ver la lista de escalas. Medido en producción, era
 * el 32% de todo el JavaScript inicial.
 */
const cargarLibreriasPdf = async () => {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas').then((m) => m.default),
  ]);
  return { jsPDF, html2canvas };
};

const esc = (s: string) => {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
};

export interface CasillaInforme {
  etiqueta: string;
  valor: string;
}

export interface DatosInforme {
  /** Las tres casillas de la fila de datos, en orden. */
  casillas: [CasillaInforme, CasillaInforme, CasillaInforme];
  descripcion: string;
  /** La que sale en la cabecera, junto al departamento. */
  fecha: string;
}

/**
 * Informe de incidente de Aviapartner (MAD) en PDF, una hoja A4.
 *
 * Vivía dentro del diálogo de la escala. Se saca aquí porque el informe que
 * se hace desde la pantalla de inicio es el mismo impreso con otras tres
 * casillas, y dos copias de una plantilla que se entrega firmada acabarían
 * separándose.
 */
/**
 * La hoja, como HTML. Separada de la captura para poder verla tal cual sale
 * sin tener que generar un PDF.
 */
export const construirHojaInforme = (data: DatosInforme, logoUrl: string): string => `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;padding:38px;width:794px;height:1123px;box-sizing:border-box;position:relative;">
      <!--
        Sello vertical de la casa. Va en el margen izquierdo de la hoja, FUERA
        del recuadro: antes se posicionaba dentro de la caja con borde y, al
        girarlo, la mancha caía sobre el texto de la descripción.
        El contenedor ocupa exactamente el margen (38 px) y centra el texto;
        así el giro es sobre su propio centro y no hay que calcular offsets.
      -->
      <div style="position:absolute;left:0;top:0;width:38px;height:100%;display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(-90deg);font-size:9px;font-weight:bold;letter-spacing:1px;color:#555;white-space:nowrap;">AVIAPARTNER (MAD)</span>
      </div>
      <div style="border:2px solid #000;width:100%;height:100%;display:flex;flex-direction:column;position:relative;">
        <table style="width:100%;border-collapse:collapse;flex-shrink:0;">
          <tr>
            <td style="width:35%;text-align:center;border:1px solid #000;padding:6px 10px;vertical-align:middle;" rowspan="2">
              <img src="${logoUrl}" alt="Aviapartner" style="max-height:60px;max-width:100%;" />
            </td>
            <td style="width:20%;text-align:center;border:1px solid #000;padding:6px 10px;vertical-align:middle;" rowspan="2">
              <div style="font-size:22px;font-weight:bold;">MAD</div>
              <div style="font-size:11px;font-weight:bold;margin-top:4px;">INFORME<br>INCIDENTE</div>
            </td>
            <td style="width:45%;border:1px solid #000;padding:6px 10px;vertical-align:middle;">
              <span style="font-weight:bold;font-size:11px;">DEPARTAMENTO:</span> Rampa
            </td>
          </tr>
          <tr>
            <td style="width:45%;border:1px solid #000;padding:6px 10px;vertical-align:middle;">
              <div><span style="font-weight:bold;font-size:11px;">FECHA:</span> ${esc(data.fecha)}</div>
              <div style="margin-top:4px;"><span style="font-weight:bold;font-size:11px;">Rev:</span></div>
              <div style="margin-top:4px;"><span style="font-weight:bold;font-size:11px;">Página:</span> 1</div>
            </td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;flex-shrink:0;">
          <tr>
            ${data.casillas.map((c, i) => `<td style="border:1px solid #000;padding:8px 10px;font-weight:bold;width:${i === 2 ? '34' : '33'}%;">${esc(c.etiqueta)}: <span style="font-weight:normal;">${esc(c.valor)}</span></td>`).join('')}
          </tr>
        </table>
        <div style="border:1px solid #000;border-top:none;flex:1;padding:10px;display:flex;flex-direction:column;">
          <div style="font-weight:bold;margin-bottom:8px;">DESCRIPCIÓN:</div>
          <div style="white-space:pre-wrap;font-size:12px;line-height:1.6;flex:1;">${esc(data.descripcion)}</div>
        </div>
        <div style="flex-shrink:0;display:flex;justify-content:space-between;padding:10px 16px;font-size:9px;color:#333;border-top:1px solid #ccc;">
          <div>Management System Aviapartner<br>SPAIN-<br>APO A002.ed 170619.1.0</div>
          <div>Uncontrolled Copy when not On Intranet</div>
          <div style="text-align:right;">Validity date: 19/06/2017<br>Print date: ${format(new Date(), 'dd/MM/yyyy')}<br>Pag 1 of 1</div>
        </div>
      </div>
    </div>`;

export const generateIncidentPdf = async (data: DatosInforme): Promise<Blob> => {
  const { jsPDF, html2canvas } = await cargarLibreriasPdf();
  // PNG de 1200 px con fondo transparente. El JPEG anterior era de baja
  // resolución, en escala de grises y con una caja blanca opaca alrededor que
  // se veía como un recuadro gris dentro de la celda.
  const logoUrl = `${window.location.origin}/images/aviapartner-logo.png`;

  // Create a hidden container to render HTML for capture
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;background:white;z-index:-1;';
  container.innerHTML = construirHojaInforme(data, logoUrl);

  document.body.appendChild(container);


  /**
   * Rasteriza la hoja a la escala pedida, o devuelve null si no ha salido bien.
   *
   * Safari en iOS tiene un tope de superficie de lienzo y, cuando se supera, NO
   * lanza ningún error: devuelve un lienzo en blanco. Sin esta comprobación el
   * informe podría salir en blanco sin que nadie se enterase hasta enviarlo.
   * Por eso se mira que haya tinta de verdad antes de darlo por bueno.
   */
  const renderCanvas = async (el: HTMLElement, scale: number): Promise<HTMLCanvasElement | null> => {
    try {
      const c = await html2canvas(el, { scale, useCORS: true, logging: false, width: 794, height: 1123 });
      if (!c.width || !c.height) return null;
      // El recuadro y la cabecera ocupan la parte de arriba de la hoja: si esa
      // franja no tiene ni un píxel oscuro, la captura ha fallado.
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      const franja = ctx.getImageData(0, 0, c.width, Math.round(c.height * 0.2)).data;
      for (let i = 0; i < franja.length; i += 4) {
        if (franja[i] < 200 && franja[i + 3] > 0) return c;
      }
      console.warn(`[informe] captura en blanco a escala ${scale}`);
      return null;
    } catch (e) {
      console.warn(`[informe] fallo al capturar a escala ${scale}`, e);
      return null;
    }
  };

  // Wait for logo to load
  const img = container.querySelector('img');
  if (img && !img.complete) {
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 2000);
    });
  }

  try {
    // Se captura a 3x para que el texto salga bien definido. Si el móvil no
    // puede con un lienzo de ese tamaño se repite a 2x: ver `renderCanvas`.
    const canvas = await renderCanvas(container, 3) ?? await renderCanvas(container, 2);
    if (!canvas) throw new Error('No se pudo generar la imagen del informe');

    // `compress` + el modo 'FAST' de addImage son lo que hace manejable el
    // fichero: sin ellos la hoja se incrustaba en crudo y un informe de una
    // sola página salía de más de 10 MB, incómodo de enviar por correo.
    // La compresión es sin pérdida, así que no cuesta nitidez.
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
};
