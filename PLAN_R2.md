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

Quedan además **912 fotos** sin convertir y unos 131 MB por ganar. Antes de
nada conviene saber por qué: puede que la conversión se parara a medias, o
que esas fotos no mejorasen lo suficiente. Esta consulta lo dice (sólo lee):

```sql
SELECT bucket_id AS cubo, metadata->>'mimetype' AS tipo, count(*),
       pg_size_pretty(sum((metadata->>'size')::bigint)) AS ocupa
  FROM storage.objects GROUP BY 1,2 ORDER BY 1,2;
```

Si siguen saliendo como `image/jpeg`, basta con volver a pulsar **Analizar** y
**Empezar** en la tarjeta «Espacio de las fotos»: se salta solas las ya hechas.

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

### Paso 1 — Que la app sepa leer de los dos sitios (sin mover nada)

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
