// Groups cargo positions into display rows (L/R side by side, or full-width singles)

export interface CargoPositionMeta {
  section: 'FWD' | 'AFT' | 'BLK';
  position: string;
  isDoorPosition?: boolean;
}

export interface DisplayRow {
  rowKey: string;
  section: 'FWD' | 'AFT' | 'BLK';
  left?: string;
  right?: string;
  single?: string;
}

export function groupPositionsForDisplay(positions: CargoPositionMeta[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  const seen = new Set<string>();

  for (const section of ['FWD', 'AFT', 'BLK'] as const) {
    const sectionPos = positions.filter((p) => p.section === section);
    const rowMap = new Map<string, { L?: string; R?: string; single?: string }>();

    for (const p of sectionPos) {
      const key = `${p.section}:${p.position}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const pos = p.position;
      if (pos.endsWith('L')) {
        const rowNum = pos.slice(0, -1);
        rowMap.set(rowNum, { ...rowMap.get(rowNum), L: pos });
      } else if (pos.endsWith('R')) {
        const rowNum = pos.slice(0, -1);
        rowMap.set(rowNum, { ...rowMap.get(rowNum), R: pos });
      } else {
        rowMap.set(pos, { single: pos });
      }
    }

    const sortedKeys = Array.from(rowMap.keys()).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    for (const key of sortedKeys) {
      const row = rowMap.get(key)!;
      rows.push({ rowKey: key, section, left: row.L, right: row.R, single: row.single });
    }
  }

  return rows;
}
