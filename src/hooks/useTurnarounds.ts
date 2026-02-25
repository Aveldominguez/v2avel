import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Turnaround, TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { Json } from '@/integrations/supabase/types';

const mapDbToTurnaround = (db: {
  id: string;
  user_id: string;
  flight_number: string;
  date: string;
  airline: string;
  times: Json;
  field_values: Json;
  observations: string | null;
  created_at: string;
  updated_at: string;
}): Turnaround => {
  const times = db.times as unknown as TurnaroundTimes;
  const fieldValues = (db.field_values as unknown as Array<{
    fieldDefinitionId: string;
    value: string;
    previousValue?: string;
    nilSetAt?: string;
    updatedAt: string;
    updatedBy?: string;
  }>) || [];
  
  return {
    id: db.id,
    flightNumber: db.flight_number,
    date: new Date(db.date),
    airline: db.airline as AirlineCode,
    times,
    fieldValues: fieldValues.map(fv => ({
      ...fv,
      updatedAt: new Date(fv.updatedAt),
    })),
    observations: db.observations || '',
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
};

export const useTurnarounds = () => {
  const { user } = useAuth();
  const [turnarounds, setTurnarounds] = useState<Turnaround[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTurnarounds = useCallback(async () => {
    if (!user) {
      setTurnarounds([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('turnarounds')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = (data || []).map(mapDbToTurnaround);
      setTurnarounds(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching turnarounds:', err);
      setError('Error al cargar las escalas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTurnarounds();
  }, [fetchTurnarounds]);

  const createTurnaround = async (
    flightNumber: string,
    date: Date,
    airline: AirlineCode,
    times: TurnaroundTimes,
    fieldValues: FieldValue[],
    observations: string = ''
  ): Promise<Turnaround | null> => {
    if (!user) return null;

    try {
      const fieldValuesForDb = fieldValues.map(fv => ({
        fieldDefinitionId: fv.fieldDefinitionId,
        value: fv.value,
        previousValue: fv.previousValue,
        nilSetAt: fv.nilSetAt,
        updatedAt: fv.updatedAt.toISOString(),
        updatedBy: fv.updatedBy,
      }));

      const { data, error: insertError } = await supabase
        .from('turnarounds')
        .insert({
          user_id: user.id,
          flight_number: flightNumber,
          date: date.toISOString().split('T')[0],
          airline,
          times: times as unknown as Json,
          field_values: fieldValuesForDb as unknown as Json,
          observations,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newTurnaround = mapDbToTurnaround(data);
      setTurnarounds(prev => [newTurnaround, ...prev]);
      return newTurnaround;
    } catch (err) {
      console.error('Error creating turnaround:', err);
      throw err;
    }
  };

  const updateTurnaround = async (
    id: string,
    flightNumber: string,
    date: Date,
    airline: AirlineCode,
    times: TurnaroundTimes,
    fieldValues: FieldValue[],
    observations: string = ''
  ): Promise<Turnaround | null> => {
    if (!user) return null;

    try {
      const fieldValuesForDb = fieldValues.map(fv => ({
        fieldDefinitionId: fv.fieldDefinitionId,
        value: fv.value,
        previousValue: fv.previousValue,
        nilSetAt: fv.nilSetAt,
        updatedAt: fv.updatedAt.toISOString(),
        updatedBy: fv.updatedBy,
      }));

      const { data, error: updateError } = await supabase
        .from('turnarounds')
        .update({
          flight_number: flightNumber,
          airline,
          times: times as unknown as Json,
          field_values: fieldValuesForDb as unknown as Json,
          observations,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updated = mapDbToTurnaround(data);
      setTurnarounds(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      console.error('Error updating turnaround:', err);
      throw err;
    }
  };

  const deleteTurnaround = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('turnarounds')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTurnarounds(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting turnaround:', err);
      throw err;
    }
  };

  const getTurnaroundById = useCallback(async (id: string): Promise<Turnaround | null> => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('turnarounds')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) return null;

      return mapDbToTurnaround(data);
    } catch (err) {
      console.error('Error fetching turnaround:', err);
      return null;
    }
  }, [user]);

  return {
    turnarounds,
    loading,
    error,
    createTurnaround,
    updateTurnaround,
    deleteTurnaround,
    getTurnaroundById,
    refetch: fetchTurnarounds,
  };
};
