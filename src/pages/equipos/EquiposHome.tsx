import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, ArrowRightLeft, ChevronsUp, Car, Zap,
  MoveLeft, Package, BoxSelect, ArrowLeftRight, Bus,
  LogOut, Shield, Plane, Loader2, FileDown, RotateCcw,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '@/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useEquipment } from '@/hooks/useEquipment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const iconMap: Record<string, React.ElementType> = {
  Truck, ArrowRightLeft, ChevronsUp, Car, Zap,
  MoveLeft, Package, BoxSelect, ArrowLeftRight, Bus,
};

const EquiposHome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, rampa } = useModuleAccess();
  const { loading, fullCategories, reload } = useEquipment();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const now = new Date();
    doc.setFontSize(16);
    doc.text('Estado de Equipos', 14, 18);
    doc.setFontSize(10);
    doc.text(now.toLocaleString('es-ES'), 14, 25);
    let y = 35;
    fullCategories.forEach((cat) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(cat.name, 14, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      cat.units.filter(u => !u.is_separator).forEach((u) => {
        if (y > 285) { doc.addPage(); y = 20; }
        const s = u.state;
        const status = s?.is_broken ? 'TALLER' : s?.is_charging ? 'CARGANDO' : 'DISPONIBLE';
        const parking = s?.parking || '-';
        const bat = s?.battery_level != null ? `${s.battery_level}%` : '-';
        doc.text(`${u.code.padEnd(10)} ${status.padEnd(12)} P:${parking.padEnd(8)} Bat:${bat}`, 16, y);
        y += 5;
      });
      y += 4;
    });
    doc.save(`equipos-${now.toISOString().slice(0,10)}.pdf`);
  };

  const handleResetAll = async () => {
    setResetting(true);
    const { error } = await supabase
      .from('equipment_state')
      .update({ parking: '', battery_level: null, is_charging: false, charging_since: null })
      .eq('is_broken', false);
    setResetting(false);
    setConfirmReset(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      reload();
    }
  };


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

      {!loading && (
        <div className="flex flex-col gap-2 p-4 pt-0">
          <button
            onClick={handleExportPdf}
            className="flex items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-4 text-base font-medium active:scale-[0.99] transition-transform"
          >
            <FileDown size={20} /> Exportar estado en PDF
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center justify-center gap-3 rounded-md bg-destructive px-4 py-4 text-base font-medium text-destructive-foreground active:scale-[0.99] transition-transform"
          >
            <RotateCcw size={20} /> Resetear todos los equipos
          </button>
        </div>
      )}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Resetear todos los equipos?</AlertDialogTitle>
            <AlertDialogDescription>
              Se vaciarán los campos de parking, batería y carga de todos los equipos.
              Los equipos marcados como Averiado / Taller no se modificarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleResetAll(); }}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? 'Reseteando…' : 'Sí, resetear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EquiposHome;
