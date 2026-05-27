import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plane, Wrench, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Button } from '@/components/ui/button';

const ModuleSelect = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { loading, rampa, equipos } = useModuleAccess();

  // Auto-redirect if only one module
  useEffect(() => {
    if (loading) return;
    if (rampa && !equipos) navigate('/rampa', { replace: true });
    else if (equipos && !rampa) navigate('/equipos', { replace: true });
    else if (!rampa && !equipos) navigate('/auth', { replace: true });
  }, [loading, rampa, equipos, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rampa || !equipos) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 h-14 border-b border-border">
        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
        <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate('/auth'); }}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-center">
          Selecciona un módulo
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          <button
            onClick={() => navigate('/rampa')}
            className="flex flex-col items-center gap-4 p-8 border-2 border-border hover:border-primary bg-card rounded-lg transition-all active:scale-95"
          >
            <Plane className="h-12 w-12 text-primary" />
            <div className="text-center">
              <h2 className="font-mono text-base font-bold uppercase">Registro de Escalas</h2>
              <p className="text-xs text-muted-foreground mt-1">Rampa</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/equipos')}
            className="flex flex-col items-center gap-4 p-8 border-2 border-border hover:border-primary bg-card rounded-lg transition-all active:scale-95"
          >
            <Wrench className="h-12 w-12 text-primary" />
            <div className="text-center">
              <h2 className="font-mono text-base font-bold uppercase">Control de Equipos</h2>
              <p className="text-xs text-muted-foreground mt-1">Estado y batería</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default ModuleSelect;
