import { useEffect, useState } from 'react';
import { buscarAeropuerto } from '@/data/aeropuertos';

/**
 * "Madrid → Turín" debajo de "MAD → TRN", en la lista de escalas.
 *
 * Se carga sin prisa y sin bloquear nada: si la lista de aeropuertos todavía
 * no está en el móvil, la línea simplemente no aparece y la escala se ve
 * igual que siempre. Nunca retrasa la home.
 */
export const CiudadesDeRuta: React.FC<{ origen?: string; destino?: string }> = ({ origen, destino }) => {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [a, b] = await Promise.all([buscarAeropuerto(origen), buscarAeropuerto(destino)]);
      if (!vivo) return;
      const ciudad = (x: typeof a, codigo?: string) => x?.ciudad || x?.nombre || codigo || '';
      const o = ciudad(a, origen);
      const d = ciudad(b, destino);
      // Si no se conoce ninguno de los dos no se pinta nada: repetir los
      // códigos que ya están justo encima no aporta.
      setTexto(a || b ? `${o} → ${d}` : '');
    })();
    return () => { vivo = false; };
  }, [origen, destino]);

  if (!texto) return null;
  return <small className="aero-recent-ciudades">{texto}</small>;
};

export default CiudadesDeRuta;
