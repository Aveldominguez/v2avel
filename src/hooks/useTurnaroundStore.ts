import { Turnaround, TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { v4 as uuidv4 } from 'uuid';

// Initial empty times
export const getEmptyTimes = (): TurnaroundTimes => ({
  lirReception: null,
  chocksOnArrival: null,
  stairsTime: null,
  unloadingStart: null,
  unloadingEnd: null,
  loadingStart: null,
  loadingEnd: null,
  lastHandBag: null,
  specialEndLoading: null,
  chocksOff: null,
  busArrival: null,
  lastBus: null,
  cargoArrival: false,
  cargoDeparture: false,
  firstBag: null,
  gpuOn: null,
  gpuOff: null,
  mailArrival: false,
  dock1: null,
  dock2: null,
  tango: null,
  isRemote: false,
  remoteLocation: null,
  asu: false,
  asuData: null,
  aircraftModel: null,
});

// Create a new turnaround
export const createTurnaround = async (
  flightNumber: string,
  date: Date,
  airline: AirlineCode,
  times: TurnaroundTimes,
  fieldValues: FieldValue[],
  observations: string
): Promise<Turnaround> => {
  const newTurnaround: Turnaround = {
    id: uuidv4(),
    flightNumber,
    date,
    airline,
    times,
    fieldValues,
    observations,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store in local storage
  let turnarounds = getTurnaroundsFromStorage();
  turnarounds.push(newTurnaround);
  localStorage.setItem('turnarounds', JSON.stringify(turnarounds));

  return newTurnaround;
};

// Update an existing turnaround
export const updateTurnaround = async (
  id: string,
  flightNumber: string,
  date: Date,
  airline: AirlineCode,
  times: TurnaroundTimes,
  fieldValues: FieldValue[],
  observations: string
): Promise<Turnaround> => {
  let turnarounds = getTurnaroundsFromStorage();
  const index = turnarounds.findIndex((t) => t.id === id);

  if (index === -1) {
    throw new Error('Turnaround not found');
  }

  const updatedTurnaround: Turnaround = {
    ...turnarounds[index],
    flightNumber,
    date,
    airline,
    times,
    fieldValues,
    observations,
    updatedAt: new Date(),
  };

  turnarounds[index] = updatedTurnaround;
  localStorage.setItem('turnarounds', JSON.stringify(turnarounds));

  return updatedTurnaround;
};

// Get a turnaround by ID
export const getTurnaroundById = async (id: string): Promise<Turnaround | undefined> => {
  const turnarounds = getTurnaroundsFromStorage();
  return turnarounds.find((t) => t.id === id);
};

// Get all turnarounds from local storage
export const getTurnaroundsFromStorage = (): Turnaround[] => {
  const storedTurnarounds = localStorage.getItem('turnarounds');
  return storedTurnarounds ? JSON.parse(storedTurnarounds) : [];
};
