import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Turnaround, TurnaroundTimes, AirlineCode, FieldValue, TimeValidationError, AIRLINES } from '@/types/turnaround';
import { validateTimes, formatDateTime } from '@/utils/timeValidation';
import { loadTurnarounds, saveTurnarounds, createTurnaround, getEmptyTimes, getTurnaroundById } from '@/hooks/useTurnaroundStore';
import { GeneralTimesBlock } from '@/components/turnaround/GeneralTimesBlock';
import { AirlineTabs } from '@/components/turnaround/AirlineTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Calendar as CalendarIcon, Plane, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const TurnaroundForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [turnarounds, setTurnarounds] = useState<Turnaround[]>([]);
  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [airline, setAirline] = useState<AirlineCode>('TAP');
  const [times, setTimes] = useState<TurnaroundTimes>(getEmptyTimes());
  const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
  const [errors, setErrors] = useState<TimeValidationError[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loaded = loadTurnarounds();
    setTurnarounds(loaded);

    if (id) {
      const existing = getTurnaroundById(loaded, id);
      if (existing) {
        setFlightNumber(existing.flightNumber);
        setDate(existing.date);
        setAirline(existing.airline);
        setTimes(existing.times);
        setFieldValues(existing.fieldValues);
        setLastSaved(existing.updatedAt);
      } else {
        toast({
          title: 'Error',
          description: 'No se encontró la escala',
          variant: 'destructive',
        });
        navigate('/');
      }
    }
  }, [id, navigate]);

  // Validate on times change
  useEffect(() => {
    setErrors(validateTimes(times));
  }, [times]);

  const handleSave = useCallback(() => {
    if (!flightNumber.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Ingrese el número de vuelo',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date();
    let updatedTurnarounds: Turnaround[];

    if (isEditing && id) {
      updatedTurnarounds = turnarounds.map(t =>
        t.id === id
          ? {
              ...t,
              flightNumber,
              date,
              airline,
              times,
              fieldValues,
              updatedAt: now,
            }
          : t
      );
    } else {
      const newTurnaround = createTurnaround(flightNumber, date, airline);
      newTurnaround.times = times;
      newTurnaround.fieldValues = fieldValues;
      updatedTurnarounds = [...turnarounds, newTurnaround];
    }

    saveTurnarounds(updatedTurnarounds);
    setTurnarounds(updatedTurnarounds);
    setLastSaved(now);

    toast({
      title: isEditing ? 'Escala actualizada' : 'Escala creada',
      description: `Vuelo ${flightNumber} guardado correctamente`,
    });

    if (!isEditing) {
      navigate('/');
    }
  }, [flightNumber, date, airline, times, fieldValues, turnarounds, isEditing, id, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b-2 border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">
                  {isEditing ? 'Editar Escala' : 'Nueva Escala'}
                </h1>
                {lastSaved && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Último guardado: {formatDateTime(lastSaved)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {errors.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-warning text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errors.length} advertencia(s)</span>
                </div>
              )}
              <Button onClick={handleSave} size="lg" className="gap-2">
                <Save className="h-5 w-5" />
                <span className="hidden sm:inline">Guardar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Flight Info Card */}
        <Card className="card-operational">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-info/20">
                <Plane className="h-5 w-5 text-info" />
              </div>
              Información del Vuelo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Número de Vuelo
                </Label>
                <Input
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  placeholder="TP1234"
                  className="input-operational font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fecha
                </Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'input-operational w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      {date ? format(date, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        if (d) {
                          setDate(d);
                          setIsCalendarOpen(false);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Aerolínea
                </Label>
                <Select value={airline} onValueChange={(v) => setAirline(v as AirlineCode)}>
                  <SelectTrigger className="input-operational">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRLINES.map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Times Block */}
        <GeneralTimesBlock
          times={times}
          onChange={setTimes}
          errors={errors}
        />

        {/* Airline Tabs */}
        <AirlineTabs
          fieldValues={fieldValues}
          onChange={setFieldValues}
        />
      </main>
    </div>
  );
};

export default TurnaroundForm;
