import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Los avisos de la app, todos con la misma pinta.
 *
 * Antes iban en ámbar sobre fondo claro y en rampa, con sol y la pantalla a
 * medio brillo, apenas se leían. Ahora van en el azul de los botones con
 * texto blanco puro: el mismo contraste que ya funciona en el resto de la app.
 *
 * `tono="alerta"` es para cuando algo se ha parado y hay que hacer caso. Va en
 * rojo a propósito: si un aviso de parada tuviera el mismo color que uno
 * informativo, se leería como un aviso más y se pasaría por alto.
 */
export interface AvisoDestacadoProps {
  icono: React.ReactNode;
  titulo: string;
  children?: React.ReactNode;
  tono?: 'info' | 'alerta';
  /** Botón o botones de la parte de abajo, a lo ancho. */
  acciones?: React.ReactNode;
  className?: string;
}

export const AvisoDestacado: React.FC<AvisoDestacadoProps> = ({
  icono, titulo, children, tono = 'info', acciones, className,
}) => (
  <div
    className={cn(
      'rounded-xl p-3 shadow-sm',
      tono === 'alerta'
        ? 'bg-destructive text-white'
        : 'bg-primary text-primary-foreground',
      className,
    )}
  >
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-white">{icono}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-tight text-white">{titulo}</p>
        {children && (
          // Blanco puro también en el detalle: bajarle la opacidad es justo lo
          // que hacía ilegibles estos avisos.
          <div className="mt-0.5 text-sm text-white">{children}</div>
        )}
      </div>
    </div>
    {acciones && <div className="mt-2.5">{acciones}</div>}
  </div>
);

/** Botón para usar dentro de un aviso: blanco sobre el color del aviso. */
export const BotonDeAviso: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className, children, ...props }) => (
  <button
    type="button"
    className={cn(
      'flex w-full items-center justify-center gap-2 rounded-lg bg-white/95 px-3 py-2.5',
      'font-bold text-primary active:scale-[0.99] disabled:opacity-60',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
