import { useNavigate } from 'react-router-dom';
import {
  Truck, ArrowRightLeft, ChevronsUp, Car, Zap,
  MoveLeft, Package, BoxSelect, ArrowLeftRight, Bus,
  LogOut, Shield, Plane, Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useEquipment } from '@/hooks/useEquipment';

const iconMap: Record<string, React.ElementType> = {
  Truck, ArrowRightLeft, ChevronsUp, Car, Zap,
  MoveLeft, Package, BoxSelect, ArrowLeftRight, Bus,
};

const EquiposHome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, rampa } = useModuleAccess();
  const { loading, fullCategories } = useEquipment();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="flex h-8 w-8 items-center justify-center text-primary" aria-label="Admin">
              <Shield size={20} />
            </button>
          )}
          {rampa && (
            <button onClick={() => navigate('/rampa')} className="flex h-8 w-8 items-center justify-center text-muted-foreground" aria-label="Rampa">
              <Plane size={20} />
            </button>
          )}
        </div>
        <h1 className="font-mono text-base font-bold uppercase tracking-widest">Control de Equipos</h1>
        <button onClick={() => { signOut(); navigate('/auth'); }} className="flex h-8 w-8 items-center justify-center text-muted-foreground" aria-label="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {fullCategories.map((cat) => {
            const Icon = iconMap[cat.icon] || Package;
            const operationalCount = cat.units.filter(u => !u.is_separator).length;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/equipos/${cat.id}`)}
                className="flex flex-col items-center gap-2 border border-border border-l-[3px] border-l-primary bg-card px-3 py-4 text-center active:scale-95 transition-transform"
              >
                <Icon size={28} strokeWidth={1.5} />
                <span className="font-mono text-xs font-bold uppercase leading-tight tracking-wide">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground">{operationalCount} unidades</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EquiposHome;
