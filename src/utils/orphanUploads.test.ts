import { describe, it, expect } from 'vitest';
import { classifyOrphans, countOrphans, prefixOf, type StorageObject } from './orphanUploads';

const USER = 'f339632e-dc48-4a1d-8fee-3f42d81affdf';
const ESC = '7ae8af34-9168-4bb6-86a7-7cc469acad70';
const obj = (nombre: string, bucket = 'turnaround-files'): StorageObject => ({ name: `${USER}/${nombre}`, bucket });

describe('classifyOrphans', () => {
  it('reparte cada adjunto perdido en su sección', () => {
    const objetos = [
      obj(`${ESC}-file-1787507304904-qfqd.jpg`),
      obj(`${ESC}-obs-1787509065261-wuho.jpg`),
      obj(`${ESC}-ls-1787501821139-nu17.jpg`, 'loading-sheets'),
    ];
    const r = classifyOrphans(objetos, [], ESC);
    expect(r.fileUrls).toEqual([`turnaround-files:${USER}/${ESC}-file-1787507304904-qfqd.jpg`]);
    expect(r.observationPhotos).toHaveLength(1);
    expect(r.loadingSheetUrls).toEqual([`loading-sheets:${USER}/${ESC}-ls-1787501821139-nu17.jpg`]);
    expect(countOrphans(r)).toBe(3);
  });

  it('lo ya registrado no se ofrece como perdido', () => {
    const o = obj(`${ESC}-obs-1-a.jpg`);
    expect(countOrphans(classifyOrphans([o], [`turnaround-files:${o.name}`], ESC))).toBe(0);
  });

  it('las capturas de reportes de fallo NO son adjuntos de la escala', () => {
    // Viven en el mismo cubo y llevan el id de la escala, pero cuelgan de la
    // tabla de reportes: ofrecerlas para "recuperar" sería un falso positivo.
    const capturas = [
      obj(`issue-${ESC}-1787509405237-3gkw.jpg`),
      obj(`issue-${ESC}-1787509406183-sz7b.jpg`),
    ];
    expect(countOrphans(classifyOrphans(capturas, [], ESC))).toBe(0);
  });

  it('no toca archivos de otras escalas del mismo usuario', () => {
    const otra = '00000000-0000-0000-0000-000000000000';
    expect(countOrphans(classifyOrphans([obj(`${otra}-obs-1-a.jpg`)], [], ESC))).toBe(0);
  });

  it('ignora prefijos desconocidos en vez de adivinar', () => {
    expect(countOrphans(classifyOrphans([obj(`${ESC}-loquesea-1-a.jpg`)], [], ESC))).toBe(0);
  });

  it('el caso real de AZ060: sólo el file estaba huérfano', () => {
    const objetos = [
      obj(`${ESC}-file-1787507304904-qfqd.jpg`),
      obj(`issue-${ESC}-1787509037808-zlig.jpg`),
      obj(`issue-${ESC}-1787509405237-3gkw.jpg`),
      obj(`issue-${ESC}-1787509406183-sz7b.jpg`),
      obj(`issue-${ESC}-1787509406886-cen2.jpg`),
      obj(`${ESC}-obs-1787509065261-wuho.jpg`),
    ];
    const registrados = [`turnaround-files:${USER}/${ESC}-obs-1787509065261-wuho.jpg`];
    const r = classifyOrphans(objetos, registrados, ESC);
    expect(countOrphans(r)).toBe(1);
    expect(r.fileUrls).toHaveLength(1);
  });
});

describe('prefixOf', () => {
  it('saca el prefijo del nombre', () => {
    expect(prefixOf(`${USER}/${ESC}-obs-1-a.jpg`, ESC)).toBe('obs');
  });
  it('descarta las capturas de reportes', () => {
    expect(prefixOf(`${USER}/issue-${ESC}-1-a.jpg`, ESC)).toBeNull();
  });
});
