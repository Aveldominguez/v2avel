// Groups cargo positions into display rows (L/R side by side, or full-width singles)

export interface CargoPositionMeta {
  section: 'FWD' | 'AFT';
  position: string;
  isDoorPosition?: boolean;
}

export interface DisplayRow {
  rowKey: string;
  section: 'FWD' | 'AFT';
  left?: string;
  right?: string;
  single?: string;
}

export function groupPositionsForDisplay(positions: CargoPositionMeta[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  const seen = new Set<string>();

  for (const section of ['FWD', 'AFT'] as const) {
    const sectionPos = positions.filter((p) => p.section === section);
    const rowMap = new Map<string, { L?: string; R?: string; single?: string }>();

    for (const p of sectionPos) {
      const key = `${p.section}:${p.position}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pos = p.position;
      if (pos.endsWith('L')) {
        const k = pos.slice(0, -1);
        rowMap.set(k, { ...rowMap.get(k), L: pos });
      } else if (pos.endsWith('R')) {
        const k = pos.slice(0, -1);
        rowMap.set(k, { ...rowMap.get(k), R: pos });
      } else {
        rowMap.set(pos, { single: pos });
      }
    }

    const sortedKeys = Array.from(rowMap.keys()).sort(
      (a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0),
    );

    for (const key of sortedKeys) {
      const r = rowMap.get(key)!;
      rows.push({ rowKey: key, section, left: r.L, right: r.R, single: r.single });
    }
  }

  return rows;
}
