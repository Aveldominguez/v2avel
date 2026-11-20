# Puerta alternativa en eu3 (puerto 8443)

Para que v2avel conecte desde datos de O2, que bloquea las IP de Cloudflare.
El servidor eu3 (Netcup, Alemania) recoge las peticiones y las reenvía a
Supabase y a la pasarela de fotos. Enhance no se toca: sigue con el 80 y el 443.

---

## Paso 0 — Saber la IP y comprobar que llega

```bash
hostname; curl -4 -s ifconfig.me; echo
```

Apunta esa IP. Luego, **desde el móvil con datos de O2 y Tailscale apagado**,
abre `https://ESA-IP` en el navegador. Da igual que salga un 404 o un aviso de
certificado: lo que importa es que **responda algo**. Si se queda colgado, para
aquí y avísame.

---

## Paso 1 — Token de Cloudflare

Caddy necesita escribir un registro temporal en tu DNS para conseguir el
certificado HTTPS. Es la única forma sin usar el puerto 80, que lo tiene Enhance.

En Cloudflare: **My Profile → API Tokens → Create Token**, plantilla
**Edit zone DNS**, zona `devavel.com`. Copia el token.

> No se lo pases a nadie ni lo pegues en un chat. Sólo va al servidor, en el paso 4.

---

## Paso 2 — Instalar Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

---

## Paso 3 — Añadirle el módulo de Cloudflare

No viene de serie:

```bash
caddy add-package github.com/caddy-dns/cloudflare
```

Si diera error, dímelo y te paso la forma alternativa (descargar el binario ya
montado).

> Aviso: si algún día actualizas Caddy con `apt`, este módulo se pierde y hay
> que volver a añadirlo. Se nota porque el certificado deja de renovarse.

---

## Paso 4 — Guardar el token

```bash
mkdir -p /etc/systemd/system/caddy.service.d
nano /etc/systemd/system/caddy.service.d/token.conf
```

Pega esto dentro, cambiando `PEGA_AQUI_TU_TOKEN` por el del paso 1:

```ini
[Service]
Environment=CF_API_TOKEN=PEGA_AQUI_TU_TOKEN
```

Guardar con `Ctrl+O`, `Enter`, `Ctrl+X`. Y protegerlo:

```bash
chmod 600 /etc/systemd/system/caddy.service.d/token.conf
systemctl daemon-reload
```

---

## Paso 5 — La configuración

```bash
nano /etc/caddy/Caddyfile
```

Borra lo que haya (`Ctrl+K` repetido) y pega esto tal cual:

```caddyfile
{
	# El certificado se consigue por DNS, no por el puerto 80.
	acme_dns cloudflare {env.CF_API_TOKEN}
}

# --- Datos: Supabase ---
api.devavel.com:8443 {
	# Sólo se dejan pasar las rutas que la app usa de verdad. Así esto no
	# es un proxy abierto a cualquier cosa.
	@permitido path /rest/* /auth/* /realtime/* /storage/* /functions/*

	handle @permitido {
		reverse_proxy https://imkvoywmakzwcjvrlrfx.supabase.co {
			header_up Host imkvoywmakzwcjvrlrfx.supabase.co
		}
	}

	handle {
		respond "No" 404
	}
}

# --- Fotos: la pasarela de Cloudflare ---
fotos2.devavel.com:8443 {
	reverse_proxy https://fotos.devavel.com {
		header_up Host fotos.devavel.com
	}
}
```

---

## Paso 6 — Abrir el puerto

```bash
ufw allow 8443/tcp
```

---

## Paso 7 — Los registros DNS

En Cloudflare, zona `devavel.com`, dos registros **A** apuntando a la IP del
paso 0:

| Nombre   | Tipo | Valor        | Proxy status      |
|----------|------|--------------|-------------------|
| `api`    | A    | (IP de eu3)  | **DNS only (gris)** |
| `fotos2` | A    | (IP de eu3)  | **DNS only (gris)** |

> La nube **gris** es lo más importante de toda la guía. En naranja, el tráfico
> vuelve a pasar por Cloudflare y no habremos arreglado nada.

---

## Paso 8 — Arrancar y comprobar

```bash
systemctl restart caddy
sleep 20
systemctl status caddy --no-pager | head -20
```

Y la prueba de fuego, desde el propio servidor:

```bash
curl -sI https://api.devavel.com:8443/rest/v1/ | head -3
```

Un **401** es éxito: significa que llegó a Supabase y Supabase pidió
credenciales. Un error de certificado o de conexión, no.

Si algo falla:

```bash
journalctl -u caddy -n 50 --no-pager
```

---

## Paso 9 — La prueba que de verdad cuenta

Desde el **móvil, con datos de O2 y Tailscale apagado**, abre:

```
https://api.devavel.com:8443/rest/v1/
```

Si sale algo —aunque sea un mensaje de error de Supabase— **el camino funciona**
y pasamos a la app.

---

## Marcha atrás

Si algo se tuerce, esto lo deja todo como estaba:

```bash
systemctl stop caddy && systemctl disable caddy
ufw delete allow 8443/tcp
```

Enhance y tus webs no se enteran en ningún momento: nunca tocamos el 80 ni el 443.
