# Integraciones SEO/GEO

## OpenSEO

Configura un endpoint self hosted (`OPENSEO_ENDPOINT`) en entorno seguro. El Studio permite comprobar conectividad y lanzar refresh manual. Un endpoint vacío es `NOT_CONFIGURED`; un endpoint inaccesible es `ERROR`, nunca PASS. El cliente sólo acepta endpoints HTTPS sin usuario/contraseña embebidos, query ni fragment, para evitar que credenciales o tokens terminen persistidos en Project State.

## Google Search Console

La autorización OAuth y el refresh token requieren backend/serverless. No se guardan en HTML, localStorage ni Project State público. Sin autorización se muestra `NOT_CONNECTED` y el Studio invita a conectar para ver datos reales. Los periodos soportados son 7d, 28d y 90d.

## DataForSEO

Es un power-up opcional. `DATAFORSEO_LOGIN` y `DATAFORSEO_PASSWORD` sólo deben existir como variables server-side. Las consultas son manuales, cacheadas y muestran aviso de coste; sin cliente autorizado el estado es `NOT_MEASURED` y volumen/dificultad son `null`. Antes de cada llamada manual que pueda generar coste, el Studio exige confirmación explícita del usuario.

## Operación

Los refresh no se ejecutan durante cada render. Los errores se conservan como estado `ERROR`/`STALE`, con `lastSyncAt`, `lastSuccessfulSyncAt` y mensaje acotado. Los providers reciben únicamente URLs públicas de producción y datos necesarios para la operación explícita.

