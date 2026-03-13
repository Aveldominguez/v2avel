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
    // Process each line: if a line ends with "=", evaluate the expression before it
    return text.split('\n').map(line => {
      if (line.trimEnd().endsWith('=')) {
        const expr = line.trimEnd().slice(0, -1).trim();
        try {
          // Only allow numbers, operators, parentheses, spaces and dots
          if (/^[\d+\-*/().\s]+$/.test(expr) && expr.length > 0) {
            const result = Function('"use strict"; return (' + expr + ')')();
            if (typeof result === 'number' && isFinite(result)) {
              return String(result);
            }
          }
        } catch { /* ignore invalid expressions */ }
      }
      return line;
    }).join('\n');
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
          onChange={(e) => onChange(contentFieldId, e.target.value.toUpperCase())}
          disabled={disabled || nilActive}
          placeholder="Contenido bodega"
          className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
      </div>
    );
  };

  const renderHoldInput = (hold: { id: string; label: string }) => {
    const val = getValue(hold.id);
    const lineCount = (val.match(/\n/g) || []).length + 1;
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
          className="flex-1 font-mono text-base bg-input border border-border rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] leading-6"
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
              onChange={(e) => onChange(entry.left.id, e.target.value.toUpperCase())}
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
              onChange={(e) => onChange(entry.right.id, e.target.value.toUpperCase())}
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
                onChange={(e) => onChange(fieldId, e.target.value.toUpperCase())}
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
      {compartments.map((comp) => (
        <div key={comp.id}>
          <h3 className="text-sm font-bold text-primary mb-2 border-b border-border pb-1">
            {comp.compartmentName}
          </h3>
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
          </div>
        </div>
      ))}
    </div>
  );
};
