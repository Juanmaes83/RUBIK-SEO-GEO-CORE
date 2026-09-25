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

## Contratos upstream y alcance de repositorio

`docs/upstream/` es una copia histórica congelada usada para procedencia del Core; no se sincroniza ni contrasta con repositorios externos. No acceder, clonar, leer ni modificar otros repositorios.

Los cambios de contrato se deciden y documentan aquí, con pruebas y una entrada en `DECISIONS.md`. El estado operativo vive solo en `ROADMAP.md`.

## Cómo retomar el trabajo (persona o IA)

1. Leer, en este orden: `ROADMAP.md` §3–§4 (qué sigue y qué bloquea), `HANDOFF.md` y `DECISIONS.md`.
2. Ejecutar `npm run verify`. Debe terminar sin errores antes de tocar nada.
3. Trabajar en una rama nueva de este repositorio. No acceder ni modificar otros repositorios.
4. Al cerrar:
   - actualizar el estado **solo** en `ROADMAP.md`;
   - añadir las decisiones con evidencia en `DECISIONS.md`;
   - rehacer `HANDOFF.md`;
   - no marcar nada como ✅ sin un test o un comando que lo demuestre.

`npm run check:docs` valida los enlaces relativos, la presencia de los documentos obligatorios y el encoding.
