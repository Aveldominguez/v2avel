import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Turnaround, TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { Json } from '@/integrations/supabase/types';

type DbRow = {
  id: string;
  user_id: string;
  flight_number: string;
  date: string;
  airline: string;
  times: Json;
  field_values?: Json | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
};

const mapDbToTurnaround = (db: DbRow): Turnaround => {
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

export interface FetchPageOptions {
  offset: number;
  limit: number;
  dateISO?: string;          // 'YYYY-MM-DD'
  airline?: AirlineCode;
  searchFlight?: string;     // matches flight_number or times->>departureFlightNumber
}

// Lightweight columns for the list — excludes field_values (can be heavy).
const LIST_COLUMNS = 'id,user_id,flight_number,date,airline,times,observations,created_at,updated_at';

export const useTurnarounds = () => {
  const { user } = useAuth();

  const fetchPage = useCallback(async (opts: FetchPageOptions): Promise<Turnaround[]> => {
    if (!user) return [];
    let query = supabase
      .from('turnarounds')
      .select(LIST_COLUMNS)
      .eq('user_id', user.id);

    if (opts.dateISO) query = query.eq('date', opts.dateISO);
    if (opts.airline) query = query.eq('airline', opts.airline);
    if (opts.searchFlight && opts.searchFlight.trim() !== '') {
      const s = opts.searchFlight.trim().replace(/[%,]/g, '');
      query = query.or(
        `flight_number.ilike.%${s}%,times->>departureFlightNumber.ilike.%${s}%`
      );
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(opts.offset, opts.offset + opts.limit - 1);

    if (error) throw error;
    return (data || []).map((r) => mapDbToTurnaround(r as DbRow));
  }, [user]);

  const createTurnaround = async (
    flightNumber: string,
    date: Date,
    airline: AirlineCode,
    times: TurnaroundTimes,
    fieldValues: FieldValue[],
    observations: string = ''
  ): Promise<Turnaround | null> => {
    if (!user) return null;

    const fieldValuesForDb = fieldValues.map(fv => ({
      fieldDefinitionId: fv.fieldDefinitionId,
      value: fv.value,
      previousValue: fv.previousValue,
      nilSetAt: fv.nilSetAt,
      updatedAt: (fv.updatedAt instanceof Date ? fv.updatedAt : new Date(fv.updatedAt)).toISOString(),
      updatedBy: fv.updatedBy,
    }));

    const { data, error } = await supabase
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

    if (error) throw error;
    return mapDbToTurnaround(data as DbRow);
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

    const fieldValuesForDb = fieldValues.map(fv => ({
      fieldDefinitionId: fv.fieldDefinitionId,
      value: fv.value,
      previousValue: fv.previousValue,
      nilSetAt: fv.nilSetAt,
      updatedAt: (fv.updatedAt instanceof Date ? fv.updatedAt : new Date(fv.updatedAt)).toISOString(),
      updatedBy: fv.updatedBy,
    }));

    const { data, error } = await supabase
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

    if (error) throw error;
    return mapDbToTurnaround(data as DbRow);
  };

  const deleteTurnaround = async (id: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from('turnarounds').delete().eq('id', id);
    if (error) throw error;
    return true;
  };

  const getTurnaroundById = useCallback(async (id: string): Promise<Turnaround | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('turnarounds')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapDbToTurnaround(data as DbRow);
  }, [user]);

  return {
    fetchPage,
    createTurnaround,
    updateTurnaround,
    deleteTurnaround,
    getTurnaroundById,
  };
};
