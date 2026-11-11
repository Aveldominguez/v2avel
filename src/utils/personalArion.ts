import { supabase } from '@/integrations/supabase/client';

/**
 * El personal de Aviapartner, para poder asignarlo a una escala.
 *
 * ARION sólo se consulta de vez en cuando y la lista se guarda en el móvil:
 * en rampa la cobertura va y viene, y un buscador que exige internet no sirve
 * de nada justo cuando hace falta. Con la lista guardada se busca al instante
 * y sin datos.
 */

export interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
}

const CLAVE = 'arion_empleados_v1';
/** La plantilla cambia poco; una semana es de sobra y evita pedirla a diario. */
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

interface Guardado {
  empleados: Empleado[];
  bajado: number;
}

const leerCache = (): Guardado | null => {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const d = JSON.parse(raw) as Guardado;
    return Array.isArray(d?.empleados) && d.empleados.length > 0 ? d : null;
  } catch {
    return null;
  }
};

const escribirCache = (empleados: Empleado[]) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ empleados, bajado: Date.now() }));
  } catch {
    // Almacén lleno: se seguirá preguntando a ARION, que es peor pero funciona.
    // Nunca se tira nada de otros para hacer hueco a esto: no es tan importante.
  }
};

/** Lo que haya guardado, aunque esté viejo. Vale más que un buscador vacío. */
export const empleadosGuardados = (): Empleado[] => leerCache()?.empleados ?? [];

export const cacheCaducada = (): boolean => {
  const c = leerCache();
  return !c || Date.now() - c.bajado > VIGENCIA_MS;
};

/**
 * Trae la plantilla de ARION y la guarda. Si falla, devuelve lo que hubiera.
 *
 * Nunca lanza: quedarse sin buscador por un fallo de red sería peor que
 * buscar sobre una lista de la semana pasada.
 */
export const refrescarEmpleados = async (): Promise<Empleado[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('arion-employees');
    if (error) throw error;
    const empleados = (data?.empleados ?? []) as Empleado[];
    if (empleados.length === 0) throw new Error('ARION devolvió una lista vacía');
    escribirCache(empleados);
    return empleados;
  } catch (e) {
    console.warn('No se pudo refrescar el personal de ARION:', e);
    return empleadosGuardados();
  }
};

/** Sin tildes ni mayúsculas, para que la búsqueda no dependa de cómo se teclee. */
export const normalizar = (s: unknown): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const nombreCompleto = (e: Empleado): string =>
  [e.apellidos, e.nombre].filter(Boolean).join(', ') || e.id;

/**
 * Busca por nombre, apellidos o número de empleado.
 *
 * Todas las palabras tienen que aparecer, en cualquier orden: "juan gar"
 * encuentra a Juan García sin importar cómo se escriba primero.
 */
export const buscarEmpleados = (
  lista: Empleado[],
  consulta: string,
  limite = 20,
): Empleado[] => {
  const partes = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (partes.length === 0) return [];
  return lista
    .filter((e) => {
      const heno = normalizar(`${e.nombre} ${e.apellidos} ${e.id}`);
      return partes.every((p) => heno.includes(p));
    })
    .slice(0, limite);
};
