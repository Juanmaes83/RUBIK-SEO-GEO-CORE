# Handoff — extracción de Rubik SEO/GEO Core

**Última sesión:** 25/09/2026 · **Rama:** `feat/seo-geo-core-extraction` (desde `main@c384767`) · **Fuente:** `WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a` (solo lectura)

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

## Sesión 2 — revisión documental y OpenSEO (commit `8486054`)

1. **README completado:** propósito y límites, estado real, instalación (paquete no publicado), validación y cómo retomar.
2. **Mapa de autoridad** en `docs/README.md`: un documento por tema y procedimiento de sincronización manual con upstream (D-10).
3. **OpenSEO** (`docs/integrations/OPENSEO.md`), a partir del código de `Juanmaes83/open-seo@0ffff93`, idéntico al upstream `every-app/open-seo`:
   - OpenSEO expone MCP en `/mcp` (Streamable HTTP, OAuth / API key `oseo_` / Cloudflare Access) y `GET /api/health`;
   - **no existe ninguna acción HTTP `crawl`**, y la conectividad actual del Core (`GET` a la raíz) daría un falso `CONNECTED`;
   - se registra como D-09, sin tocar el código;
   - diseño recomendado: puente server-side que actúa como cliente MCP;
   - ROADMAP **CORE-7.1**, bloqueado por CORE-2, CORE-3 y la Platform Layer.
4. **Gate documental** `scripts/check-docs.cjs` (`npm run check:docs`), incluido en `verify` y en la CI. Se comprobó con una prueba negativa que detecta enlaces rotos.
5. Referencias a OpenSEO corregidas en `ARCHITECTURE.md` y `HOST-INTEGRATION-CONTRACT.md` (ya no aparece como integración operativa).

## Sesión 3 — CORE-1 publicado (25/09/2026)

1. Añadidas las referencias de coste DataForSEO por herramienta en `integrations/OPENSEO.md` §6. Lighthouse verificado en el código: con `runLighthouse:true` hace hasta 20 POST facturados por audit (10 páginas × móvil/escritorio). El crawl propio no tiene coste. No se ejecutó ninguna consulta de pago.
2. Rama publicada y [PR #1](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/1) abierto contra `main`.
3. `core-ci` en verde sobre `8486054` ([run 36101061645](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36101061645)): Node 20.20.2 y 22.23.2, syntax 26 ficheros, docs 20 md, tests 73/73, preview fail-closed y producción sin base URL rechazada.

## Sesión 4 — revisión de seguridad del PR #1 (25/09/2026)

Estado revisado: HEAD `007bb2e` con `core-ci` en verde ([run 36101151706](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36101151706): Node 20.20.2 y 22.23.2, 73/73). Historial: `8486054` también en verde ([run 36101061645](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36101061645)).

1. **Path traversal confirmado y corregido (D-11).**
   - Causa: `pathOf` en release-b conserva los segmentos `..`, así que una página `path:'/../../escape/'` pasa `canPublish`. Con el código de `007bb2e`, `materializeSite` escribía `<outputDir>/../../escape/index.html`. Reproducido en un sandbox temporal.
   - Corrección en `src/rubik-seo-geo-materialize.cjs`: `routeFile` rechaza rutas que no empiezan por `/`, NUL, `\`, `:`, segmentos `.`/`..` (también codificados con %) y separadores codificados. Además comprueba que el fichero queda dentro de `outputDir`. `writeFile` vuelve a comprobarlo, y todas las rutas se validan **antes de la primera escritura** (sin salida parcial).
2. **Prueba** `tests/core-materialize-path-safety.test.cjs`: 4 tests. Con el código antiguo fallan 4/4 y con la corrección pasan 4/4.
3. **Paridad Restaurant intacta:** 0 diferencias contra el script fuente con el `index.html` real. `npm run verify` da 77/77 en local.
4. El repo fuente tiene el mismo fallo. No se ha modificado (es solo lectura); queda anotado en ROADMAP §4.

## Pendiente

- PR #1: comprobar la CI del commit D-11, hacer la revisión humana y el merge (decisión del propietario). No se ha hecho merge ni deploy.
- Avisar al propietario del repo fuente del path traversal equivalente (D-11).
- D-07: acoplamientos del host dentro del Core (CORE-2, CORE-3).
- D-09: contrato OpenSEO incompatible (CORE-3 → CORE-7.1).
- Restaurantes sigue usando su propia copia (CORE-4).

## Siguiente tarea concreta

**CORE-1:** revisión humana del [PR #1](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/1) y merge por el propietario.

Después, **CORE-2** (bootstrap navegador fuera de `core.js`) y **CORE-3** (interfaz de proveedor inyectable + health check honesto), que desbloquean CORE-7.1.

## Cómo retomar

```bash
git switch feat/seo-geo-core-extraction
npm run verify
```

Leer `docs/README.md` → `ROADMAP.md` §3–§4 → `DECISIONS.md`.
