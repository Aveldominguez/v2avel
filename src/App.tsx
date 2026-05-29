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

const CatalogManager = lazyWithRetry(() => import("./pages/admin/CatalogManager"));
const TurnaroundList = lazyWithRetry(() => import("./pages/TurnaroundList"));
const TurnaroundForm = lazyWithRetry(() => import("./pages/TurnaroundForm"));
const AdminPanel = lazyWithRetry(() => import("./pages/AdminPanel"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
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
    // Send them to whichever module they DO have, or to selector
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
  // Prefer Rampa when available (admins included); fall back to Equipos.
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
