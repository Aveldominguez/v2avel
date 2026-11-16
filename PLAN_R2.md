# Fase 2 — Pasar las fotos a Cloudflare R2

Escrito el 16/11/2026, después de bajar Storage de 1.115 MB a 525 MB.

## Dónde estamos ahora

| | Antes | Ahora | Límite |
|---|---|---|---|
| Storage (fotos) | 1.115 MB | **525 MB** | 1 GB |
| Base de datos | 545 MB | **56 MB** | 500 MB |

Estamos a salvo y el aviso del 16 de diciembre queda cubierto. Pero esto es
un respiro, no una solución: cada escala sube fotos nuevas y el cubo vuelve a
subir. Con el ritmo de los últimos meses, volveríamos al límite **en algo
menos de un año**. R2 lo quita de en medio para siempre.

Quedan además **996 fotos en JPEG** y unos 354 MB sin convertir. Ya sabemos
por qué, y no es la compresión: ver la sección siguiente.

## Por qué quedan 354 MB en JPEG (confirmado el 16/11/2026)

No es que esas fotos no compriman: **la seguridad del almacén no deja
sobrescribirlas**. Los permisos de hoy son:

| | Leer | Sobrescribir | Borrar |
|---|---|---|---|
| Un usuario | su carpeta | su carpeta | su carpeta |
| Admin | **todas** | **su carpeta** | todas |

`migrations/20260612113636_...sql:14` ató el UPDATE a
`(storage.foldername(name))[1] = auth.uid()`, y esa misma migración borró
antes todas las políticas de UPDATE que había, la de admin incluida. Existe
política de admin para ver todo y para borrar todo, pero **ninguna para
sobrescribir**.

Por eso la tarjeta «Espacio de las fotos» lista las 1.914 fotos, se las
descarga, las recomprime bien y la subida se rechaza en todas las carpetas
que no son la tuya. Dos pasadas completas dieron 0 adelgazadas.

Lo convertido es tu carpeta (`41778992`): 912 fotos. El resto:

| Carpeta | JPEG | Ocupa |
|---|---|---|
| `f339632e` | 786 | 262 MB |
| `37281564` | 180 | 54 MB |
| `52ddda78` | 15 | 26 MB |
| otras tres | 5 | 12 MB |

Las fotos nuevas de esos agentes ya suben en WebP (hay 6 sueltas entre sus
JPEG), así que la compresión de la app funciona para todos. Lo único
bloqueado es la pasada sobre lo antiguo.

**Decisión: no se parchea.** Añadir un permiso de admin para sobrescribir
ficheros de otros sería dar poder de escritura sobre las fotos de todos para
ahorrar 131 MB. R2 no lo necesita: mover una foto es leerla (admin puede),
escribirla en R2 (allí no hay estas políticas) y borrarla de Supabase (admin
puede). El borrado además libera espacio de verdad, lo que sobrescribir puede
que no haga. Los 354 MB en JPEG se recomprimen al moverlos, dentro del paso 4.

**Pendiente de comprobar:** el panel de Supabase seguía avisando de exceso
después de convertir. La base de datos dice 527 MB. O el contador va con
retraso, o al sobrescribir no se liberó la versión vieja — y en ese caso las
912 conversiones no han ganado nada real y hay que ir a R2 sin esperar.

## Por qué R2 y no otra cosa

- **10 GB gratis** y, sobre todo, **sin coste por descarga**. Las fotos se
  miran mucho (cada vez que se abre una escala), y en otros sitios lo que se
  paga es justo eso.
- Cloudflare ya sirve la app y el dominio. No entra un proveedor nuevo en la
  ecuación, que es una cosa menos que pueda fallar un domingo por la noche.
- Para activarlo suele pedir una tarjeta aunque la factura se quede en 0 €.

## Lo que hay que respetar sí o sí

La regla del proyecto no cambia: **todo dato de una escala se guarda por
`turnaround_id`, funciona aunque la escala sea sólo de salida, y entra en la
protección y en el recuperador.** Las fotos ya cumplen: sus rutas viven en
`times.loadingSheetUrls`, `times.fileUrls` y `times.observationPhotos`, que
están dentro de la red de seguridad. **Cambiar dónde se guardan no puede
romper eso.**

Y una segunda, de la que ya aprendimos con el AC835: las **copias del
histórico apuntan a las mismas rutas**. Cualquier cosa que toque una ruta
tiene que mirar también ahí, o el recuperador acaba restaurando huecos.

## El plan, por orden

### Paso 1 — Que la app sepa leer de los dos sitios (sin mover nada) ✅ HECHO 16/11/2026

Antes de mover una sola foto, `parseStoragePath` y `getSignedUrl`
(`src/utils/storageUrl.ts`) tienen que entender un tercer formato, además de
los dos de ahora (`cubo:ruta` y la URL pública antigua):

```
r2:ruta/del/fichero.webp
```

Mientras no haya nada en R2 esto no cambia nada para nadie. Pero es lo que
permite que la migración vaya **foto a foto** en vez de ser un salto al vacío:
en cualquier momento parte de las fotos pueden estar en un sitio y parte en el
otro, y la app las enseña todas igual.

**Esto se sube y se deja rodando unos días antes de tocar nada más.**

Hecho en `src/utils/storageUrl.ts`:

- `parseStoragePath` entiende ahora `r2:ruta`, y lo mira ANTES que el formato
  `cubo:ruta`, porque si no tomaría «r2» por un cubo de Supabase.
- `getSignedUrl` pide el enlace a la pasarela de R2 cuando la foto está allí.
  La sesión va en la cabecera, nunca en la dirección.
- `buildR2Path()` para escribir esas direcciones, cuando toque.
- `borrarDelAlmacen()`: antes cada pantalla borraba por su cuenta con
  `supabase.storage.from(bucket).remove()`. Con dos almacenes eso fallaría en
  silencio y la foto se quedaría ocupando sitio. Ahora las tres pantallas
  (hoja de carga, ficheros, fotos de observaciones) pasan por una sola puerta.
- Mientras `VITE_R2_BASE_URL` esté vacía, R2 no existe para la app. Hoy no hay
  ninguna foto con dirección `r2:`, así que no cambia nada para nadie.

Comprobado en el navegador contra la base de datos de verdad: una escala con
5 hojas de carga las sigue enseñando las 5, y los tres formatos de dirección
se reconocen (10 pruebas nuevas, 580 en total).

**Hallazgo de paso:** la escala TO4634 apunta a una foto que ya no está en el
servidor. Son referencias colgadas, lo contrario de los ficheros huérfanos.
El paso 4 tiene que tolerarlas: al mover, una foto que no existe se salta y
se deja anotada, nunca se da la migración por fallida.

### Paso 2 — El Worker que sirve las fotos

Un Worker de Cloudflare delante del cubo de R2, en `fotos.devavel.com`:

- Comprueba la sesión de Supabase (el mismo JWT que ya usa la app) antes de
  servir nada. **Las fotos no pueden quedar públicas**: hay matrículas,
  nombres de tripulación y hojas de carga.
- Devuelve el fichero con su `content-type` y una caché larga.

El equivalente de las URL firmadas de Supabase, que es lo que la app ya
espera.

### Paso 3 — Subir a R2 lo nuevo

Cambiar `useBackgroundUpload` para que lo nuevo vaya a R2 y se guarde como
`r2:...`. Supabase deja de crecer desde ese mismo día.

Aquí hay un detalle que no se puede pasar por alto: **si R2 falla, la foto se
sube a Supabase como hasta ahora**. Una foto que no se sube es una foto que se
pierde, y eso no se arregla luego.

### Paso 4 — Mover lo viejo

Igual que la tarjeta «Espacio de las fotos», pero copiando a R2 en vez de
recomprimiendo. Por tandas, parable, y con el mismo orden de seguridad:

1. Copiar la foto a R2.
2. Comprobar que se lee.
3. Actualizar la ruta **en la escala y en todas las copias del histórico que
   la mencionen**.
4. Sólo entonces borrarla de Supabase.

Si algo falla en medio, la foto sigue en los dos sitios y se ve igual. Nunca
se borra antes de confirmar.

### Paso 5 — Dejarlo cubierto

- Un aviso en el panel de administración cuando Storage pase del 70%, para
  enterarnos por la app y no por un correo de Supabase.
- La función `limpiar_programacion_vieja()` ya está en la base de datos; falta
  dejarla programada para que corra sola una vez al mes.

## Si hay prisa

Los pasos 1, 2 y 3 ya evitan que el problema vuelva, porque detienen el
crecimiento. El paso 4 (mover las 1.900 fotos viejas) se puede hacer con
calma, o no hacerse nunca si 525 MB se quedan quietos.

## Lo que queda pendiente de antes

- Cancelar la suscripción de Lovable.
- Rotar credenciales: contraseña de la base de datos, `service_role` y la de
  ARION.
- Borrar el usuario de pruebas `pruebas@devavel.com`.
