# Handoff — extracción de Rubik SEO/GEO Core

**Última sesión:** 24/09/2026 · **Rama:** `feat/seo-geo-core-extraction` (desde `main@c384767`) · **Fuente:** `WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a` (solo lectura)

> Este documento resume la última sesión. El estado con autoridad está en [`ROADMAP.md`](ROADMAP.md).

## Sesión 1 — extracción (commits `b19e3a7`, `d331a2c`, `839f26f`)

1. **Fuente verificado:** PRs #44–#57 en estado MERGED. `origin/main@388e48a` es el estado vigente. Se leyó con `git show`/`git archive`, sin tocar el checkout del fuente.
2. **Extracción:**
   - 7 módulos Core copiados sin cambios (blob idéntico);
   - materializer dividido en `src/` (Core) y `hosts/restaurant/` (HOME premium);
   - tests A–E y Hardening A/B adaptados a fixtures.
3. **Paridad Restaurant:** blob ids idénticos, materialización con 0 diferencias y test `core-source-parity` contra el golden de los módulos fuente.
4. **Independencia:** 73/73 en Node 24 y en Node 20, también desde un clon limpio.
5. **CI** `core-ci.yml` y documentación base: README, `ARCHITECTURE`, `HOST-INTEGRATION-CONTRACT`, `ROADMAP`, `DECISIONS` D-01…D-08, `PROVENANCE` y `upstream/`.

## Sesión 2 — revisión documental y OpenSEO (sin commit todavía)

1. **README completado:** propósito y límites, estado real (rama sin publicar, CI no ejecutada en GitHub), instalación (paquete no publicado), validación y cómo retomar.
2. **Mapa de autoridad** en `docs/README.md`: un documento por tema y procedimiento de sincronización manual con upstream (D-10).
3. **OpenSEO** (`docs/integrations/OPENSEO.md`), a partir del código de `Juanmaes83/open-seo@0ffff93`, idéntico al upstream `every-app/open-seo`:
   - OpenSEO expone MCP en `/mcp` (Streamable HTTP, OAuth / API key `oseo_` / Cloudflare Access) y `GET /api/health`;
   - **no existe ninguna acción HTTP `crawl`**, y la conectividad actual del Core (`GET` a la raíz) daría un falso `CONNECTED`;
   - se registra como D-09, sin tocar el código;
   - diseño recomendado: puente server-side que actúa como cliente MCP;
   - ROADMAP **CORE-7.1**, bloqueado por CORE-2, CORE-3 y la Platform Layer.
4. **Gate documental** `scripts/check-docs.cjs` (`npm run check:docs`), incluido en `verify` y en la CI. Se comprobó con una prueba negativa que detecta enlaces rotos.
5. Referencias a OpenSEO corregidas en `ARCHITECTURE.md` y `HOST-INTEGRATION-CONTRACT.md` (ya no aparece como integración operativa).

## Pendiente

- Commit de la sesión 2, push y PR (necesitan aprobación del propietario). **La CI no se ha ejecutado nunca en GitHub.**
- D-07: acoplamientos del host dentro del Core (CORE-2, CORE-3).
- D-09: contrato OpenSEO incompatible (CORE-3 → CORE-7.1).
- Restaurantes sigue usando su propia copia (CORE-4).

## Siguiente tarea concreta

**CORE-1:** con aprobación del propietario:
1. hacer commit de la sesión 2 en esta rama;
2. publicar la rama y abrir el PR contra `main`;
3. confirmar que `core-ci` sale en verde en Node 20 y 22;
4. revisión humana y merge.

Después, **CORE-2** (bootstrap navegador fuera de `core.js`) y **CORE-3** (interfaz de proveedor inyectable + health check honesto), que desbloquean CORE-7.1.

## Cómo retomar

```bash
git switch feat/seo-geo-core-extraction
npm run verify
```

Leer `docs/README.md` → `ROADMAP.md` §3–§4 → `DECISIONS.md`.
