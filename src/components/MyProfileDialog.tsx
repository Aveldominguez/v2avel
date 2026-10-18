import React, { useEffect, useState } from 'react';
import { Loader2, Save, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useMyProfile } from '@/hooks/useMyProfile';

interface MyProfileDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Mis datos: el nombre con el que firmo.
 *
 * El correo se enseña pero no se toca. Es el correo de ACCESO, y cambiarlo
 * sin confirmación es quedarse con la cuenta de alguien: si a nadie le han
 * robado el móvil desbloqueado todavía, mejor no abrir esa puerta. Lo cambia
 * un administrador desde el panel, que es quien da de alta a la gente.
 */
export const MyProfileDialog: React.FC<MyProfileDialogProps> = ({ open, onOpenChange }) => {
  const { displayName, email, guardarNombre } = useMyProfile();
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (open) setNombre(displayName); }, [open, displayName]);

  const sinCambios = nombre.trim() === displayName.trim();

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarNombre(nombre);
      toast({ title: 'Nombre actualizado', description: 'Así firmarás a partir de ahora.' });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'No se pudo guardar',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!guardando) onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            Mis datos
          </DialogTitle>
          <DialogDescription className="text-left">
            Tu nombre es el que sale como capataz en la hoja de Control de Rampa y en los informes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="perfil-nombre">Nombre</Label>
            <Input
              id="perfil-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre y apellido"
              maxLength={60}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="perfil-correo">Correo</Label>
            <Input id="perfil-correo" value={email} readOnly disabled className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">
              Es el correo con el que entras. Para cambiarlo, pídeselo a un administrador.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2" onClick={guardar} disabled={guardando || sinCambios || !nombre.trim()}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {guardando ? 'Guardando…' : 'Guardar nombre'}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
