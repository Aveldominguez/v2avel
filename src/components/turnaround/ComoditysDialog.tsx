import React from 'react';
import { FieldDefinition, FieldValue } from '@/types/turnaround';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';

interface ComoditysDialogProps {
  fields: FieldDefinition[];
  values: FieldValue[];
  onChange: (fieldId: string, value: string) => void;
  disabled?: boolean;
}

export const ComoditysDialog: React.FC<ComoditysDialogProps> = ({
  fields,
  values,
  onChange,
  disabled = false,
}) => {
  const getValue = (fieldId: string): string =>
    values.find(v => v.fieldDefinitionId === fieldId)?.value || '';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 border-yellow-500 bg-yellow-400 text-yellow-950 hover:bg-yellow-500 hover:text-yellow-950 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Comoditys
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Comoditys
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center justify-center gap-3">
              <span className="font-mono text-sm font-bold text-primary w-10 shrink-0 text-center">
                {field.code}
              </span>
              <span className="text-sm text-foreground/80">
                {field.label}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
