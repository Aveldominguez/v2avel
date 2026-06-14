import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Turnaround, AirlineCode, AIRLINES, findAirline } from '@/types/turnaround';
import { useAllAirlines } from '@/hooks/useCatalog';
import { useTurnarounds } from '@/hooks/useTurnarounds';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { formatDate } from '@/utils/timeValidation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Plane,
  Trash2,
  Filter,
  X,
  LogOut,
  Loader2,
  Circle,
  RefreshCw,
  LayoutDashboard,
  Wrench,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { APP_VERSION } from '@/config/version';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { ArionStatusControl } from '@/components/ArionStatusControl';
import { WeatherWidget } from '@/components/WeatherWidget';

const PAGE_SIZE = 25;
const LIST_CACHE_KEY = 'turnaround-list-cache-v1';

const TurnaroundList: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { fetchPage, deleteTurnaround, syncAllToLocal } = useTurnarounds();
  const { isAdmin } = useAdmin();
  const { equipos: hasEquipos } = useModuleAccess();
  const { updating, updateAvailable, remoteVersion, remoteChangelog, checkForUpdate, applyUpdate } = useAppUpdate();
  const allAirlines = useAllAirlines();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-open update dialog once per remote version
  useEffect(() => {
    if (!updateAvailable || !remoteVersion) return;
    const seenKey = 'app-update-dialog-seen';
    const seen = localStorage.getItem(seenKey);
    if (seen !== remoteVersion) {
      setShowUpdateDialog(true);
    }
  }, [updateAvailable, remoteVersion]);

  const dismissUpdateDialog = () => {
    if (remoteVersion) localStorage.setItem('app-update-dialog-seen', remoteVersion);
    setShowUpdateDialog(false);
  };

  // Filters (persisted in sessionStorage)
  const FILTERS_KEY = 'turnaround-list-filters';
  const initialFilters = (() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { dateFilter?: string; airlineFilter?: string; searchQuery?: string };
    } catch {
      return null;
    }
  })();

  const [dateFilter, setDateFilter] = useState<Date | undefined>(
    initialFilters?.dateFilter ? new Date(initialFilters.dateFilter) : undefined
  );
  const [airlineFilter, setAirlineFilter] = useState<AirlineCode | 'ALL'>(
    (initialFilters?.airlineFilter as AirlineCode | 'ALL') || 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || '');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // List state
  const hasFilters = !!dateFilter || airlineFilter !== 'ALL' || searchQuery.trim() !== '';

  // Hydrate from local cache for instant first paint when no filters
  const cached = (() => {
    if (hasFilters) return null;
    try {
      const raw = localStorage.getItem(LIST_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Array<Turnaround & { date: string; createdAt: string; updatedAt: string }>;
      return parsed.map(t => ({
        ...t,
        date: new Date(t.date),
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        fieldValues: [],
      })) as Turnaround[];
    } catch {
      return null;
    }
  })();

  const [rows, setRows] = useState<Turnaround[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const fetchSeq = useRef(0);

  // Persist filters
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
        dateFilter: dateFilter ? dateFilter.toISOString() : undefined,
        airlineFilter,
        searchQuery,
      }));
    } catch {
      // ignore
    }
  }, [dateFilter, airlineFilter, searchQuery]);

  // Debounce search query for server fetch
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch first page when user/filters change
  useEffect(() => {
    if (!user) {
      setRows([]);
      setLoading(false);
      setHasMore(false);
      return;
    }
    const seq = ++fetchSeq.current;
    if (!cached || hasFilters) setLoading(true);
    fetchPage({
      offset: 0,
      limit: PAGE_SIZE,
      dateISO: dateFilter ? format(dateFilter, 'yyyy-MM-dd') : undefined,
      airline: airlineFilter !== 'ALL' ? airlineFilter : undefined,
      searchFlight: debouncedSearch || undefined,
    })
      .then((data) => {
        if (seq !== fetchSeq.current) return;
        setRows(data);
        setHasMore(data.length === PAGE_SIZE);
        setLoading(false);
        // Cache only the unfiltered first page
        if (!hasFilters) {
          try {
            localStorage.setItem(LIST_CACHE_KEY, JSON.stringify(data));
          } catch { /* ignore */ }
        }
      })
      .catch((err) => {
        console.error('Error fetching turnarounds:', err);
        if (seq !== fetchSeq.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateFilter, airlineFilter, debouncedSearch]);

  // Prefetch the form route so "Nueva Escala" opens instantly
  useEffect(() => {
    const idle = (cb: () => void) =>
      'requestIdleCallback' in window
        ? (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb)
        : setTimeout(cb, 200);
    idle(() => { import('@/pages/TurnaroundForm').catch(() => {}); });
  }, []);

  // Background: sync ALL turnarounds into local store so they're available offline.
  useEffect(() => {
    if (!user) return;
    const idle = (cb: () => void) =>
      'requestIdleCallback' in window
        ? (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb)
        : setTimeout(cb, 1000);
    idle(() => { syncAllToLocal().catch(() => {}); });
  }, [user, syncAllToLocal]);


  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage({
        offset: rows.length,
        limit: PAGE_SIZE,
        dateISO: dateFilter ? format(dateFilter, 'yyyy-MM-dd') : undefined,
        airline: airlineFilter !== 'ALL' ? airlineFilter : undefined,
        searchFlight: debouncedSearch || undefined,
      });
      setRows(prev => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [rows.length, loadingMore, hasMore, fetchPage, dateFilter, airlineFilter, debouncedSearch]);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteTurnaround(id);
      setRows(prev => prev.filter(t => t.id !== id));
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

  const getCompletionStatus = (t: Turnaround) => {
    const times = t.times;
    const hasArrival = times.chocksOnArrival;
    const hasDeparture = times.chocksOff;

    if (hasArrival && hasDeparture) return 'completed';
    if (hasArrival || times.unloadingStart || times.loadingStart) return 'in-progress';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Auto-emergent update dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={(open) => { if (!open) dismissUpdateDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Nueva versión {remoteVersion ? `v${remoteVersion}` : ''} disponible
            </DialogTitle>
            <DialogDescription>
              Estos son los cambios incluidos en esta actualización:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-2 list-disc list-inside text-foreground/90 max-h-[50vh] overflow-y-auto">
            {remoteChangelog.length > 0 ? (
              remoteChangelog.map((item, i) => (
                <li key={i}>{item}</li>
              ))
            ) : (
              <li>Mejoras y correcciones</li>
            )}
          </ul>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={dismissUpdateDialog}>
              Más tarde
            </Button>
            <Button onClick={() => { dismissUpdateDialog(); applyUpdate(); }} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Actualizar ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className={cn("sticky z-50 bg-card/95 backdrop-blur border-b-2 border-border", updateAvailable ? "top-[40px]" : "top-0")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-3">
            {/* FILA 1 — Identidad */}
            <div className="flex items-center justify-between w-full">
              <ThemeToggle />
              <div className="text-center flex-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Registros de Escalas Rampa</h1>
                <p className="text-sm text-muted-foreground">
                  Usuario: {user?.email}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">v{APP_VERSION}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={checkForUpdate}
                    disabled={updating}
                    title="Actualizar app"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", updating && "animate-spin")} />
                  </Button>
                </div>
              </div>
              <Button size="icon" className="h-9 w-9 bg-destructive hover:bg-destructive/80 active:bg-destructive/60 text-white border-0" onClick={handleSignOut} title="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* FILA 2 — Módulos de navegación */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 w-full">
              {isAdmin && (
                <Button size="icon" className="h-9 w-9 shrink-0 bg-[hsl(265,65%,55%)] hover:bg-[hsl(265,65%,45%)] text-white border-0" onClick={() => navigate('/admin')} title="Panel de administración">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              )}
              {hasEquipos && (
                <Button size="icon" className="h-9 w-9 shrink-0 bg-[hsl(185,80%,38%)] hover:bg-[hsl(185,80%,30%)] text-white border-0" onClick={() => navigate('/equipos')} title="Control de equipos">
                  <Wrench className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1" />
              <ArionStatusControl />
            </div>

            {/* FILA 3 — Acción principal */}
            <Button onClick={() => navigate('/turnaround/new')} size="lg" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Nueva Escala
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* METAR Weather */}
        <WeatherWidget />

        {/* Search toggle button */}
        <div className="flex justify-center w-full">
          <Button
            size="default"
            className={cn(
              'w-full gap-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white border-0',
              hasFilters && 'ring-2 ring-primary ring-offset-2'
            )}
            onClick={() => setShowFilters(v => !v)}
          >
            <Search className="h-4 w-4" />
            Buscar Escala
            {hasFilters && <span className="h-2 w-2 rounded-full bg-white inline-block" />}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Filters collapsible */}
        {showFilters && (
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
                      className={cn('h-11 w-full justify-start text-left font-normal', !dateFilter && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFilter ? format(dateFilter, 'PPP', { locale: es }) : 'Filtrar por fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFilter}
                      onSelect={(d) => { setDateFilter(d); setIsCalendarOpen(false); }}
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
                    {allAirlines.map((a) => (
                      <SelectItem key={a.code} value={a.code}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card className="card-operational">
          <CardHeader className="pb-4">
            {/* Search toggle button */}
            <div className="flex items-center justify-between mb-1">
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                className={cn('gap-2 text-sm', hasFilters && 'border-primary text-primary')}
                onClick={() => setShowFilters(v => !v)}
              >
                <Search className="h-4 w-4" />
                Buscar Escala
                {hasFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary inline-block" />}
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Últimas escalas</span>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && rows.length === 0 ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
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
                <Table className="table-operational w-full table-fixed">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-8 px-2"></TableHead>
                      <TableHead className="px-2">Vuelo</TableHead>
                      <TableHead className="px-2">Fecha</TableHead>
                      <TableHead className="w-12 px-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((t) => {
                      const status = getCompletionStatus(t);

                      return (
                        <TableRow key={t.id} className="hover:bg-secondary/30">
                          <TableCell className="w-8 px-2">
                            <Circle
                              className={cn(
                                'h-3.5 w-3.5',
                                status === 'completed' && 'fill-success text-success',
                                status === 'in-progress' && 'fill-warning text-warning',
                                status === 'pending' && 'fill-muted text-muted-foreground'
                              )}
                            />
                          </TableCell>
                          <TableCell className="px-2">
                            <button
                              onClick={() => navigate(`/turnaround/${t.id}`)}
                              className="font-mono font-bold text-base text-foreground hover:text-muted-foreground cursor-pointer bg-transparent border-none p-0"
                            >
                              {(t.times?.soloSalida && t.times?.departureFlightNumber) ? t.times.departureFlightNumber : t.flightNumber}
                              {t.observations && t.observations.replace(/[\s\u200B\uFEFF\u00A0]/g, '').length > 0 && (
                                <span className="text-destructive ml-0.5">*</span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="px-2">
                            <div className="flex items-center gap-1.5 text-sm">
                              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="whitespace-nowrap">{formatDate(t.date)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="w-12 px-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(t.id)}
                              className="text-destructive hover:text-destructive h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {hasMore && (
                  <div className="p-4 flex justify-center border-t border-border">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="w-full sm:w-auto"
                    >
                      {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Cargar más escalas
                    </Button>
                  </div>
                )}
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
