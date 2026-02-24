import React, { useState, useEffect } from 'react';
import { FieldValue } from '@/types/turnaround';
import { CompartmentDefinition, isPairedHold, HoldEntry } from '@/data/compartmentDefinitions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Hash } from 'lucide-react';
import { AirlineCode } from '@/types/turnaround';

interface CompartmentsTableProps {
  compartments: CompartmentDefinition[];
  values: FieldValue[];
  onChange: (holdId: string, value: string) => void;
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
  // Track extra field counts per compartment
  const [extraFieldCounts, setExtraFieldCounts] = useState<Record<string, number>>({});

  // Initialize extra field counts and restore from existing values
  useEffect(() => {
    const counts: Record<string, number> = {};
    compartments.forEach((comp) => {
      if (comp.expandable) {
        // Check if there are saved values beyond the default count
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

  const getValue = (holdId: string): string =>
    values.find(v => v.fieldDefinitionId === holdId)?.value || '';

  const renderHoldInput = (hold: { id: string; label: string }) => (
    <div key={hold.id} className="flex items-center gap-3">
      <label className="text-sm font-medium text-foreground/80 w-24 shrink-0">
        {hold.label}:
      </label>
      <Input
        type="text"
        value={getValue(hold.id)}
        onChange={(e) => onChange(hold.id, e.target.value.toUpperCase())}
        disabled={disabled}
        placeholder="—"
        className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
      />
      {showNilButton && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(hold.id, 'NIL')}
          className="h-9 w-9 shrink-0 font-bold text-muted-foreground hover:text-foreground"
          title="Escribir NIL"
        >
          <Hash className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  const renderPairedHold = (entry: HoldEntry, idx: number) => {
    if (!isPairedHold(entry)) return null;
    return (
      <div key={`pair-${idx}`} className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-center text-foreground/80">
            {entry.left.label}
          </label>
          <div className="flex gap-1">
            <Input
              type="text"
              value={getValue(entry.left.id)}
              onChange={(e) => onChange(entry.left.id, e.target.value.toUpperCase())}
              disabled={disabled}
              placeholder="—"
              className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            {showNilButton && !disabled && (
              <Button type="button" variant="outline" size="icon" onClick={() => onChange(entry.left.id, 'NIL')} className="h-9 w-9 shrink-0 font-bold text-muted-foreground hover:text-foreground" title="Escribir NIL">
                <Hash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-center text-foreground/80">
            {entry.right.label}
          </label>
          <div className="flex gap-1">
            <Input
              type="text"
              value={getValue(entry.right.id)}
              onChange={(e) => onChange(entry.right.id, e.target.value.toUpperCase())}
              disabled={disabled}
              placeholder="—"
              className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            {showNilButton && !disabled && (
              <Button type="button" variant="outline" size="icon" onClick={() => onChange(entry.right.id, 'NIL')} className="h-9 w-9 shrink-0 font-bold text-muted-foreground hover:text-foreground" title="Escribir NIL">
                <Hash className="h-4 w-4" />
              </Button>
            )}
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

  return (
    <div className="space-y-5">
      {compartments.map((comp) => (
        <div key={comp.id}>
          <h3 className="text-sm font-bold text-primary mb-2 border-b border-border pb-1">
            {comp.compartmentName}
          </h3>
          <div className="space-y-2">
            {comp.holds.map((hold, idx) =>
              isPairedHold(hold)
                ? renderPairedHold(hold, idx)
                : renderHoldInput(hold)
            )}
            {comp.expandable && renderExpandableFields(comp)}
          </div>
        </div>
      ))}
    </div>
  );
};
