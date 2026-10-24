import { describe, it, expect, beforeEach } from 'vitest';
import { saveDraft, loadDraft, pruneDrafts, type TurnaroundDraft } from '@/lib/turnaroundDraft';

const HORA = 60 * 60 * 1000;

const draft = (id: string, savedAt = Date.now()): TurnaroundDraft => ({
  turnaroundId: id,
  flightNumber: 'W64039',
  date: new Date('2026-08-15').toISOString(),
  airline: 'WIZZ',
  aircraftModel: 'A321',
  times: {} as TurnaroundDraft['times'],
  fieldValues: [],
  observations: '',
  tango: 'T14',
  matricula: '',
  isRemote: false,
  soloLlegada: false,
  soloSalida: false,
  remoteLocation: '',
  step: 2,
  savedAt,
});

beforeEach(() => localStorage.clear());

describe('pruneDrafts', () => {
  it('tira los borradores viejos y respeta los recientes', () => {
    saveDraft(draft('viejo', Date.now() - 72 * HORA));
    saveDraft(draft('reciente'));

    expect(pruneDrafts()).toBe(1);
    expect(loadDraft('viejo')).toBeNull();
    expect(loadDraft('reciente')).not.toBeNull();
  });

  it('nunca tira el borrador que se le pide conservar', () => {
    saveDraft(draft('en-curso', Date.now() - 72 * HORA));
    pruneDrafts(0, 'turnaround_draft_en-curso');
    expect(loadDraft('en-curso')).not.toBeNull();
  });

  it('tira los borradores corruptos o de versiones antiguas', () => {
    localStorage.setItem('turnaround_draft_roto', '{no es json');
    localStorage.setItem('turnaround_draft_sinfecha', '{"flightNumber":"IB123"}');
    expect(pruneDrafts()).toBe(2);
  });
});

describe('saveDraft con el almacén lleno', () => {
  /** Simula el límite de Safari: falla al escribir hasta que se hace sitio. */
  const llenarAlmacen = (permitirTrasLiberar: boolean) => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      const hayViejos = Object.keys(localStorage).some(x => x.startsWith('turnaround_draft_'));
      if (hayViejos || !permitirTrasLiberar) throw new DOMException('quota', 'QuotaExceededError');
      return real.call(this, k, v);
    };
    return () => { Storage.prototype.setItem = real; };
  };

  it('hace sitio tirando borradores viejos y consigue guardar', () => {
    const real = Storage.prototype.setItem;
    real.call(localStorage, 'turnaround_draft_viejo', JSON.stringify(draft('viejo', 0)));
    const restaurar = llenarAlmacen(true);
    try {
      expect(saveDraft(draft('en-curso'))).toBe(true);
    } finally { restaurar(); }
  });

  it('devuelve false cuando no hay forma de guardar, para poder avisar', () => {
    const restaurar = llenarAlmacen(false);
    try {
      expect(saveDraft(draft('en-curso'))).toBe(false);
    } finally { restaurar(); }
  });
});

describe('un borrador con informe de incidente no caduca', () => {
  const viejo = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 días

  const guardar = (clave: string, extra: Record<string, unknown>) =>
    localStorage.setItem(clave, JSON.stringify({ savedAt: viejo, times: {}, ...extra }));

  beforeEach(() => localStorage.clear());

  it('se conserva aunque pase el plazo', () => {
    guardar('turnaround_draft_abc', {
      times: { incidentReport: { nombre: 'Óscar', descripcion: 'Golpe en la pasarela.' } },
    });
    expect(pruneDrafts()).toBe(0);
    expect(localStorage.getItem('turnaround_draft_abc')).not.toBeNull();
  });

  it('uno viejo y sin informe sí se tira, como hasta ahora', () => {
    guardar('turnaround_draft_xyz', {});
    expect(pruneDrafts()).toBe(1);
    expect(localStorage.getItem('turnaround_draft_xyz')).toBeNull();
  });

  it('un informe en blanco no cuenta: no hay nada que proteger', () => {
    guardar('turnaround_draft_vacio', {
      times: { incidentReport: { nombre: '', descripcion: '   ' } },
    });
    expect(pruneDrafts()).toBe(1);
  });

  it('con el almacén lleno tampoco se sacrifica el informe', () => {
    // pruneDrafts(0) es el último recurso al no caber un borrador nuevo.
    guardar('turnaround_draft_con', {
      times: { incidentReport: { nombre: 'Óscar', descripcion: 'Incidente.' } },
    });
    guardar('turnaround_draft_sin', {});
    expect(pruneDrafts(0)).toBe(1);
    expect(localStorage.getItem('turnaround_draft_con')).not.toBeNull();
  });
});
