import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdateBanner } from "@/components/UpdateBanner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStatusBarColor } from "@/hooks/useStatusBarColor";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { hydrateCatalogFromCache, loadCatalog } from "@/hooks/useCatalog";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { OfflineSyncRunner } from "@/components/OfflineSyncRunner";
import { ArionSyncBootstrap } from "@/components/ArionSyncBootstrap";

// Eager imports for critical work routes — avoids "Failed to fetch
// dynamically imported module" blank screens on iOS PWA resume when the
// app needs Auth / List / Form immediately.
import Auth from "./pages/Auth";
import TurnaroundList from "./pages/TurnaroundList";
import TurnaroundForm from "./pages/TurnaroundForm";
import NotFound from "./pages/NotFound";

// Secondary routes stay lazy (admin/catalog/equipos are heavier and less critical).
const CatalogManager = lazyWithRetry(() => import("./pages/admin/CatalogManager"));
const AdminPanel = lazyWithRetry(() => import("./pages/AdminPanel"));
const ModuleSelect = lazyWithRetry(() => import("./pages/ModuleSelect"));
const EquiposHome = lazyWithRetry(() => import("./pages/equipos/EquiposHome"));
const EquiposCategory = lazyWithRetry(() => import("./pages/equipos/EquiposCategory"));
const EquiposRevision = lazyWithRetry(() => import("./pages/equipos/EquiposRevision"));


const queryClient = new QueryClient();

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const ModuleRoute = ({ module, children }: { module: 'rampa' | 'equipos'; children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const access = useModuleAccess();
  if (authLoading || access.loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!access[module]) {
    if (module === 'rampa' && access.equipos) return <Navigate to="/equipos" replace />;
    if (module === 'equipos' && access.rampa) return <Navigate to="/rampa" replace />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

/**
 * Pantalla de salida cuando hay sesión pero no se puede entrar a ningún módulo.
 *
 * Antes esto redirigía a /auth, y como la pantalla de login redirige a "/" en
 * cuanto detecta sesión, las dos se rebotaban infinitamente: la app se quedaba
 * parpadeando y no se podía ni iniciar sesión ni salir. Ahora se para aquí y se
 * explica qué ocurre.
 */
const SinAcceso = ({ huboError }: { huboError: boolean }) => {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-lg font-bold">
          {huboError ? 'No se pudo comprobar tu acceso' : 'Tu cuenta no tiene módulos asignados'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {huboError
            ? 'Puede ser un problema de conexión. Comprueba que tienes datos o wifi y vuelve a intentarlo.'
            : 'Pide a un administrador que te dé acceso a Rampa o a Control de Equipos.'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            Reintentar
          </button>
          <button
            onClick={async () => { await signOut(); window.location.replace('/auth'); }}
            className="w-full rounded-md border border-border px-4 py-3 font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

const RootRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const access = useModuleAccess();
  if (authLoading || access.loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (access.rampa) return <Navigate to="/rampa" replace />;
  if (access.equipos) return <Navigate to="/equipos" replace />;
  // Con sesión activa NO se vuelve a /auth: ahí estaba el rebote infinito.
  return <SinAcceso huboError={access.error} />;
};

const AppRoutes = () => {
  // La barra de estado del móvil sigue el color de la cabecera de cada pantalla.
  useStatusBarColor();
  return (
  <Suspense fallback={<FullScreenLoader />}>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<RootRedirect />} />
      <Route path="/select" element={<ProtectedRoute><ModuleSelect /></ProtectedRoute>} />

      {/* Rampa module */}
      <Route path="/rampa" element={<ModuleRoute module="rampa"><TurnaroundList /></ModuleRoute>} />
      <Route path="/turnaround/new" element={<ModuleRoute module="rampa"><TurnaroundForm /></ModuleRoute>} />
      <Route path="/turnaround/:id" element={<ModuleRoute module="rampa"><TurnaroundForm /></ModuleRoute>} />

      {/* Equipos module */}
      <Route path="/equipos" element={<ModuleRoute module="equipos"><EquiposHome /></ModuleRoute>} />
      <Route path="/equipos/revision" element={<ModuleRoute module="equipos"><EquiposRevision /></ModuleRoute>} />
      <Route path="/equipos/:categoryId" element={<ModuleRoute module="equipos"><EquiposCategory /></ModuleRoute>} />

      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="/admin/catalogs" element={<ProtectedRoute><CatalogManager /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
  );
};

const CatalogBootstrap = () => {
  useEffect(() => {
    hydrateCatalogFromCache();
    const id = (window as any).requestIdleCallback?.(() => loadCatalog()) ?? setTimeout(() => loadCatalog(), 200);
    return () => { (window as any).cancelIdleCallback?.(id) ?? clearTimeout(id); };
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      
      <BrowserRouter>
        <AuthProvider>
          <CatalogBootstrap />
          <ArionSyncBootstrap />
          <OfflineSyncRunner />
          <UpdateBanner />
          <ChunkErrorBoundary>
            <AppRoutes />
          </ChunkErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>

  </QueryClientProvider>
);

export default App;
