import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { resumenMeteo, type MeteoEscala } from '@/utils/meteoEscala';

const COLOR: Record<string, string> = {
  precaucion: 'bg-yellow-500 text-yellow-950',
  restriccion: 'bg-orange-500 text-white',
  suspension: 'bg-red-600 text-white',
};

const hora = (iso: string) => format(new Date(iso), 'HH:mm', { locale: es });

/**
 * El parte meteorológico del rato en que se trabajó la escala.
 *
 * Existe para poder explicar decisiones de seguridad semanas después: por qué
 * no se pusieron los conos, por qué se paró la carga. Con esto está el parte
 * oficial del aeropuerto de aquella media hora, con su viento y su racha.
 *
 * Se registra solo al cerrar la escala. Nace plegado, como Personal y
 * Equipos: en el móvil lo que no se está usando estorba.
 */
export const MeteoEscalaSection: React.FC<{ meteo?: MeteoEscala | null }> = ({ meteo }) => {
  if (!meteo || meteo.observaciones.length === 0) return null;

  const peor = meteo.maximo;

  return (
    <Card className="card-operational">
      <Accordion type="single" collapsible>
        <AccordionItem value="meteo" className="border-none">
          <CardHeader className="aero-equipment-header py-3">
            <AccordionTrigger className="py-0 hover:no-underline">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-muted">
                  <Wind className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <span>Meteorología de la escala</span>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    {resumenMeteo(meteo)}
                  </p>
                </div>
              </CardTitle>
            </AccordionTrigger>
          </CardHeader>

          <AccordionContent>
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Partes oficiales de {hora(meteo.ventana.desde)} a {hora(meteo.ventana.hasta)},
                guardados al cerrar la escala.
              </p>

              {peor?.alerta && (
                <div className={cn('rounded-lg px-3 py-2 text-sm font-bold', COLOR[peor.alerta])}>
                  Hubo alerta de viento durante la escala: {peor.alerta.toUpperCase()}
                  {peor.racha ? ` · rachas de ${peor.racha} kt` : ` · ${peor.kt} kt`}
                </div>
              )}

              <div className="space-y-1.5">
                {meteo.observaciones.map((o) => (
                  <div key={o.hora} className="rounded-md border border-border p-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono font-bold">{hora(o.hora)}</span>
                      <span className="text-sm">
                        {o.kt ?? '—'} kt
                        {o.racha ? ` · racha ${o.racha} kt` : ''}
                        {o.direccion != null ? ` · ${o.direccion}°` : ''}
                      </span>
                      {o.alerta && (
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', COLOR[o.alerta])}>
                          {o.alerta.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* El texto oficial, tal cual: esto es lo que vale como prueba. */}
                    <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground">{o.raw}</p>
                  </div>
                ))}
              </div>

              {meteo.taf && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Previsión vigente (TAF)
                  </p>
                  <p className="break-words font-mono text-[11px] text-muted-foreground">{meteo.taf}</p>
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default MeteoEscalaSection;
