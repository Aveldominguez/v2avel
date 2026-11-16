/**
 * Firmas de los enlaces a las fotos.
 *
 * Una foto no se puede servir pidiendo la sesión del agente, porque un
 * `<img src="...">` no sabe mandar cabeceras. La solución de siempre, y la
 * que ya usa Supabase: la app pide un enlace con su sesión, la pasarela
 * devuelve un enlace firmado y de corta vida, y ese enlace es el que va en
 * la imagen. Quien no tenga la firma no puede inventársela.
 */

/** Lo que se firma. El separador no puede aparecer en una ruta real. */
export const canonica = (ruta: string, exp: number): string => `${ruta}|${exp}`;

const aHex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const clave = async (secreto: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );

export async function firmar(ruta: string, exp: number, secreto: string): Promise<string> {
  const k = await clave(secreto);
  const f = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(canonica(ruta, exp)));
  return aHex(f);
}

/** Comparación en tiempo constante: comparar con === filtra el secreto poco a poco. */
export const mismaFirma = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export async function verificar(
  ruta: string, exp: number, firma: string, secreto: string, ahora = Date.now(),
): Promise<boolean> {
  if (!Number.isFinite(exp) || exp * 1000 <= ahora) return false;  // caducado
  if (!rutaSegura(ruta)) return false;
  return mismaFirma(firma, await firmar(ruta, exp, secreto));
}

/**
 * Una ruta que se sale de su sitio.
 *
 * `..` permitiría pedir ficheros de otra carpeta, que es justo lo que separa
 * las fotos de un agente de las de otro. Se rechaza antes de tocar el cubo.
 */
export function rutaSegura(ruta: string): boolean {
  if (!ruta || ruta.length > 1024) return false;
  if (ruta.startsWith('/') || ruta.includes('//')) return false;
  if (ruta.split('/').some((t) => t === '..' || t === '.' || t === '')) return false;
  if (ruta.includes('|') || /[\u0000-\u001f]/.test(ruta)) return false;
  return true;
}

/** De quién es la foto: las rutas son «<id de usuario>/<fichero>». */
export function duenoDe(ruta: string): string | null {
  if (!rutaSegura(ruta)) return null;
  const partes = ruta.split('/');
  return partes.length >= 2 ? partes[0] : null;
}

/**
 * Quién puede tocar una foto. Es copia exacta de lo que ya hace Supabase:
 * cada agente, lo suyo; el administrador, todo. Nada de abrir la mano al
 * mudarse de almacén: una migración no es el momento de cambiar permisos.
 */
export const puedeTocar = (ruta: string, uid: string, esAdmin: boolean): boolean => {
  const dueno = duenoDe(ruta);
  if (!dueno) return false;
  return esAdmin || dueno === uid;
};
