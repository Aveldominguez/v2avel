import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Fuel, Loader2, Save, Check } from 'lucide-react';
import {
  useEquipment, updateParking, updateBattery, toggleCharging, toggleBroken,
} from '@/hooks/useEquipment';
import EquipmentRow from '@/components/equipos/EquipmentRow';
import type { EquipmentUnitFull } from '@/types/equipment';

function getRanked(units: EquipmentUnitFull[]) {
  const nonSep = units.filter(u => !u.is_separator);
  const withLevel = nonSep
    .filter(u => u.state?.battery_level != null)
    .sort((a, b) => (a.state!.battery_level! - b.state!.battery_level!));
  const rankMap = new Map<string, number>();
  withLevel.forEach((u, i) => rankMap.set(u.id, i + 1));
  return rankMap;
}

const EquiposCategory = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { loading, fullCategories } = useEquipment();
  const category = fullCategories.find(c => c.id === categoryId);

  const rankMap = useMemo(() => category ? getRanked(category.units) : new Map(), [category]);

  const [justSaved, setJustSaved] = useState(false);
  const handleSave = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!category) {
    return <div className="min-h-screen flex items-center justify-center"><p>Categoría no encontrada</p></div>;
  }

  const isAutonomy = categoryId === 'furgonetas';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-background px-3">
        <button onClick={() => navigate('/equipos')} className="flex h-10 w-10 items-center justify-center" aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center font-mono text-base font-bold uppercase tracking-wide">{category.name}</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-auto px-2 py-2">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border text-left text-xs font-bold uppercase text-muted-foreground">
              <th className="px-1 py-2">⚡ Equipo</th>
              <th className="w-20 px-1 py-2">Parking</th>
              <th className="px-1 py-2 text-center">{isAutonomy ? 'Autonomía' : 'Batería'}</th>
            </tr>
          </thead>
          <tbody>
            {category.units.map((unit) =>
              unit.is_separator ? (
                <tr key={unit.id} className="border-b-2 border-primary bg-secondary">
                  <td colSpan={3} className="px-3 py-2">
                    <div className="flex items-center gap-2 font-mono text-sm font-bold uppercase text-primary">
                      <Fuel size={16} />{unit.code}
                    </div>
                  </td>
                </tr>
              ) : (
                <EquipmentRow
                  key={unit.id}
                  unit={unit}
                  rank={rankMap.get(unit.id) ?? null}
                  isAutonomyMode={isAutonomy}
                  onToggleCharging={() => toggleCharging(unit.id, unit.code, category.id, unit.state?.is_charging ?? false, 'equipos')}
                  onUpdateParking={(v) => updateParking(unit.id, unit.code, category.id, unit.state?.parking ?? '', v, 'equipos')}
                  onUpdateBattery={(v) => updateBattery(unit.id, unit.code, category.id, unit.state?.battery_level ?? null, v, 'equipos')}
                  onToggleBroken={() => toggleBroken(unit.id, unit.code, category.id, unit.state?.is_broken ?? false, 'equipos')}
                />
              )
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        className={`fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors ${
          justSaved ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
        aria-label="Guardar cambios"
      >
        {justSaved ? <Check size={26} /> : <Save size={24} />}
      </button>
    </div>
  );
};

export default EquiposCategory;
