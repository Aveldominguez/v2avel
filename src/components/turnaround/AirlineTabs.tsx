import React from 'react';
import { AirlineCode, AIRLINES, FieldValue } from '@/types/turnaround';
import { getFieldsByAirline } from '@/data/fieldDefinitions';
import { getCompartmentsByAirline } from '@/data/compartmentDefinitions';
import { AirlineFieldsTable } from './AirlineFieldsTable';
import { CompartmentsTable } from './CompartmentsTable';
import { ComoditysDialog } from './ComoditysDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Luggage } from 'lucide-react';

interface AirlineTabsProps {
  airline: AirlineCode;
  aircraftModel?: string;
  fieldValues: FieldValue[];
  onChange: (values: FieldValue[]) => void;
  disabled?: boolean;
}

export const AirlineTabs: React.FC<AirlineTabsProps> = ({
  airline,
  aircraftModel,
  fieldValues,
  onChange,
  disabled = false
}) => {
  const airlineInfo = AIRLINES.find(a => a.code === airline);
  const compartments = getCompartmentsByAirline(airline, aircraftModel);

  const handleFieldChange = (fieldId: string, value: string) => {
    const existing = fieldValues.find(v => v.fieldDefinitionId === fieldId);
    if (existing) {
      onChange(fieldValues.map(v => v.fieldDefinitionId === fieldId ? {
        ...v,
        value,
        updatedAt: new Date()
      } : v));
    } else {
      onChange([...fieldValues, {
        fieldDefinitionId: fieldId,
        value,
        updatedAt: new Date()
      }]);
    }
  };

  return (
    <Card className="card-operational">
      <div className="border-b-2 border-border px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/20">
            <Luggage className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Carga de SALIDA ✈️</h2>
            <p className="text-sm text-muted-foreground">{airlineInfo?.name}</p>
          </div>
        </div>
      </div>

      <CardContent className="pt-6 space-y-4">
        {compartments.length > 0 ? (
          <>
            {/* Sky Express: show compartments inline, codes in dialog */}
            <CompartmentsTable compartments={compartments} values={fieldValues} onChange={handleFieldChange} disabled={disabled} airline={airline} />
            <ComoditysDialog
              fields={getFieldsByAirline(airline)}
              values={fieldValues}
              onChange={handleFieldChange}
              disabled={disabled}
            />
          </>
        ) : (
          <AirlineFieldsTable fields={getFieldsByAirline(airline)} values={fieldValues} onChange={handleFieldChange} disabled={disabled} />
        )}
      </CardContent>
    </Card>
  );
};