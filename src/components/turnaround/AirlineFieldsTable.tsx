import React from 'react';
import { FieldDefinition, FieldValue } from '@/types/turnaround';
import { Input } from '@/components/ui/input';

interface AirlineFieldsTableProps {
  fields: FieldDefinition[];
  values: FieldValue[];
  onChange: (fieldId: string, value: string) => void;
  disabled?: boolean;
}

// Lista compacta pensada para móvil: código + etiqueta (máx. 2 líneas) + input
// alineado a la derecha, en vez de la tabla de 3 columnas que partía las
// etiquetas largas en 4+ líneas.
export const AirlineFieldsTable: React.FC<AirlineFieldsTableProps> = ({
  fields,
  values,
  onChange,
  disabled = false,
}) => {
  const getValue = (fieldId: string): string => {
    return values.find(v => v.fieldDefinitionId === fieldId)?.value || '';
  };

  return (
    <div className="rounded-lg border-2 border-border overflow-hidden divide-y divide-border">
      {fields.map((field) => {
        const inputId = `field-${field.id}`;
        return (
          <div key={field.id} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/30">
            <label htmlFor={inputId} className="w-14 shrink-0 text-center font-mono text-base font-bold text-primary">
              {field.code}
            </label>
            <label htmlFor={inputId} className="flex-1 min-w-0 text-xs leading-tight text-foreground/80 line-clamp-2">
              {field.label}
            </label>
            <Input
              id={inputId}
              type="text"
              value={getValue(field.id)}
              onChange={(e) => onChange(field.id, e.target.value.toUpperCase())}
              disabled={disabled}
              placeholder="—"
              className="h-11 w-24 shrink-0 text-center font-mono text-base bg-input border-border
                       focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
        );
      })}
    </div>
  );
};
