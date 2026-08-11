import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { syncStatusBarFromHeader } from '@/utils/themeColor';

/**
 * Mantiene la barra de estado del móvil del mismo color que la cabecera que
 * hay en pantalla.
 *
 * No vale fijar un color por tema: dentro de un mismo estilo conviven
 * pantallas con cabecera blanca (Equipos, Home) y otras con cabecera azul
 * marino (la escala), así que el color se toma de la cabecera real cada vez
 * que se cambia de pantalla o de estilo.
 */
export function useStatusBarColor() {
  const location = useLocation();

  useEffect(() => {
    // Dos pasadas: una inmediata y otra tras pintar, porque al cambiar de ruta
    // la cabecera nueva puede no estar todavía en el DOM.
    syncStatusBarFromHeader();
    const raf = requestAnimationFrame(() => syncStatusBarFromHeader());
    const t = setTimeout(() => syncStatusBarFromHeader(), 250);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [location.pathname]);

  useEffect(() => {
    const onThemeChange = () => {
      // El cambio de tema reescribe variables CSS; se lee tras el repintado.
      requestAnimationFrame(() => syncStatusBarFromHeader());
    };
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, []);
}
