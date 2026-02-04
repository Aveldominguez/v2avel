import { Turnaround, TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { v4 as uuidv4 } from 'uuid';

// Initial empty times
export const getEmptyTimes = (): TurnaroundTimes => ({
  chocksOnArrival: null,
  stairsTime: null,
  unloadingStart: null,
  unloadingEnd: null,
  loadingStart: null,
  loadingEnd: null,
  specialEndLoading: null,
  chocksOff: null,
  busArrival: null,
  lastBus: null,
  cargoArrival: false,
  cargoDeparture: false,
});

// Create new turnaround
export const createTurnaround = (
  flightNumber: string,
  date: Date,
  airline: AirlineCode
): Turnaround => ({
  id: uuidv4(),
  flightNumber,
  date,
  airline,
  times: getEmptyTimes(),
  fieldValues: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Storage key
const STORAGE_KEY = 'ramp_turnarounds';

// Load turnarounds from localStorage
export const loadTurnarounds = (): Turnaround[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    return parsed.map((t: any) => ({
      ...t,
      date: new Date(t.date),
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      fieldValues: t.fieldValues?.map((fv: any) => ({
        ...fv,
        updatedAt: new Date(fv.updatedAt),
      })) || [],
    }));
  } catch (e) {
    console.error('Error loading turnarounds:', e);
    return [];
  }
};

// Save turnarounds to localStorage
export const saveTurnarounds = (turnarounds: Turnaround[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(turnarounds));
  } catch (e) {
    console.error('Error saving turnarounds:', e);
  }
};

// Get turnaround by ID
export const getTurnaroundById = (
  turnarounds: Turnaround[],
  id: string
): Turnaround | undefined => {
  return turnarounds.find(t => t.id === id);
};

// Filter turnarounds
export const filterTurnarounds = (
  turnarounds: Turnaround[],
  filters: {
    date?: Date;
    airline?: AirlineCode;
    flightNumber?: string;
  }
): Turnaround[] => {
  return turnarounds.filter(t => {
    if (filters.date) {
      const filterDate = filters.date.toDateString();
      const turnaroundDate = t.date.toDateString();
      if (filterDate !== turnaroundDate) return false;
    }
    
    if (filters.airline && t.airline !== filters.airline) return false;
    
    if (filters.flightNumber) {
      const search = filters.flightNumber.toLowerCase();
      if (!t.flightNumber.toLowerCase().includes(search)) return false;
    }
    
    return true;
  });
};
