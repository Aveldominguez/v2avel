import React from 'react';
import { DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usandoAlternativa } from '@/config/puertas';

/**
 * Qué contarle al agente sobre la conexión alternativa cuando no hay servidor.
 *
 * Aquí NO hay interruptor a propósito. El permiso lo concede el administrador
 * usuario por usuario desde el panel: el servidor alternativo se paga aparte
 * y no tiene sentido que pase por él quien no lo necesita. Lo que sí hace
 * falta es que el agente sepa qué está pasando, porque si no sólo ve una app
 * que no carga y no tiene a quién preguntar.
 */
export const AvisoPuertaAlternativa: React.FC<{ className?: string }> = ({ className }) => {
  if (usandoAlternativa()) {
    return (
      <p className={cn('flex items-start gap-2 text-xs text-muted-foreground', className)}>
        <DoorOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Ya estás entrando por la conexión alternativa. Si tampoco llega, el
          problema no es el bloqueo de tu operadora.
        </span>
      </p>
    );
  }

  return (
    <p className={cn('flex items-start gap-2 text-xs text-muted-foreground', className)}>
      <DoorOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Si tienes O2 o Movistar, puede que tu operadora esté bloqueando el
        servidor. Pídele al administrador que te active la <b>conexión
        alternativa</b>: entra por otro camino y se queda puesta.
      </span>
    </p>
  );
};
