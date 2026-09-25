# Documentación — mapa de autoridad

Cada tema tiene **un solo documento con autoridad**. Si dos documentos chocan, manda el de la columna «Autoridad».

| Tema | Autoridad | Complementos |
|---|---|---|
| Estado, bloqueos y siguiente tarea | [`ROADMAP.md`](ROADMAP.md) | [`HANDOFF.md`](HANDOFF.md) (resumen de la última sesión) |
| Propósito, instalación y validación | [`../README.md`](../README.md) | — |
| Fronteras Core / adapters / host | [`ARCHITECTURE.md`](ARCHITECTURE.md) | — |
| Qué debe aportar un producto anfitrión | [`HOST-INTEGRATION-CONTRACT.md`](HOST-INTEGRATION-CONTRACT.md) | — |
| Por qué el código es como es (ajustes y deudas) | [`DECISIONS.md`](DECISIONS.md) | — |
| De dónde viene cada fichero | [`PROVENANCE.md`](PROVENANCE.md) | `../SCULPT-SOURCE.md` (bootstrap histórico) |
| Contrato de producto SEO/GEO (fórmulas, AUTO/CUSTOM, gates, GEO) | [`upstream/`](upstream/README.md) | Los estados de esos documentos no son normativos |
| Integraciones con proveedores | [`integrations/`](integrations/) (p. ej. [`OPENSEO.md`](integrations/OPENSEO.md)) | `upstream/SEO-GEO-INTEGRATIONS.md` (contrato heredado) |

## Sincronización con upstream

`docs/upstream/` es una **copia congelada** de `WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a`. No se sincroniza automáticamente.

1. Desde la extracción, el Core es la autoridad del contrato SEO/GEO. Los cambios de contrato se hacen **aquí**, con una entrada en `DECISIONS.md`.
2. Si el repositorio fuente modifica un contrato `docs/SEO-GEO-*.md` después de `388e48a`, el cambio se trae a mano:
   - comparar con `git -C <fuente> diff 388e48a <nuevo> -- docs/SEO-GEO-*.md`;
   - copiar el contenido;
   - volver a aplicar solo las marcas `[Core·D-06]` de estado;
   - actualizar los blob ids y el commit en `PROVENANCE.md`.
3. Hasta CORE-4, el código SEO/GEO del host sigue en su repositorio. Cualquier cambio allí en `rubik-seo-geo-*.js` debe traerse con el mismo procedimiento y con el golden de paridad (`scripts/generate-source-golden.cjs`).

## Cómo retomar el trabajo (persona o IA)

1. Leer, en este orden: `ROADMAP.md` §3–§4 (qué sigue y qué bloquea), `HANDOFF.md` y `DECISIONS.md`.
2. Ejecutar `npm run verify`. Debe terminar sin errores antes de tocar nada.
3. Trabajar en una rama nueva desde la rama vigente y no modificar el repositorio fuente.
4. Al cerrar:
   - actualizar el estado **solo** en `ROADMAP.md`;
   - añadir las decisiones con evidencia en `DECISIONS.md`;
   - rehacer `HANDOFF.md`;
   - no marcar nada como ✅ sin un test o un comando que lo demuestre.

`npm run check:docs` valida los enlaces relativos, la presencia de los documentos obligatorios y el encoding.
