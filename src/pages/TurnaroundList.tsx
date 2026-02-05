import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Turnaround, AirlineCode, AIRLINES } from '@/types/turnaround';
import { useTurnarounds } from '@/hooks/useTurnarounds';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/timeValidation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Plane, 
  Eye, 
  Trash2, 
  Filter,
  X,
  LogOut,
  Loader2,
  Circle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const TurnaroundList: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { turnarounds, loading, deleteTurnaround } = useTurnarounds();
  const [filteredTurnarounds, setFilteredTurnarounds] = useState<Turnaround[]>([]);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [airlineFilter, setAirlineFilter] = useState<AirlineCode | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Apply filters
  useEffect(() => {
    let result = [...turnarounds];

    if (dateFilter) {
      const filterDate = dateFilter.toDateString();
      result = result.filter(t => t.date.toDateString() === filterDate);
    }

    if (airlineFilter !== 'ALL') {
      result = result.filter(t => t.airline === airlineFilter);
    }

    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      result = result.filter(t => t.flightNumber.toLowerCase().includes(search));
    }

    // Sort by date descending
    result = result.sort((a, b) => b.date.getTime() - a.date.getTime());

    setFilteredTurnarounds(result);
  }, [turnarounds, dateFilter, airlineFilter, searchQuery]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteTurnaround(id);
      toast({
        title: 'Escala eliminada',
        description: 'La escala ha sido eliminada correctamente',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la escala',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const clearFilters = () => {
    setDateFilter(undefined);
    setAirlineFilter('ALL');
    setSearchQuery('');
  };

  const hasFilters = dateFilter || airlineFilter !== 'ALL' || searchQuery;

  const getAirlineInfo = (code: AirlineCode) => AIRLINES.find(a => a.code === code);

  const getCompletionStatus = (t: Turnaround) => {
    const times = t.times;
    const hasArrival = times.chocksOnArrival;
    const hasDeparture = times.chocksOff;
    
    if (hasArrival && hasDeparture) return 'completed';
    if (hasArrival || times.unloadingStart || times.loadingStart) return 'in-progress';
    return 'pending';
  };

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <Plane className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Operaciones Rampa</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/turnaround/new')} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Nueva Escala
              </Button>
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card className="card-operational">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filtros
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por vuelo..."
                  className="pl-10 h-11"
                />
              </div>

              {/* Date filter */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-11 w-full justify-start text-left font-normal',
                      !dateFilter && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, 'PPP', { locale: es }) : 'Filtrar por fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={(d) => {
                      setDateFilter(d);
                      setIsCalendarOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Airline filter */}
              <Select value={airlineFilter} onValueChange={(v) => setAirlineFilter(v as AirlineCode | 'ALL')}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Todas las aerolíneas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las aerolíneas</SelectItem>
                  {AIRLINES.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="card-operational">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Escalas ({filteredTurnarounds.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTurnarounds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Plane className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {hasFilters ? 'No hay escalas con estos filtros' : 'No hay escalas registradas'}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/turnaround/new')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera escala
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-operational">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Vuelo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTurnarounds.map((t) => {
                      const status = getCompletionStatus(t);
                      
                      return (
                        <TableRow key={t.id} className="hover:bg-secondary/30">
                          <TableCell className="w-12">
                            <Circle
                              className={cn(
                                'h-4 w-4',
                                status === 'completed' && 'fill-success text-success',
                                status === 'in-progress' && 'fill-warning text-warning',
                                status === 'pending' && 'fill-muted text-muted-foreground'
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-lg">
                              {t.flightNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(t.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/turnaround/${t.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(t.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar escala?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos de esta escala.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TurnaroundList;
