import React from 'react';
import { FieldDefinition, FieldValue } from '@/types/turnaround';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AirlineFieldsTableProps {
  fields: FieldDefinition[];
  values: FieldValue[];
  onChange: (fieldId: string, value: string) => void;
  disabled?: boolean;
}

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
    <div className="rounded-lg border-2 border-border overflow-hidden">
      <Table className="table-operational">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-20 text-center">Código</TableHead>
            <TableHead className="w-auto pr-4">Significado</TableHead>
            <TableHead className="w-full">Datos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.id} className="hover:bg-secondary/30">
              <TableCell className="text-center">
                <span className="font-mono text-lg font-bold text-primary">
                  {field.code}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-foreground/90">
                  {field.label}
                </span>
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={getValue(field.id)}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  disabled={disabled}
                  placeholder="—"
                  className="h-10 font-mono text-base bg-input border-border 
                           focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
