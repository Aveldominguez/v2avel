import React from 'react';
import { FieldValue } from '@/types/turnaround';
import { CompartmentDefinition } from '@/data/compartmentDefinitions';
import { Input } from '@/components/ui/input';
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
  compartments: CompartmentDefinition[];
  values: FieldValue[];
  onChange: (holdId: string, value: string) => void;
  disabled?: boolean;
}

export const ComoditysDialog: React.FC<ComoditysDialogProps> = ({
  compartments,
  values,
  onChange,
  disabled = false,
}) => {
  const getValue = (holdId: string): string =>
    values.find(v => v.fieldDefinitionId === holdId)?.value || '';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Comoditys
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Comoditys – Sky Express
          </DialogTitle>
          <DialogDescription>
            Introduce los datos de cada bodega por compartimiento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
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
      </DialogContent>
    </Dialog>
  );
};
