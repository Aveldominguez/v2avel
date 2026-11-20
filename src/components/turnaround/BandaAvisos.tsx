import React from 'react';
import { UploadCloud } from 'lucide-react';
import { ConnectivityChip } from '@/components/ConnectivityChip';
import { cn } from '@/lib/utils';

/**
 * La franja de avisos de la escala.
 *
 * Nace de un fallo concreto: los avisos vivían en la fila de botones de la
 * cabecera, y al aparecer «Sin servidor» empujaban el botón de Guardar fuera
 * del margen de la pantalla. Justo con problemas de red, que es cuando más
 * falta hace guardar, el botón se iba. Los elementos se montaban unos encima
 * de otros y la cabecera dejaba de ser usable.
 *
 * Aquí los avisos tienen su propio sitio, a lo ancho, donde pueden crecer sin
 * desplazar a nadie. La cabecera de arriba pasa a tener huecos de tamaño fijo
 * y Guardar no se mueve nunca.
 *
 * CUANDO NO HAY NADA QUE DECIR, ESTO NO EXISTE. No es una franja reservada:
 * devuelve null y no ocupa ni un píxel. En un formulario que se usa con el
 * móvil en una mano y el avión delante, la altura de pantalla es lo más caro
 * que hay, y una barra permanente para decir «todo bien» no se paga sola.
 *
 * Aquí van los estados que DURAN —sin servidor, cambios por subir—, no las
 * confirmaciones de lo que acabas de hacer. Esas siguen siendo mensajes
 * pasajeros: meterlas aquí convertiría la franja en ruido de fondo y dejaría
 * de mirarse, que es la forma más segura de que un aviso de verdad pase
 * desapercibido.
 */
export const BandaAvisos: React.FC<{
  isOnline: boolean;
  pendingCount: number;
  className?: string;
}> = ({ isOnline, pendingCount, className }) => {
  const hayPendientes = pendingCount > 0;
  if (isOnline && !hayPendientes) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-1',
        'border-t border-warning/25 bg-warning/10 px-3 py-1.5 text-xs',
        className,
      )}
      role="status"
    >
      {/* Con texto siempre: aquí hay sitio de sobra y el icono solo no basta
          para distinguir quedarse sin cobertura de no llegar al servidor. */}
      {!isOnline && <ConnectivityChip textoSiempre />}

      {hayPendientes && (
        <span className="flex items-center gap-1.5 font-semibold text-warning">
          <UploadCloud className="h-3.5 w-3.5 shrink-0" />
          {pendingCount} {pendingCount === 1 ? 'cambio por subir' : 'cambios por subir'}
          <span className="font-normal opacity-80">
            {isOnline ? '· subiendo solos' : '· se enviarán al volver la cobertura'}
          </span>
        </span>
      )}
    </div>
  );
};
