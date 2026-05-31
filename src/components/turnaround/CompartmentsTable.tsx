import React, { useState, useEffect } from 'react';
import { FieldValue } from '@/types/turnaround';
import { CompartmentDefinition, isPairedHold, HoldEntry, ITA_STYLE_TYPE_OPTIONS } from '@/data/compartmentDefinitions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Hash, Undo2 } from 'lucide-react';
import { AirlineCode } from '@/types/turnaround';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CompartmentsTableProps {
  compartments: CompartmentDefinition[];
  values: FieldValue[];
  onChange: (holdId: string, value: string, previousValue?: string | null) => void;
  disabled?: boolean;
  airline?: AirlineCode;
}

const DEFAULT_EXTRA_FIELDS = 5;


export const CompartmentsTable: React.FC<CompartmentsTableProps> = ({
  compartments,
  values,
  onChange,
  disabled = false,
  airline,
}) => {
  const showNilButton = airline !== 'FEDEX';
  const [extraFieldCounts, setExtraFieldCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const counts: Record<string, number> = {};
    compartments.forEach((comp) => {
      if (comp.expandable) {
        const baseCount = comp.expandableDefault ?? DEFAULT_EXTRA_FIELDS;
        let maxIdx = baseCount;
        values.forEach((v) => {
          const match = v.fieldDefinitionId.match(new RegExp(`^${comp.id}-extra-(\\d+)$`));
          if (match) {
            const idx = parseInt(match[1], 10) + 1;
            if (idx > maxIdx) maxIdx = idx;
          }
        });
        counts[comp.id] = maxIdx;
      }
    });
    setExtraFieldCounts(counts);
  }, [compartments.map(c => c.id).join(',')]);

  const evaluateMath = (text: string): string => {
    // Only evaluate when the user just typed "=" at the very end
    if (!text.endsWith('=')) return text;
    return text.replace(/([\d\s+\-*\/().]+)=$/g, (match, expr) => {
      const trimmed = expr.trim();
      try {
        if (/^[\d\s+\-*\/().]+$/.test(trimmed) && /[+\-*\/]/.test(trimmed) && trimmed.length > 0) {
          const result = Function('"use strict"; return (' + trimmed + ')')();
          if (typeof result === 'number' && isFinite(result)) {
            return expr + '=' + result;
          }
        }
      } catch { /* ignore invalid expressions */ }
      return match;
    });
  };

  const getValue = (holdId: string): string =>
    values.find(v => v.fieldDefinitionId === holdId)?.value || '';

  const handleNil = (holdId: string) => {
    const current = getValue(holdId);
    onChange(holdId, 'NIL', current);
  };

  const handleUndo = (holdId: string) => {
    const entry = values.find(v => v.fieldDefinitionId === holdId);
    const prev = entry?.previousValue ?? '';
    onChange(holdId, prev, null);
  };

  const isNilSet = (holdId: string) => {
    const entry = values.find(v => v.fieldDefinitionId === holdId);
    if (entry?.value !== 'NIL') return false;
    if (entry.previousValue === undefined || entry.previousValue === null) return false;
    if (entry.nilSetAt) {
      const setTime = new Date(entry.nilSetAt).getTime();
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (now - setTime > TWENTY_FOUR_HOURS) return false;
    }
    return true;
  };

  const renderNilButton = (holdId: string) => {
    if (!showNilButton || disabled) return null;
    const nilActive = isNilSet(holdId);
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => nilActive ? handleUndo(holdId) : handleNil(holdId)}
        className={`h-9 w-9 shrink-0 font-bold ${nilActive ? 'text-destructive hover:text-destructive/80 border-destructive/50' : 'text-muted-foreground hover:text-foreground'}`}
        title={nilActive ? 'Deshacer NIL' : 'Escribir NIL'}
      >
        {nilActive ? <Undo2 className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
      </Button>
    );
  };

  const handleItaNil = (hold: { id: string }) => {
    const typeFieldId = `${hold.id}-type`;
    const numFieldId = `${hold.id}-num`;
    const contentFieldId = `${hold.id}-content`;
    const ids = [typeFieldId, numFieldId, contentFieldId];
    const currents = ids.map(fid => getValue(fid));
    // Batch call: pass arrays so parent applies all 3 changes atomically
    (onChange as any)(ids, ['NIL', 'NIL', 'NIL'], currents);
  };

  const handleItaUndo = (hold: { id: string }) => {
    const typeFieldId = `${hold.id}-type`;
    const numFieldId = `${hold.id}-num`;
    const contentFieldId = `${hold.id}-content`;
    const ids = [typeFieldId, numFieldId, contentFieldId];
    const prevs = ids.map(fid => {
      const entry = values.find(v => v.fieldDefinitionId === fid);
      return entry?.previousValue ?? '';
    });
    // Batch call: pass null as previousValue marker to clear NIL state
    (onChange as any)(ids, prevs, [null, null, null]);
  };

  const isItaNilSet = (hold: { id: string }) => {
    const typeFieldId = `${hold.id}-type`;
    return isNilSet(typeFieldId);
  };

  const renderItaNilButton = (hold: { id: string }) => {
    if (!showNilButton || disabled) return null;
    const nilActive = isItaNilSet(hold);
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => nilActive ? handleItaUndo(hold) : handleItaNil(hold)}
        className={`h-9 w-9 shrink-0 font-bold ${nilActive ? 'text-destructive hover:text-destructive/80 border-destructive/50' : 'text-muted-foreground hover:text-foreground'}`}
        title={nilActive ? 'Deshacer NIL' : 'Escribir NIL'}
      >
        {nilActive ? <Undo2 className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
      </Button>
    );
  };

  // ITA-style hold: type selector + numeric field on top row, content field below
  const renderItaHoldInput = (hold: { id: string; label: string }, holdAirline?: AirlineCode) => {
    const typeOptions = ITA_STYLE_TYPE_OPTIONS[holdAirline || ''] || ['AKH-AZ', 'PKC-AZ'];
    const typeFieldId = `${hold.id}-type`;
    const numFieldId = `${hold.id}-num`;
    const contentFieldId = `${hold.id}-content`;
    const nilActive = isItaNilSet(hold);

    return (
      <div key={hold.id} className="border border-border rounded-lg p-3 space-y-2">
        {/* Top row: label + type selector + numeric + NIL button */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground shrink-0 min-w-[2.5rem]">
            {hold.label}:
          </span>
          <Select
            value={nilActive ? undefined : getValue(typeFieldId) || undefined}
            onValueChange={(val) => onChange(typeFieldId, val)}
            disabled={disabled || nilActive}
          >
            <SelectTrigger className="h-9 flex-1 min-w-0 font-mono text-sm bg-input border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {typeOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={5}
             value={nilActive ? '' : getValue(numFieldId)}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 5);
              onChange(numFieldId, val);
            }}
            disabled={disabled || nilActive}
            placeholder="00000"
            className="h-9 w-20 shrink-0 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30 text-center"
          />
          {renderItaNilButton(hold)}
        </div>
        {/* Bottom row: content field */}
        <Input
          type="text"
           value={nilActive ? 'NIL' : getValue(contentFieldId)}
          onChange={(e) => onChange(contentFieldId, evaluateMath(e.target.value.toUpperCase()))}
          disabled={disabled || nilActive}
          placeholder="Contenido bodega"
          className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
      </div>
    );
  };

  // Sum all numeric tokens in a string, ignoring alpha chars (e.g. "23BY" → 23, "10+5=15" → 30)
  const sumNumericTokens = (text: string): number => {
    if (!text) return 0;
    const matches = text.match(/\d+/g);
    if (!matches) return 0;
    return matches.reduce((acc, n) => acc + parseInt(n, 10), 0);
  };

  // Wizz A321 compartment 3 alert logic: any field > 90, or sum of 31+32+33 > 90
  const WIZZ_A321_COMP3_IDS = ['wizz-hold-a32131', 'wizz-hold-a32132', 'wizz-hold-a32133'];
  const isWizzA321Comp3Hold = (holdId: string) => WIZZ_A321_COMP3_IDS.includes(holdId);

  // Wizz A320 compartment 1 alert logic: any field > 80, or sum of 11+12+13 > 80
  const WIZZ_A320_COMP1_IDS = ['wizz-hold-a32011', 'wizz-hold-a32012', 'wizz-hold-a32013'];
  const isWizzA320Comp1Hold = (holdId: string) => WIZZ_A320_COMP1_IDS.includes(holdId);

  const wizzA321Comp3Alert = React.useMemo(() => {
    if (airline !== 'WIZZ') return { anyOver: false, sumOver: false };
    const sum = WIZZ_A321_COMP3_IDS.reduce((acc, id) => acc + sumNumericTokens(getValue(id)), 0);
    const anyOver = WIZZ_A321_COMP3_IDS.some(id => sumNumericTokens(getValue(id)) > 90);
    return { anyOver, sumOver: sum > 90 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airline, values]);

  const wizzA320Comp1Alert = React.useMemo(() => {
    if (airline !== 'WIZZ') return { anyOver: false, sumOver: false };
    const sum = WIZZ_A320_COMP1_IDS.reduce((acc, id) => acc + sumNumericTokens(getValue(id)), 0);
    const anyOver = WIZZ_A320_COMP1_IDS.some(id => sumNumericTokens(getValue(id)) > 80);
    return { anyOver, sumOver: sum > 80 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airline, values]);

  const shouldAlertHold = (holdId: string): boolean => {
    if (airline !== 'WIZZ') return false;
    if (isWizzA321Comp3Hold(holdId)) {
      if (wizzA321Comp3Alert.sumOver) return true;
      return sumNumericTokens(getValue(holdId)) > 90;
    }
    if (isWizzA320Comp1Hold(holdId)) {
      if (wizzA320Comp1Alert.sumOver) return true;
      return sumNumericTokens(getValue(holdId)) > 80;
    }
    return false;
  };

  const renderHoldInput = (hold: { id: string; label: string }) => {
    const val = getValue(hold.id);
    const lineCount = (val.match(/\n/g) || []).length + 1;
    const alert = shouldAlertHold(hold.id);
    return (
      <div key={hold.id} className="flex items-start gap-3">
        <label className="text-sm font-medium text-foreground/80 w-24 shrink-0 pt-2">
          {hold.label}:
        </label>
        <textarea
          value={val}
          onChange={(e) => onChange(hold.id, evaluateMath(e.target.value.toUpperCase()))}
          disabled={disabled}
          placeholder="—"
          rows={lineCount}
          className={`flex-1 font-mono text-base bg-input border border-border rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] leading-6 ${alert ? 'blink-required' : ''}`}
        />
        {renderNilButton(hold.id)}
      </div>
    );
  };

  const renderPairedHold = (entry: HoldEntry, idx: number) => {
    if (!isPairedHold(entry)) return null;
    const leftVal = getValue(entry.left.id);
    const rightVal = getValue(entry.right.id);
    const leftLines = (leftVal.match(/\n/g) || []).length + 1;
    const rightLines = (rightVal.match(/\n/g) || []).length + 1;
    return (
      <div key={`pair-${idx}`} className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-center text-foreground/80">
            {entry.left.label}
          </label>
          <div className="flex gap-1">
            <textarea
              value={leftVal}
              onChange={(e) => onChange(entry.left.id, evaluateMath(e.target.value.toUpperCase()))}
              disabled={disabled}
              placeholder="—"
              rows={leftLines}
              className="flex-1 font-mono text-base bg-input border border-border rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] leading-6"
            />
            {renderNilButton(entry.left.id)}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-center text-foreground/80">
            {entry.right.label}
          </label>
          <div className="flex gap-1">
            <textarea
              value={rightVal}
              onChange={(e) => onChange(entry.right.id, evaluateMath(e.target.value.toUpperCase()))}
              disabled={disabled}
              placeholder="—"
              rows={rightLines}
              className="flex-1 font-mono text-base bg-input border border-border rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] leading-6"
            />
            {renderNilButton(entry.right.id)}
          </div>
        </div>
      </div>
    );
  };

  const addExtraField = (compId: string) => {
    setExtraFieldCounts((prev) => ({
      ...prev,
      [compId]: (prev[compId] ?? DEFAULT_EXTRA_FIELDS) + 1,
    }));
  };

  const renderExpandableFields = (comp: CompartmentDefinition) => {
    const count = extraFieldCounts[comp.id] ?? comp.expandableDefault ?? DEFAULT_EXTRA_FIELDS;
    return (
      <>
        {Array.from({ length: count }, (_, i) => {
          const fieldId = `${comp.id}-extra-${i}`;
          return (
            <div key={fieldId} className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground/80 w-24 shrink-0">
                {i + 1}:
              </label>
              <Input
                type="text"
                value={getValue(fieldId)}
                onChange={(e) => onChange(fieldId, evaluateMath(e.target.value.toUpperCase()))}
                disabled={disabled}
                placeholder="—"
                className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
          );
        })}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addExtraField(comp.id)}
            className="w-full mt-1 border-dashed border-border text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir campo
          </Button>
        )}
      </>
    );
  };

  const isItaStyle = (comp: CompartmentDefinition) => comp.holdStyle === 'ita';

  return (
    <div className="space-y-5">
      {compartments.map((comp) => {
        const showWizzA321Alert =
          airline === 'WIZZ' &&
          comp.id === 'wizz-a321-comp3' &&
          (wizzA321Comp3Alert.anyOver || wizzA321Comp3Alert.sumOver);
        const showWizzA320Alert =
          airline === 'WIZZ' &&
          comp.id === 'wizz-a320-comp1' &&
          (wizzA320Comp1Alert.anyOver || wizzA320Comp1Alert.sumOver);
        return (
          <div key={comp.id}>
            <h3 className="text-sm font-bold text-primary mb-2 border-b border-border pb-1">
              {comp.compartmentName}
            </h3>
            {comp.legend && (
              <div className="mb-2 px-3 py-2 rounded-md bg-accent/10 border border-accent/30 text-sm font-semibold text-accent font-mono">
                {comp.legend}
              </div>
            )}
            <div className="space-y-2">

              {comp.holds.map((hold, idx) => {
                const isBulk = comp.bulk === true || comp.id.includes('bulk');
                return isItaStyle(comp) && !isPairedHold(hold)
                  ? renderItaHoldInput(hold, comp.airline)
                  : isPairedHold(hold)
                    ? renderPairedHold(hold, idx)
                    : renderHoldInput(hold);
              })}
              {comp.expandable && renderExpandableFields(comp)}
              {!isItaStyle(comp) && (() => {
                const ids: string[] = [];
                comp.holds.forEach((h) => {
                  if (isPairedHold(h)) {
                    ids.push(h.left.id, h.right.id);
                  } else {
                    ids.push(h.id);
                  }
                });
                if (comp.expandable) {
                  const count = extraFieldCounts[comp.id] ?? comp.expandableDefault ?? DEFAULT_EXTRA_FIELDS;
                  for (let i = 0; i < count; i++) ids.push(`${comp.id}-extra-${i}`);
                }
                const total = ids.reduce((acc, id) => acc + sumNumericTokens(getValue(id)), 0);
                if (total <= 0) return null;
                return (
                  <div className="flex items-center justify-end gap-2 pt-1 mt-1 border-t border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total:</span>
                    <span className="font-mono font-bold text-base text-primary">{total}</span>
                  </div>
                );
              })()}
              {showWizzA321Alert && (
                <div className="mt-2 text-xs font-bold text-destructive uppercase tracking-wide">
                  ⚠️ Límite superado: máximo 90 maletas en compartimiento 3 (B31+B32+B33).
                </div>
              )}
              {showWizzA320Alert && (
                <div className="mt-2 text-xs font-bold text-destructive uppercase tracking-wide">
                  ⚠️ Límite superado: máximo 80 maletas en compartimiento 1 (B11+B12+B13).
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
