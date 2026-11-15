import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { buscarAeropuerto, nombreDePais, type Aeropuerto } from '@/data/aeropuertos';

/**
 * El código de un aeropuerto, y al tocarlo quién es.
 *
 * Con veinte vuelos al día nadie se acuerda de que SAW es Estambul-Sabiha
 * Gökçen. Un toque y lo dice, sin salir de la escala.
 *
 * La lista de aeropuertos se baja la primera vez que alguien toca un código
 * y se queda guardada. Si no hay cobertura y no se bajó antes, se queda el
 * código a secas: es lo que había hasta ahora, no se pierde nada.
 */
export const CodigoAeropuerto: React.FC<{
  iata: string | null | undefined;
  className?: string;
}> = ({ iata, className }) => {
  const codigo = (iata ?? '').trim().toUpperCase();
  const [abierto, setAbierto] = useState(false);
  const [dato, setDato] = useState<Aeropuerto | null>(null);
  const [buscando, setBuscando] = useState(false);

  const buscar = useCallback(async () => {
    if (dato || buscando) return;
    setBuscando(true);
    try {
      setDato(await buscarAeropuerto(codigo));
    } finally {
      setBuscando(false);
    }
  }, [codigo, dato, buscando]);

  useEffect(() => { if (abierto) void buscar(); }, [abierto, buscar]);

  if (codigo.length !== 3) return <span className={className}>{codigo || '—'}</span>;

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('underline decoration-dotted underline-offset-4 active:scale-95', className)}
          title={`Ver qué aeropuerto es ${codigo}`}
          aria-label={`Ver qué aeropuerto es ${codigo}`}
        >
          {codigo}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64 rounded-xl p-3">
        {buscando && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
          </p>
        )}

        {!buscando && dato && (
          <div className="space-y-1">
            <p className="font-bold leading-tight">{dato.nombre}</p>
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {[dato.ciudad, nombreDePais(dato.pais)].filter(Boolean).join(', ')}
            </p>
            <p className="pt-1 font-mono text-xs text-muted-foreground">
              {dato.iata}{dato.icao ? ` · ${dato.icao}` : ''}
            </p>
          </div>
        )}

        {!buscando && !dato && (
          <p className="text-sm text-muted-foreground">
            No se conoce el aeropuerto <span className="font-mono">{codigo}</span>.
            Si estás sin cobertura, vuelve a probar con señal.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CodigoAeropuerto;
