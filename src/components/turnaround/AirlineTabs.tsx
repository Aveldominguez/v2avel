import React from 'react';
import { AirlineCode, AIRLINES, FieldValue } from '@/types/turnaround';
import { getFieldsByAirline } from '@/data/fieldDefinitions';
import { getCompartmentsByAirline } from '@/data/compartmentDefinitions';
import { AirlineFieldsTable } from './AirlineFieldsTable';
import { CompartmentsTable } from './CompartmentsTable';
import { ComoditysDialog } from './ComoditysDialog';
import { AirEstWeightBalance } from './AirEstWeightBalance';
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

  const handleFieldChange = (fieldId: string | string[], value: string | string[], previousValue?: string | null | (string | null | undefined)[]) => {
    // Support batch updates: if fieldId is an array, apply all changes at once
    const ids = Array.isArray(fieldId) ? fieldId : [fieldId];
    const vals = Array.isArray(value) ? value : [value];
    const prevs = Array.isArray(previousValue) ? previousValue : [previousValue];

    let updated = [...fieldValues];
    ids.forEach((fid, i) => {
      const val = vals[i] ?? vals[0];
      const prev = prevs[i] ?? prevs[0];
      const isSettingNil = val === 'NIL' && prev !== undefined && prev !== null;
      const isClearingNil = prev === null;
      const existingIdx = updated.findIndex(v => v.fieldDefinitionId === fid);

      const entry: FieldValue = {
        fieldDefinitionId: fid,
        value: val,
        previousValue: isClearingNil ? undefined : (prev ?? (existingIdx >= 0 ? updated[existingIdx].previousValue : undefined)),
        nilSetAt: isSettingNil ? new Date().toISOString() : (isClearingNil ? undefined : (existingIdx >= 0 ? updated[existingIdx].nilSetAt : undefined)),
        updatedAt: new Date()
      };

      if (existingIdx >= 0) {
        updated[existingIdx] = entry;
      } else {
        updated.push(entry);
      }
    });
    onChange(updated);
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
        {airline === 'AIR_EST' && aircraftModel === '340F' ? (
          <AirEstWeightBalance
            fieldValues={fieldValues}
            onChange={onChange}
            disabled={disabled}
          />
        ) : compartments.length > 0 ? (
          <>
            {/* Sky Express: show compartments inline, codes in dialog */}
            <CompartmentsTable compartments={compartments} values={fieldValues} onChange={handleFieldChange} disabled={disabled} airline={airline} />
            {airline !== 'FEDEX' && airline !== 'AMAZON' && (
              <ComoditysDialog
                fields={getFieldsByAirline(airline)}
                values={fieldValues}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            )}
          </>
        ) : (
          <AirlineFieldsTable fields={getFieldsByAirline(airline)} values={fieldValues} onChange={handleFieldChange} disabled={disabled} />
        )}
      </CardContent>
    </Card>
  );
};