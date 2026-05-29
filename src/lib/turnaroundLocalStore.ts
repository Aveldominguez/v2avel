// Local cache for turnarounds — enables offline reads and optimistic writes.
// Stored in localStorage as JSON arrays keyed by user_id. Volume is small (one
// record per escala) so localStorage (5 MB+) is sufficient and synchronous.
import { Turnaround, TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';

const KEY = (userId: string) => `turnarounds_local_v1_${userId}`;

export interface LocalTurnaround {
  id: string;
  user_id: string;
  flightNumber: string;
  date: string;            // ISO yyyy-mm-dd
  airline: AirlineCode;
  times: TurnaroundTimes;
  fieldValues: Array<Omit<FieldValue, 'updatedAt'> & { updatedAt: string }>;
  observations: string;
  createdAt: string;       // ISO datetime
  updatedAt: string;       // ISO datetime
  _pendingSync?: boolean;  // true while not yet pushed to Supabase
  _localId?: string;       // present if id is a client-generated UUID
}

const readAll = (userId: string): LocalTurnaround[] => {
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? (JSON.parse(raw) as LocalTurnaround[]) : [];
  } catch {
    return [];
  }
};

const writeAll = (userId: string, list: LocalTurnaround[]) => {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(list));
  } catch (e) {
    console.warn('turnaroundLocalStore: write failed', e);
  }
};

export const localTurnaroundStore = {
  list(userId: string): LocalTurnaround[] {
    return readAll(userId).sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  },

  get(userId: string, id: string): LocalTurnaround | null {
    return readAll(userId).find(t => t.id === id || t._localId === id) || null;
  },

  upsert(userId: string, t: LocalTurnaround) {
    const list = readAll(userId);
    const idx = list.findIndex(x => x.id === t.id || (t._localId && x._localId === t._localId));
    if (idx >= 0) list[idx] = t;
    else list.push(t);
    writeAll(userId, list);
  },

  upsertMany(userId: string, items: LocalTurnaround[]) {
    if (items.length === 0) return;
    const list = readAll(userId);
    const byKey = new Map(list.map(x => [x.id, x]));
    for (const it of items) byKey.set(it.id, { ...byKey.get(it.id), ...it });
    writeAll(userId, Array.from(byKey.values()));
  },

  remove(userId: string, id: string) {
    const list = readAll(userId).filter(x => x.id !== id && x._localId !== id);
    writeAll(userId, list);
  },

  /** Replace a local-generated id with the real server id after sync. */
  remapId(userId: string, localId: string, serverId: string) {
    const list = readAll(userId);
    const idx = list.findIndex(x => x.id === localId);
    if (idx < 0) return;
    list[idx] = { ...list[idx], id: serverId, _localId: localId, _pendingSync: false };
    writeAll(userId, list);
  },

  markSynced(userId: string, id: string) {
    const list = readAll(userId);
    const idx = list.findIndex(x => x.id === id || x._localId === id);
    if (idx < 0) return;
    list[idx] = { ...list[idx], _pendingSync: false };
    writeAll(userId, list);
  },
};

export const localToTurnaround = (l: LocalTurnaround): Turnaround => ({
  id: l.id,
  flightNumber: l.flightNumber,
  date: new Date(l.date),
  airline: l.airline,
  times: l.times,
  fieldValues: l.fieldValues.map(fv => ({ ...fv, updatedAt: new Date(fv.updatedAt) })),
  observations: l.observations,
  createdAt: new Date(l.createdAt),
  updatedAt: new Date(l.updatedAt),
});
