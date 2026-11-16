import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CloudDownload, Loader2, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { DIAS_DE_HISTORICO, resumenMeteo, type MeteoEscala } from '@/utils/meteoEscala';

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
interface Props {
  meteo?: MeteoEscala | null;
  /** Se puede pedir al aeropuerto la de una escala ya trabajada. */
  sePuedeRellenar?: boolean;
  /** La escala es de hace más de lo que el aeropuerto guarda de histórico. */
  fueraDePlazo?: boolean;
  rellenando?: boolean;
  onRellenar?: () => void;
}

export const MeteoEscalaSection: React.FC<Props> = ({
  meteo, sePuedeRellenar, fueraDePlazo, rellenando, onRellenar,
}) => {
  /*
   * Sin partes anotados, la tarjeta SIEMPRE dice en qué estado está.
   *
   * Antes, cuando no había registro y tampoco se podía pedir al aeropuerto,
   * esto no pintaba nada: ni tarjeta, ni aviso, ni explicación. Desde la
   * escala era imposible distinguir «todavía no ha entrado el parte» de
   * «esto no lo registra la app», y la meteorología es justo lo que hay que
   * poder enseñar semanas después para justificar una decisión de
   * seguridad. Callar era la peor de las respuestas.
   */
  if (!meteo || meteo.observaciones.length === 0) {
    return (
      <Card className="card-operational">
        <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted shrink-0">
              <Wind className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">
                {sePuedeRellenar
                  ? 'Esta escala no tiene meteorología registrada'
                  : fueraDePlazo
                    ? 'Esta escala se quedó sin meteorología'
                    : 'Meteorología: esperando el primer parte'}
              </p>
              <p className="text-sm text-muted-foreground">
                {sePuedeRellenar
                  ? 'El aeropuerto todavía guarda los partes de estos días. Puedes pedirlos y dejarlos guardados en la escala.'
                  : fueraDePlazo
                    ? `El aeropuerto sólo guarda ${DIAS_DE_HISTORICO} días de partes y los de este día ya no están. No se puede recuperar.`
                    : 'Se anota sola en cuanto entre el parte del aeropuerto, sin tocar nada. Si no aparece en unos minutos, mira la conexión.'}
              </p>
            </div>
          </div>
          {sePuedeRellenar && (
            <Button
              type="button" className="shrink-0 gap-2"
              disabled={rellenando} onClick={onRellenar}
            >
              {rellenando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
              {rellenando ? 'Pidiendo…' : 'Registrar meteorología'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

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
                Partes oficiales de {hora(meteo.ventana.desde)} a {hora(meteo.ventana.hasta)}.
                {!meteo.prevision && ' Recuperados del histórico del aeropuerto después de la escala, así que no hay constancia de qué decía la previsión en su momento.'}
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
