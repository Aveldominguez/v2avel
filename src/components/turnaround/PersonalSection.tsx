import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  buscarEmpleados, cacheCaducada, empleadosGuardados, nombreCompleto,
  refrescarEmpleados, type Empleado,
} from '@/utils/personalArion';

export interface PersonaEnEscala {
  employeeId: string | null;
  nombre: string;
  funcion: string;
}

interface PersonalSectionProps {
  personal: PersonaEnEscala[];
  onChange: (personal: PersonaEnEscala[]) => void;
}

/**
 * Funciones que más se repiten en rampa. Son atajos, no una lista cerrada:
 * el campo sigue siendo libre porque ningún listado aguanta la realidad de
 * un turno.
 */
const FUNCIONES_FRECUENTES = ['Conductor', 'Bodega', 'Cinta', 'Rampa', 'Pasarela', 'Tractorista'];

/**
 * Quién trabaja en la escala.
 *
 * Nace plegado y enseña el recuento en la cabecera, igual que Equipos: en un
 * móvil cada sección abierta son dos dedos de scroll que estorban cuando lo
 * que corre es el avión.
 */
export const PersonalSection: React.FC<PersonalSectionProps> = ({ personal, onChange }) => {
  const [plantilla, setPlantilla] = useState<Empleado[]>(() => empleadosGuardados());
  const [bajando, setBajando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const pedido = useRef(false);

  // La plantilla se baja una vez y se guarda en el móvil: en rampa no se puede
  // depender de tener cobertura justo cuando hay que apuntar a alguien.
  useEffect(() => {
    if (pedido.current || !cacheCaducada()) return;
    pedido.current = true;
    setBajando(true);
    refrescarEmpleados()
      .then(setPlantilla)
      .finally(() => setBajando(false));
  }, []);

  const yaEstan = useMemo(
    () => new Set(personal.map((p) => p.employeeId).filter(Boolean) as string[]),
    [personal],
  );

  const resultados = useMemo(
    () => buscarEmpleados(plantilla, consulta).filter((e) => !yaEstan.has(e.id)),
    [plantilla, consulta, yaEstan],
  );

  const añadir = useCallback((persona: PersonaEnEscala) => {
    onChange([...personal, persona]);
    setConsulta('');
  }, [personal, onChange]);

  const cambiarFuncion = useCallback((i: number, funcion: string) => {
    onChange(personal.map((p, j) => (j === i ? { ...p, funcion } : p)));
  }, [personal, onChange]);

  const quitar = useCallback((i: number) => {
    onChange(personal.filter((_, j) => j !== i));
  }, [personal, onChange]);

  const escrito = consulta.trim();
  // Un nombre escrito a mano sólo se ofrece si no hay a quién elegir: lo
  // normal es que la persona esté en ARION, y dos fichas del mismo compañero
  // escritas distinto no sirven para nada después.
  const ofrecerManual = escrito.length >= 3 && resultados.length === 0 && !bajando;

  return (
    <Card className="card-operational">
      <Accordion type="single" collapsible>
        <AccordionItem value="personal" className="border-none">
          <CardHeader className="aero-equipment-header py-3">
            <AccordionTrigger className="py-0 hover:no-underline">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <span>Personal</span>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    {personal.length === 0
                      ? 'Nadie asignado'
                      : `${personal.length} ${personal.length === 1 ? 'persona' : 'personas'}`}
                  </p>
                </div>
              </CardTitle>
            </AccordionTrigger>
          </CardHeader>

          <AccordionContent>
            <CardContent className="pt-4 space-y-3">
              {personal.map((p, i) => (
                <div key={`${p.employeeId ?? 'manual'}-${i}`} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.employeeId ? `nº ${p.employeeId}` : 'escrito a mano'}
                      </p>
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => quitar(i)}
                      aria-label={`Quitar a ${p.nombre}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    value={p.funcion}
                    onChange={(e) => cambiarFuncion(i, e.target.value)}
                    placeholder="Función en la escala"
                    className="mt-2 h-9"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {FUNCIONES_FRECUENTES.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => cambiarFuncion(i, f)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs transition-colors',
                          p.funcion === f
                            ? 'border-primary bg-primary/10 font-semibold text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* La caja de búsqueda se queda siempre, para seguir añadiendo. */}
              <div className="space-y-2">
                <Input
                  value={consulta}
                  onChange={(e) => setConsulta(e.target.value)}
                  placeholder="Buscar por nombre, apellidos o nº de empleado…"
                  className="h-10"
                  autoComplete="off"
                />

                {bajando && plantilla.length === 0 && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Bajando la plantilla de ARION…
                  </p>
                )}

                {!bajando && plantilla.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No se ha podido traer la plantilla de ARION. Puedes escribir el nombre a mano.
                  </p>
                )}

                {escrito.length > 0 && escrito.length < 2 && (
                  <p className="text-sm text-muted-foreground">Escribe al menos dos letras.</p>
                )}

                {resultados.length > 0 && (
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
                    {resultados.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => añadir({ employeeId: e.id, nombre: nombreCompleto(e), funcion: '' })}
                        className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-muted"
                      >
                        <span className="min-w-0 truncate">{nombreCompleto(e)}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">nº {e.id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {ofrecerManual && (
                  <Button
                    type="button" variant="outline" className="w-full gap-2"
                    onClick={() => añadir({ employeeId: null, nombre: escrito, funcion: '' })}
                  >
                    <UserPlus className="h-4 w-4" />
                    Añadir «{escrito}» a mano
                  </Button>
                )}

                {personal.length === 0 && escrito.length === 0 && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Plus className="h-4 w-4" />
                    Busca a quien haya trabajado en la escala y añádelo.
                  </p>
                )}
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default PersonalSection;
