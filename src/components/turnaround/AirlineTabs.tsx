import React, { useState } from 'react';
import { AirlineCode, AIRLINES, FieldValue } from '@/types/turnaround';
import { getFieldsByAirline } from '@/data/fieldDefinitions';
import { AirlineFieldsTable } from './AirlineFieldsTable';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Luggage } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AirlineTabsProps {
  fieldValues: FieldValue[];
  onChange: (values: FieldValue[]) => void;
  disabled?: boolean;
}

export const AirlineTabs: React.FC<AirlineTabsProps> = ({
  fieldValues,
  onChange,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<AirlineCode>('TAP');

  const handleFieldChange = (fieldId: string, value: string) => {
    const existing = fieldValues.find(v => v.fieldDefinitionId === fieldId);
    
    if (existing) {
      onChange(
        fieldValues.map(v =>
          v.fieldDefinitionId === fieldId
            ? { ...v, value, updatedAt: new Date() }
            : v
        )
      );
    } else {
      onChange([
        ...fieldValues,
        {
          fieldDefinitionId: fieldId,
          value,
          updatedAt: new Date(),
        },
      ]);
    }
  };

  return (
    <Card className="card-operational">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AirlineCode)}>
        <div className="border-b-2 border-border px-4 pt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/20">
              <Luggage className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Códigos de Carga por Aerolínea (SALIDA)</h2>
          </div>
          
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            {AIRLINES.map((airline) => (
              <TabsTrigger
                key={airline.code}
                value={airline.code}
                className={cn(
                  'tab-airline rounded-none rounded-t-lg data-[state=active]:shadow-none',
                  'data-[state=active]:tab-airline-active'
                )}
              >
                <span className="hidden sm:inline">{airline.name}</span>
                <span className="sm:hidden">{airline.shortName}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <CardContent className="pt-6">
          {AIRLINES.map((airline) => (
            <TabsContent key={airline.code} value={airline.code} className="mt-0">
              <AirlineFieldsTable
                fields={getFieldsByAirline(airline.code)}
                values={fieldValues}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            </TabsContent>
          ))}
        </CardContent>
      </Tabs>
    </Card>
  );
};
