import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Turnaround, AirlineCode, AIRLINES, findAirline } from '@/types/turnaround';
import { useAllAirlines } from '@/hooks/useCatalog';
import { getAllAircraftModels, getModelsForAirline } from '@/data/aircraftModels';
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
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Plane,
  Trash2,
  X,
  LogOut,
  Loader2,
  Circle,
  RefreshCw,
  LayoutDashboard,
  Wrench,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Menu,
  UserCircle2,
  KeyRound,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { APP_VERSION } from '@/config/version';
import { useAppUpdate } from '@/hooks/useAppUpdate';

import { WeatherWidget } from '@/components/WeatherWidget';
import { useIssueReportNotifications } from '@/hooks/useIssueReportNotifications';
import { ListRenderBoundary } from '@/components/turnaround/ListRenderBoundary';

const PAGE_SIZE = 4;
const LIST_CACHE_KEY = 'turnaround-list-cache-v1';

const TurnaroundList: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { fetchPage, deleteTurnaround, syncAllToLocal } = useTurnarounds();
  const { isAdmin } = useAdmin();
  const { equipos: hasEquipos } = useModuleAccess();
  const { updating, updateAvailable, remoteVersion, remoteChangelog, checkForUpdate, applyUpdate } = useAppUpdate();
  const allAirlines = useAllAirlines();
  useIssueReportNotifications();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalRecords, setTotalRecords] = useState<number | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    supabase
      .from('turnarounds')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setTotalRecords(count ?? 0));
  }, [user]);

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Contraseña demasiado corta', description: 'Utiliza al menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: 'No se pudo cambiar la contraseña', description: error.message, variant: 'destructive' });
      return;
    }
    setNewPassword('');
    setShowPasswordDialog(false);
    toast({ title: 'Contraseña actualizada' });
  };

  // Filters (persisted in sessionStorage)
  const FILTERS_KEY = 'turnaround-list-filters';
  // Scroll/pagination restore: saved when navigating into an escala so the
  // list comes back exactly where the user left it (same rows loaded + scroll).
  const SCROLL_KEY = 'turnaround-list-scroll';
  const initialFilters = (() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { dateFilter?: string; airlineFilter?: string; searchQuery?: string; modelFilter?: string };
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
  const [modelFilter, setModelFilter] = useState<string>(initialFilters?.modelFilter || 'ALL');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Modelos del desplegable: los de la aerolínea filtrada, o todos si no hay
  // ninguna seleccionada (así se puede buscar un modelo raro sin saber de quién es).
  const modelOptions = React.useMemo(
    () => (airlineFilter !== 'ALL' ? getModelsForAirline(airlineFilter) : getAllAircraftModels()),
    [airlineFilter]
  );

  // Si al cambiar de aerolínea el modelo filtrado ya no existe, se limpia
  // para no dejar la lista vacía sin explicación.
  useEffect(() => {
    if (modelFilter !== 'ALL' && !modelOptions.some(m => m.model === modelFilter)) {
      setModelFilter('ALL');
    }
  }, [modelOptions, modelFilter]);

  // List state
  const hasFilters = !!dateFilter || airlineFilter !== 'ALL' || modelFilter !== 'ALL' || searchQuery.trim() !== '';

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

  // Pending scroll restore (read once on mount, consumed after the first fetch)
  const scrollRestoreRef = useRef<{ y: number; count: number } | null>((() => {
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.y === 'number' && typeof parsed?.count === 'number') return parsed;
      return null;
    } catch {
      return null;
    }
  })());

  const openTurnaround = useCallback((id: string) => {
    try {
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ y: window.scrollY, count: rows.length }));
    } catch { /* ignore */ }
    navigate(`/turnaround/${id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, navigate]);

  // Persist filters
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
        dateFilter: dateFilter ? dateFilter.toISOString() : undefined,
        airlineFilter,
        searchQuery,
        modelFilter,
      }));
    } catch {
      // ignore
    }
  }, [dateFilter, airlineFilter, searchQuery, modelFilter]);

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
    // If returning from an escala, fetch as many rows as were loaded before
    // so the list can be restored to the same position.
    const restore = scrollRestoreRef.current;
    const firstLimit = restore ? Math.max(PAGE_SIZE, restore.count) : PAGE_SIZE;
    fetchPage({
      offset: 0,
      limit: firstLimit,
      dateISO: dateFilter ? format(dateFilter, 'yyyy-MM-dd') : undefined,
      airline: airlineFilter !== 'ALL' ? airlineFilter : undefined,
      aircraftModel: modelFilter !== 'ALL' ? modelFilter : undefined,
      searchFlight: debouncedSearch || undefined,
    })
      .then((data) => {
        if (seq !== fetchSeq.current) return;
        setRows(data);
        setHasMore(data.length === firstLimit);
        setLoading(false);
        if (restore) {
          scrollRestoreRef.current = null;
          try { sessionStorage.removeItem(SCROLL_KEY); } catch { /* ignore */ }
          requestAnimationFrame(() => {
            requestAnimationFrame(() => window.scrollTo(0, restore.y));
          });
        }
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
  }, [user, dateFilter, airlineFilter, modelFilter, debouncedSearch]);

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
        aircraftModel: modelFilter !== 'ALL' ? modelFilter : undefined,
        searchFlight: debouncedSearch || undefined,
      });
      setRows(prev => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [rows.length, loadingMore, hasMore, fetchPage, dateFilter, airlineFilter, modelFilter, debouncedSearch]);

  // Marcar escala como completada a mano (relevos: no siempre se puede tomar
  // la hora de calzos de salida y la escala quedaría incompleta para siempre).
  const [completingId, setCompletingId] = useState<string | null>(null);
  const markCompleted = async (t: Turnaround) => {
    if (completingId) return;
    setCompletingId(t.id);
    const newTimes = { ...t.times, manualCompleted: true };
    try {
      const { error } = await supabase
        .from('turnarounds')
        .update({ times: newTimes as unknown as Json })
        .eq('id', t.id);
      if (error) throw error;
      setRows(prev => prev.map(r => (r.id === t.id ? { ...r, times: newTimes } : r)));
      toast({ title: 'Escala marcada como completada' });
    } catch (err) {
      console.error('Error marking completed:', err);
      toast({ title: 'Error', description: 'No se pudo marcar la escala como completada', variant: 'destructive' });
    } finally {
      setCompletingId(null);
    }
  };

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
    setModelFilter('ALL');
    setSearchQuery('');
  };

  const getCompletionStatus = (t: Turnaround) => {
    const times = t.times;
    // Cierre manual desde el historial (p. ej. relevo sin hora de calzos de salida)
    if (times.manualCompleted) return 'completed';
    const hasArrival = times.chocksOnArrival;
    const hasDeparture = times.chocksOff;

    // "Sólo llegada" / "Sólo salida" escalas never have data for the other
    // side, so completion can't require both — only the side that applies.
    if (times.soloLlegada) {
      if (hasArrival) return 'completed';
      return times.unloadingStart ? 'in-progress' : 'pending';
    }
    if (times.soloSalida) {
      if (hasDeparture) return 'completed';
      return times.loadingStart ? 'in-progress' : 'pending';
    }

    if (hasArrival && hasDeparture) return 'completed';
    if (hasArrival || times.unloadingStart || times.loadingStart) return 'in-progress';
    return 'pending';
  };

  return (
    <div className="aero-home-page min-h-screen bg-background overflow-x-hidden">
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

      {/* Header (temas dark/light/exterior/sky) */}
      <header className={cn("classic-only sticky z-50 bg-card/95 backdrop-blur border-b-2 border-border", updateAvailable ? "top-[40px]" : "top-0")}>
        <div className="w-full px-3 py-3">
          <div className="flex flex-col items-center gap-2.5">
            {/* FILA 1 — Identidad compacta */}
            <div className="flex items-center justify-between w-full">
              <ThemeToggle />
              <div className="text-center flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight leading-tight">Registros de Escalas Rampa</h1>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground min-w-0">
                  <span className="truncate">{user?.email}</span>
                  <span className="shrink-0">·</span>
                  <span className="font-mono shrink-0">v{APP_VERSION}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={checkForUpdate}
                    disabled={updating}
                    title="Actualizar app"
                  >
                    <RefreshCw className={cn("h-3 w-3", updating && "animate-spin")} />
                  </Button>
                </div>
              </div>
              <Button size="icon" className="pill-action h-9 w-9 bg-destructive hover:bg-destructive/80 active:bg-destructive/60 text-white border-0" onClick={handleSignOut} title="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* FILA 2 — Acción principal + módulos en una sola línea */}
            <div className="flex items-center gap-1.5 w-full">
              {isAdmin && (
                <Button size="sm" className="pill-action h-11 shrink-0 gap-1.5 px-3 bg-[hsl(265,65%,55%)] hover:bg-[hsl(265,65%,45%)] text-white border-0" onClick={() => navigate('/admin')} title="Panel de administración">
                  <LayoutDashboard className="h-4 w-4" />
                  Admin
                </Button>
              )}
              {hasEquipos && (
                <Button size="sm" className="pill-action h-11 shrink-0 gap-1.5 px-3 bg-[hsl(185,80%,38%)] hover:bg-[hsl(185,80%,30%)] text-white border-0" onClick={() => navigate('/equipos')} title="Control de equipos">
                  <Wrench className="h-4 w-4" />
                  Equipos
                </Button>
              )}
              <Button onClick={() => navigate('/turnaround/new')} className="pill-action h-11 flex-1 gap-2">
                <Plus className="h-4 w-4" />
                Nueva Escala
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Header (Estilo v4 / Aero) */}
      <header className={cn("aero-home-header aero-only sticky z-50 border-b border-border bg-background/95 backdrop-blur-xl", updateAvailable ? "top-[40px]" : "top-0")}>
        <div className="mx-auto max-w-3xl px-3 py-3">
          <div className="grid grid-cols-[40px_1fr_40px_40px] items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <button className="aero-home-action flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="aero-home-sheet flex w-[82vw] max-w-xs flex-col bg-sidebar text-sidebar-foreground">
                <SheetHeader>
                  <SheetTitle className="aero-home-sheet-title">Control de Rampa</SheetTitle>
                </SheetHeader>
                <nav className="mt-8 space-y-2">
                  {isAdmin && (
                    <SheetClose asChild>
                      <button onClick={() => navigate('/admin')} className="aero-home-menu-link flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left">
                        <LayoutDashboard className="h-5 w-5 text-sidebar-primary" />
                        Panel de control
                      </button>
                    </SheetClose>
                  )}
                  {hasEquipos && (
                    <SheetClose asChild>
                      <button onClick={() => navigate('/equipos')} className="aero-home-menu-link flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left">
                        <Wrench className="h-5 w-5 text-sidebar-primary" />
                        Control de equipos
                      </button>
                    </SheetClose>
                  )}
                  <SheetClose asChild>
                    <button onClick={checkForUpdate} disabled={updating} className="aero-home-menu-link flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left">
                      <RefreshCw className={cn("h-5 w-5 text-sidebar-primary", updating && "animate-spin")} />
                      Actualizar app
                    </button>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>

            <div className="text-center min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">Control Rampa v{parseFloat(APP_VERSION)}</h1>
              <p className="text-xs text-muted-foreground truncate">Operaciones de rampa</p>
            </div>

            <ThemeToggle />

            <Popover>
              <PopoverTrigger asChild>
                <button className="aero-home-action flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Abrir mi cuenta">
                  <UserCircle2 className="h-6 w-6" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 rounded-xl">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">Mi cuenta</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 py-3 text-sm">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Escalas registradas: <strong>{totalRecords ?? '—'}</strong>
                </div>
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setShowPasswordDialog(true)}>
                  <KeyRound className="h-4 w-4" />
                  Cambiar contraseña
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={() => navigate('/turnaround/new')} size="lg" className="aero-new-scale-button mt-3 w-full gap-2 rounded-xl font-extrabold">
            <Plus className="h-4 w-4" />
            Nueva escala
          </Button>
        </div>
      </header>

      <main className="w-full py-4 pb-20 space-y-4">
        {/* METAR Weather */}
        <div className="classic-only">
          <WeatherWidget />
        </div>
        <div className="aero-only">
          <WeatherWidget compact />
        </div>

        {/* Search toggle + filters unified block */}
        <Card className="border-0 shadow-none bg-card rounded-none overflow-hidden p-0">
          {/* Toggle button as card header */}
          <button
            className={cn(
              // Colores base: dark/light/exterior/sky. El estilo ámbar de Aero
              // llega vía CSS scoped ".aero .aero-search-toggle" (con !important),
              // así no se filtra a los demás temas.
              'search-toggle aero-search-toggle w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-y border-border',
              'bg-secondary/50 hover:bg-secondary text-foreground'
            )}
            onClick={() => setShowFilters(v => !v)}
          >
            <Search className="h-4 w-4" />
            Buscar Escala
            {hasFilters && <span className="h-2 w-2 rounded-full bg-primary inline-block" />}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Filters — only rendered when open, no separator card */}
          {showFilters && (
            <div className="p-4">
              {hasFilters && (
                <div className="flex justify-end mb-3">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      className={cn('aero-home-filter h-11 w-full justify-start text-left font-normal', !dateFilter && 'text-muted-foreground')}
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
                  <SelectTrigger className="aero-home-filter h-11">
                    <SelectValue placeholder="Todas las aerolíneas" />
                  </SelectTrigger>
                  <SelectContent className="aero-home-filter-menu">
                    <SelectItem value="ALL">Todas las aerolíneas</SelectItem>
                    {allAirlines.map((a) => (
                      <SelectItem key={a.code} value={a.code}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Aircraft model filter */}
                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger className="aero-home-filter h-11">
                    <SelectValue placeholder="Todos los modelos" />
                  </SelectTrigger>
                  <SelectContent className="aero-home-filter-menu">
                    <SelectItem value="ALL">Todos los modelos</SelectItem>
                    {modelOptions.map((m) => (
                      <SelectItem key={m.model} value={m.model}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </Card>

        {/* Results */}
        <Card className="border-0 shadow-none bg-card rounded-none">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Últimas escalas</span>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
           <ListRenderBoundary>
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
              <>
                {/* Renderizado condicional (no CSS display toggle): esta lista
                    puede ser larga y algunos navegadores no repintan bien
                    contenido que pasa de display:none a grid al reentrar en
                    un tema ya visitado — con mount/unmount real de React no
                    hay ese riesgo. */}
                {theme === 'aero' && (
                <div className="aero-recent-list px-3 pb-1">
                  {rows.map((t) => {
                    const status = getCompletionStatus(t);
                    const flight = (t.times?.soloSalida && t.times?.departureFlightNumber)
                      ? t.times.departureFlightNumber
                      : t.flightNumber;
                    const routeOrigin = t.times?.homeStation || t.times?.originStation || '—';
                    const routeDestination = t.times?.destStation || t.times?.homeStation || '—';
                    const statusLabel = status === 'completed'
                      ? 'Completada'
                      : status === 'in-progress'
                        ? 'En proceso'
                        : 'Pendiente';

                    return (
                      <article
                        key={`aero-${t.id}`}
                        className={cn('aero-recent-card', `aero-recent-${status}`)}
                      >
                        <div className="aero-recent-accent" />
                        <button
                          onClick={() => openTurnaround(t.id)}
                          className="aero-recent-main"
                          aria-label={`Abrir escala ${flight}`}
                        >
                          <span className="aero-recent-plane">
                            <Plane className="h-7 w-7" />
                          </span>
                          <span className="aero-recent-flight">
                            <strong>
                              {flight}
                              {t.observations && t.observations.replace(/[\s\u200B\uFEFF\u00A0]/g, '').length > 0 && (
                                <span className="ml-1 text-destructive">*</span>
                              )}
                            </strong>
                            <span className="aero-recent-route">{routeOrigin} <span>→</span> {routeDestination}</span>
                            <small>{t.times?.aircraftModel || '—'} · {t.times?.matricula || '—'}</small>
                          </span>
                          <span className="aero-recent-meta">
                            <span className="aero-recent-status">{statusLabel}</span>
                            <span className="aero-recent-date">
                              <CalendarIcon className="h-4 w-4" />
                              {formatDate(t.date)}
                            </span>
                          </span>
                          <ChevronRight className="aero-recent-chevron h-5 w-5" />
                        </button>
                        {status !== 'completed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markCompleted(t)}
                            disabled={completingId === t.id}
                            className="aero-recent-complete h-8 w-8 text-success hover:text-success"
                            title="Marcar escala como completada"
                            aria-label={`Marcar escala ${flight} como completada`}
                          >
                            {completingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(t.id)}
                          className="aero-recent-delete h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`Eliminar escala ${flight}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </article>
                    );
                  })}
                </div>
                )}

                {theme !== 'aero' && (
                <div className="overflow-x-auto">
                  <Table className="table-operational w-full table-fixed">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8 px-2"></TableHead>
                        <TableHead className="px-2">Vuelo</TableHead>
                        <TableHead className="px-2">Fecha</TableHead>
                        <TableHead className="w-20 px-2"></TableHead>
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
                                  'status-dot h-3.5 w-3.5',
                                  status === 'completed' && 'fill-success text-success status-dot-completed',
                                  status === 'in-progress' && 'fill-warning text-warning status-dot-progress',
                                  status === 'pending' && 'fill-muted text-muted-foreground'
                                )}
                              />
                            </TableCell>
                            <TableCell className="px-2">
                              <button
                                onClick={() => openTurnaround(t.id)}
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
                            <TableCell className="w-20 px-2">
                              <div className="flex items-center">
                                {status !== 'completed' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => markCompleted(t)}
                                    disabled={completingId === t.id}
                                    className="text-success hover:text-success h-8 w-8"
                                    title="Marcar escala como completada"
                                    aria-label="Marcar escala como completada"
                                  >
                                    {completingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteId(t.id)}
                                  className="text-destructive hover:text-destructive h-8 w-8"
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

                {/* Load more button */}
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="aero-load-more gap-2"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {loadingMore ? 'Cargando...' : 'Ver más escalas'}
                    </Button>
                  </div>
                )}
              </>
            )}
           </ListRenderBoundary>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>Introduce una nueva contraseña de al menos 8 caracteres.</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Nueva contraseña"
            autoComplete="new-password"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancelar</Button>
            <Button onClick={handlePasswordChange} disabled={changingPassword}>
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
