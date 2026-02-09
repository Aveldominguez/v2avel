import React from 'react';
import { FieldValue } from '@/types/turnaround';
import { CompartmentDefinition } from '@/data/compartmentDefinitions';
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

  return (
    <div className="space-y-5">
      {compartments.map((comp) => (
        <div key={comp.id}>
          <h3 className="text-sm font-bold text-primary mb-2 border-b border-border pb-1">
            {comp.compartmentName}
          </h3>
          <div className="space-y-2">
            {comp.holds.map((hold) => (
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
