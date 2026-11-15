import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMetar, getWindAlertLevel } from '@/hooks/useMetar';
import { useWindForecast } from '@/hooks/useWindForecast';
import {
  momentoDe, observacionesDeLaVentana, peorDelIntervalo, previsionParaVentana,
  ventanaDeEscala, type MeteoEscala, type ObsCruda, type ObservacionMeteo,
} from '@/utils/meteoEscala';

interface Opciones {
  activo: boolean;
  fecha: Date;
  times: Record<string, unknown>;
  setTimes: (f: (t: Record<string, unknown>) => Record<string, unknown>) => void;
}

/** Sin hora de salida conocida se da por hecha una escala larga. */
const ESCALA_POR_DEFECTO_MIN = 120;

/**
 * Deja constancia de la meteorología mientras se trabaja la escala.
 *
 * Se hace con lo que la app YA tiene cargado, sin llamadas de más: el parte
 * (METAR) se refresca cada diez minutos para la insignia de viento, y el TAF
 * se pide una vez porque vale para muchas horas.
 *
 * Por qué así y no todo al cerrar: en rampa la cobertura va y viene, y
 * depender de que la haya justo al poner calzos de salida es depender de la
 * suerte. Anotando desde el principio, aunque luego no haya red, queda el
 * parte que había al empezar y los que fueran entrando.
 */
export const useRegistroMeteo = ({ activo, fecha, times, setTimes }: Opciones) => {
  const { windData } = useMetar();
  const { forecast, refresh: refrescarTaf } = useWindForecast();
  const completado = useRef(false);

  useEffect(() => { if (activo) refrescarTaf(); }, [activo, refrescarTaf]);

  const meteo = times.meteo as MeteoEscala | null | undefined;
  const calzosOn = times.chocksOnArrival as string | undefined;
  const calzosOff = times.chocksOff as string | undefined;

  // 1. Al poner calzos de llegada: se abre el registro con lo que hay en mano.
  useEffect(() => {
    if (!activo || meteo || !calzosOn) return;

    const desde = momentoDe(fecha, calzosOn);
    if (!desde) return;

    // El rato que se espera estar: hasta la salida prevista, o dos horas.
    const salida = momentoDe(fecha, (times.departureTime ?? times.scheduledStd) as string);
    const hasta = salida && salida > desde
      ? salida
      : new Date(desde.getTime() + ESCALA_POR_DEFECTO_MIN * 60_000);

    const primeras: ObservacionMeteo[] = windData
      ? [{
          hora: windData.updatedAt.toISOString(),
          direccion: windData.direction,
          kt: windData.speed,
          racha: windData.gust,
          alerta: getWindAlertLevel(windData.speed, windData.gust),
          raw: windData.rawMetar,
        }]
      : [];

    setTimes((t) => (t.meteo ? t : {
      ...t,
      meteo: {
        ventana: { desde: desde.toISOString(), hasta: hasta.toISOString() },
        registradoEn: new Date().toISOString(),
        observaciones: primeras,
        maximo: peorDelIntervalo(primeras),
        taf: forecast?.raw ?? null,
        prevision: previsionParaVentana(forecast?.periodsToday, { desde, hasta }),
      } as MeteoEscala,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, calzosOn, meteo, windData, forecast]);

  // 2. Mientras dura la escala: cada parte nuevo se añade.
  useEffect(() => {
    if (!activo || !meteo || !windData || calzosOff) return;
    const hora = windData.updatedAt.toISOString();
    if (meteo.observaciones.some((o) => o.hora === hora)) return;

    setTimes((t) => {
      const m = t.meteo as MeteoEscala | undefined;
      if (!m || m.observaciones.some((o) => o.hora === hora)) return t;
      const obs = [...m.observaciones, {
        hora,
        direccion: windData.direction,
        kt: windData.speed,
        racha: windData.gust,
        alerta: getWindAlertLevel(windData.speed, windData.gust),
        raw: windData.rawMetar,
      }].sort((a, b) => a.hora.localeCompare(b.hora));
      return { ...t, meteo: { ...m, observaciones: obs, maximo: peorDelIntervalo(obs) } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, windData, meteo, calzosOff]);

  // 3. Al cerrar: se cierra el intervalo y, SI hay cobertura, se completa con
  //    los partes que falten. Sin cobertura queda lo anotado, que ya sirve.
  useEffect(() => {
    if (!activo || !meteo || !calzosOff || completado.current) return;
    completado.current = true;

    const v = ventanaDeEscala(fecha, times);
    if (!v) return;

    const cerrar = (obs: ObservacionMeteo[], taf: string | null) =>
      setTimes((t) => {
        const m = t.meteo as MeteoEscala | undefined;
        if (!m) return t;
        return { ...t, meteo: {
          ...m,
          ventana: { desde: v.desde.toISOString(), hasta: v.hasta.toISOString() },
          observaciones: obs,
          maximo: peorDelIntervalo(obs),
          taf: m.taf ?? taf,
        } };
      });

    if (!navigator.onLine) { cerrar(meteo.observaciones, meteo.taf); return; }

    supabase.functions
      .invoke('meteo-escala', { body: { desde: v.desde.toISOString() } })
      .then(({ data, error }) => {
        if (error) throw error;
        const cuerpo = (data ?? {}) as { observaciones?: ObsCruda[]; taf?: string | null };
        const delServidor = observacionesDeLaVentana(cuerpo.observaciones ?? [], v);
        // Se mezcla con lo anotado en vivo: el servidor puede no tener un
        // SPECI que sí se vio en su momento, y al revés.
        const porHora = new Map(meteo.observaciones.map((o) => [o.hora, o]));
        delServidor.forEach((o) => porHora.set(o.hora, o));
        cerrar([...porHora.values()].sort((a, b) => a.hora.localeCompare(b.hora)),
               cuerpo.taf ?? null);
      })
      .catch((e) => {
        console.warn('[meteo] no se pudo completar el intervalo:', e);
        cerrar(meteo.observaciones, meteo.taf);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, calzosOff, meteo]);
};
