// Generado en su día por la plantilla. Ya NO es automático: lleva la puerta
// alternativa y la clave de sesión fija, que no se pueden regenerar.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { CLAVE_DE_SESION, urlDeSupabase } from '@/config/puertas';

/*
 * La dirección se decide AL ARRANCAR, una sola vez.
 *
 * Puede ser la de siempre o la del servidor propio, según lo que el agente
 * haya elegido en Ajustes. Por eso cambiar de puerta obliga a recargar la
 * app: esta conexión se crea aquí y ya no se vuelve a crear.
 */
const SUPABASE_URL = urlDeSupabase();
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    /*
     * Fijada a mano a propósito. Sin esto, la librería la deduce del nombre
     * del servidor, y al cambiar de puerta buscaría la sesión en otro sitio
     * y echaría al agente de la app. Ver `CLAVE_DE_SESION`.
     */
    storageKey: CLAVE_DE_SESION,
  }
});