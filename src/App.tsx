import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdateBanner } from "@/components/UpdateBanner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { hydrateCatalogFromCache, loadCatalog } from "@/hooks/useCatalog";

const CatalogManager = lazy(() => import("./pages/admin/CatalogManager"));
const TurnaroundList = lazy(() => import("./pages/TurnaroundList"));
const TurnaroundForm = lazy(() => import("./pages/TurnaroundForm"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ModuleSelect = lazy(() => import("./pages/ModuleSelect"));
const EquiposHome = lazy(() => import("./pages/equipos/EquiposHome"));
const EquiposCategory = lazy(() => import("./pages/equipos/EquiposCategory"));

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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
