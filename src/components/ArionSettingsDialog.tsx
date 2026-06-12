import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArionSync } from '@/hooks/useArionSync';

interface ArionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function relativeFromNow(iso: string | null): string {
  if (!iso) return 'Nunca';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'Justo ahora';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'Hace unos segundos';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} d`;
}

export const ArionSettingsDialog: React.FC<ArionSettingsDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { profile, lastSync, syncing, syncToday, reloadProfile } = useArionSync();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [station, setStation] = useState('MAD');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate fields when dialog opens / profile loads
  useEffect(() => {
    if (!open) return;
    setLogin(profile?.arion_login || '');
    setPassword(profile?.arion_password || '');
    setStation((profile?.arion_station || 'MAD').toUpperCase());
    setShowPassword(false);
  }, [open, profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          arion_login: login.trim() || null,
          arion_password: password || null,
          arion_station: (station.trim() || 'MAD').toUpperCase().slice(0, 4),
        })
        .eq('user_id', user.id);
      if (error) throw error;
      await reloadProfile();
      toast('Credenciales guardadas');
    } catch (err: any) {
      console.error('[arion] save error', err);
      toast.error('No se pudieron guardar las credenciales');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    const result = await syncToday();
    if (result) {
      toast(`${result.synced} vuelos sincronizados para hoy`);
      await reloadProfile();
    } else {
      // Read error from hook on next render; use a quick check via reload
      // The hook updates syncError state, but it isn't returned here. We pass a generic.
      toast.error('Credenciales incorrectas — revisa tu email y contraseña ARION');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración ARION</DialogTitle>
          <DialogDescription>
            Credenciales de Aviapartner ARION para sincronizar vuelos automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="arion-email">Email ARION</Label>
            <Input
              id="arion-email"
              type="email"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="nombre@aviapartner.aero"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arion-password">Contraseña ARION</Label>
            <div className="relative">
              <Input
                id="arion-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arion-station">Estación</Label>
            <Input
              id="arion-station"
              value={station}
              maxLength={4}
              onChange={(e) => setStation(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="MAD"
              className="uppercase font-mono"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>

        <div className="border-t border-border pt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Última sincronización: {relativeFromNow(lastSync)}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="gap-1.5"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sincronizar vuelos de hoy
          </Button>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
};

export default ArionSettingsDialog;
