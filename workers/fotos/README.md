# Pasarela de fotos (Cloudflare Worker)

Sirve el cubo **v2avel-fotos** de R2. El cubo es privado: nada sale sin que
se compruebe antes la sesión del agente contra Supabase.

## Desplegarlo (lo lanzas tú, desde tu terminal)

Estando en la carpeta `workers/fotos`:

**1. Entrar en Cloudflare.** Abre el navegador y te pide confirmar:

    npx wrangler login

**2. Crear la clave de firma.** Es la que hace que un enlace a una foto no se
pueda inventar. Se genera sola y se guarda en Cloudflare; **no se escribe en
ningún fichero ni hace falta que nadie la vea**:

    openssl rand -hex 32 | npx wrangler secret put FIRMA_SECRETO

**3. Publicar:**

    npx wrangler deploy

En este paso Cloudflare crea también el subdominio `fotos.devavel.com` y su
registro DNS, porque está pedido en `wrangler.toml`.

**4. Comprobar que está viva:**

    curl https://fotos.devavel.com/salud

Tiene que responder `{"ok":true}`.

## Lo que NO hay que hacer

- **No pongas el cubo en público** ni actives su «Public Development URL».
  En una hoja de carga hay nombres de tripulación, matrículas y pesos. Todo
  pasa por aquí, que es quien comprueba la sesión.
- **No metas `FIRMA_SECRETO` en `wrangler.toml`.** Ese fichero va al
  repositorio; los secretos, no.

## Las puertas

| Puerta | Quién puede | Para qué |
|---|---|---|
| `POST /firmar` | agente con sesión | pedir un enlace temporal a una foto suya |
| `GET /f/<ruta>` | cualquiera con el enlace firmado y sin caducar | ver la foto |
| `PUT /f/<ruta>` | agente con sesión | subir (paso 3) |
| `POST /borrar` | agente con sesión | borrar (paso 4) |
| `GET /salud` | cualquiera | comprobar que responde |

Los permisos son **copia exacta de los de Supabase**: cada agente toca lo
suyo y el administrador toca todo. Una mudanza de almacén no es el momento
de cambiar quién ve qué.

Los enlaces duran 8 horas, un turno completo, igual que los de Supabase: una
escala se trabaja durante horas y con una hora las miniaturas ya cargadas
dejaban de poder abrirse a media escala.

## Después de desplegar

En el proyecto principal hay que poner la variable y volver a publicar la app:

    VITE_R2_BASE_URL=https://fotos.devavel.com

Hasta que esa variable exista, la app ignora R2 por completo.
