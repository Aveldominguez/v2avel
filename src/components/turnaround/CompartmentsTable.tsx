import React from 'react';
import { FieldValue } from '@/types/turnaround';
import { CompartmentDefinition, isPairedHold, HoldEntry } from '@/data/compartmentDefinitions';
import { Input } from '@/components/ui/input';

interface CompartmentsTableProps {
  compartments: CompartmentDefinition[];
  values: FieldValue[];
  onChange: (holdId: string, value: string) => void;
  disabled?: boolean;
}

export const CompartmentsTable: React.FC<CompartmentsTableProps> = ({
  compartments,
  values,
  onChange,
  disabled = false,
}) => {
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
        onChange={(e) => onChange(hold.id, e.target.value)}
        disabled={disabled}
        placeholder="—"
        className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
      />
    </div>
  );

  const renderPairedHold = (entry: HoldEntry, idx: number) => {
    if (!isPairedHold(entry)) return null;
    return (
      <div key={`pair-${idx}`} className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground/80 w-16 shrink-0">
            {entry.left.label}:
          </label>
          <Input
            type="text"
            value={getValue(entry.left.id)}
            onChange={(e) => onChange(entry.left.id, e.target.value)}
            disabled={disabled}
            placeholder="—"
            className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground/80 w-16 shrink-0">
            {entry.right.label}:
          </label>
          <Input
            type="text"
            value={getValue(entry.right.id)}
            onChange={(e) => onChange(entry.right.id, e.target.value)}
            disabled={disabled}
            placeholder="—"
            className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>
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
          </div>
        </div>
      ))}
    </div>
  );
};
