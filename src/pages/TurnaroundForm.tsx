import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TurnaroundTimes, AirlineCode, FieldValue, TimeValidationError, AIRLINES } from '@/types/turnaround';
import { validateTimes, formatDateTime } from '@/utils/timeValidation';
import { useTurnarounds } from '@/hooks/useTurnarounds';
import { getEmptyTimes } from '@/hooks/useTurnaroundStore';
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
import { ArrowLeft, Save, Calendar as CalendarIcon, Plane, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const TurnaroundForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  
  const { createTurnaround, updateTurnaround, getTurnaroundById } = useTurnarounds();

  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [airline, setAirline] = useState<AirlineCode>('TAP');
  const [times, setTimes] = useState<TurnaroundTimes>(getEmptyTimes());
  const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
  const [errors, setErrors] = useState<TimeValidationError[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Load data on mount - only runs when id changes
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (id) {
        setLoading(true);
        const existing = await getTurnaroundById(id);
        if (isMounted) {
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
          setLoading(false);
        }
      }
    };
    loadData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Validate on times change
  useEffect(() => {
    setErrors(validateTimes(times));
  }, [times]);

  const handleSave = useCallback(async () => {
    if (!flightNumber.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Ingrese el número de vuelo',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && id) {
        await updateTurnaround(id, flightNumber, date, airline, times, fieldValues);
        setLastSaved(new Date());
        toast({
          title: 'Escala actualizada',
          description: `Vuelo ${flightNumber} guardado correctamente`,
        });
      } else {
        await createTurnaround(flightNumber, date, airline, times, fieldValues);
        toast({
          title: 'Escala creada',
          description: `Vuelo ${flightNumber} guardado correctamente`,
        });
        navigate('/');
      }
    } catch (err) {
      console.error('Error saving:', err);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la escala',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [flightNumber, date, airline, times, fieldValues, isEditing, id, navigate, createTurnaround, updateTurnaround]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <Button
                variant="secondary"
                onClick={() => navigate('/')}
                className="gap-2 font-semibold"
              >
                <Plane className="h-4 w-4" />
                Ver Escalas
              </Button>
              {errors.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-warning text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errors.length} advertencia(s)</span>
                </div>
              )}
              <Button onClick={handleSave} size="lg" className="gap-2" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
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

        {/* Airline Fields */}
        <AirlineTabs
          airline={airline}
          fieldValues={fieldValues}
          onChange={setFieldValues}
        />
      </main>
    </div>
  );
};

export default TurnaroundForm;
