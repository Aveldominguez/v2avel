import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdateBanner } from "@/components/UpdateBanner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { hydrateCatalogFromCache, loadCatalog } from "@/hooks/useCatalog";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { OfflineSyncRunner } from "@/components/OfflineSyncRunner";

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

const RootRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const access = useModuleAccess();
  if (authLoading || access.loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (access.rampa) return <Navigate to="/rampa" replace />;
  if (access.equipos) return <Navigate to="/equipos" replace />;
  return <Navigate to="/auth" replace />;
};

const AppRoutes = () => (
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
      <Route path="/equipos/:categoryId" element={<ModuleRoute module="equipos"><EquiposCategory /></ModuleRoute>} />

      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="/admin/catalogs" element={<ProtectedRoute><CatalogManager /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

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
