# Handoff — extracción de Rubik SEO/GEO Core

**Última sesión:** 25/09/2026 · **Rama:** `feat/core-3-explicit-injection` (desde `main@f2f333c`) · **Alcance:** solo `Juanmaes83/RUBIK-SEO-GEO-CORE` (D-12)

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

## Sesión 5 — seguimiento de la revisión D-11 (25/09/2026)

1. **Contención física:** la materialización ya no escribe a través de enlaces simbólicos ni junctions que existan dentro de `outputDir`. Se comprueba antes de la primera escritura y en cada escritura, también para los ficheros fijos. Reproducido y corregido.
2. **Falsos positivos léxicos:** `isInside` ya no rechaza `/..foo/` ni `/.../`.
3. **Pruebas:** 13 en `core-materialize-path-safety`. Con el código de `ca33d7e` fallan las 6 regresiones nuevas; con la corrección pasan 11 y 2 se omiten en Windows (symlinks de fichero), pruebas que sí se ejecutan en la CI de Linux. `npm run verify` da 86 (84 pasan, 2 se omiten). Paridad 0 diferencias, golden sin cambios.

## Sesión 6 — cierre de CORE-1 (25/09/2026)

1. PR #1 se mergeó en `main` mediante `995207f38080cf319d4246a531895c85bc10759e`.
2. El HEAD `44b1f5c` pasó `core-ci` en Node 20.20.2 y 22.23.2: 86/86, 0 omitidos en Linux (run 36103571133).
3. CORE-1/EX-1…EX-8 quedan cerradas, incluido D-11/D-11b. No hubo deploy.
4. El único repositorio de trabajo es RUBIK-SEO-GEO-CORE. No se accede ni modifica ningún otro repositorio.
5. CORE-2 requiere cambios de host y queda fuera de alcance. CORE-3 pasa a ser la siguiente fase Core-only, según ROADMAP.

## Sesión 7 — CORE-3 (25/09/2026)

**Punto de partida:** `main@995207f` verificado; `npm run verify` daba 86 (84 pasan, 2 se omiten en Windows). Durante la sesión se fusionó el PR #2 del propietario (`main@f2f333c`) y la rama se rebaseó sobre él, conservando su redacción.

1. **Secuencia (D-12):** CORE-2 bloqueado por alcance (no iniciado); CORE-3 como fase Core-only.
2. **Release C (D-13):**
   - `intelligence.pages(config,{releaseB})` y `entityGraph(config,{releaseB})`, sin leer `globalThis`;
   - sin dependencia inyectada devuelve una lista vacía nueva; si la dependencia inyectada no tiene `registry()`, lanza `TypeError`.
3. **Release E (D-13):**
   - `{adapter}` (el descriptor de `core.adapter(config)`) en los registros de presencia y cita;
   - `vertical` y `entityType` se derivan del adapter; sin él quedan en `UNKNOWN`, nunca `restaurant`;
   - un vertical que contradice el adapter lanza error;
   - Release E sigue sin dependencias de módulo.
4. **OpenSEO (D-14):**
   - `connectivity()` solo consulta `GET <endpoint>/api/health`;
   - `ok` ⇒ `NOT_CONNECTED` (autorización MCP no verificada); `issues` ⇒ `ERROR` con los nombres de los checks; cualquier otra respuesta ⇒ `ERROR`;
   - nunca devuelve `CONNECTED`;
   - mocks locales, sin red ni credenciales.
5. **Page Registry (D-15):**
   - `unsafePathReason`, con las mismas reglas que el materializer;
   - `createPage` y `migratePath` rechazan rutas inseguras sin mutar el estado;
   - una ruta insegura ya guardada genera el bloqueo `unsafe-path`;
   - `/..foo/`, `/.../` y `/a..b/` siguen siendo válidas; el materializer (D-11) se mantiene como defensa en profundidad.
6. **Pruebas:**
   - `tests/core-3-explicit-injection.test.cjs`: 27 tests, 25 de los cuales fallan con el `src/` de `main`;
   - se adaptan 2 e2e de materialización y 1 test de Release C;
   - `npm run verify` da 113 (111 pasan, 2 se omiten en Windows); golden y fixtures sin cambios.

## Pendiente

- [PR #3](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/3): CI Node 20/22, revisión humana y merge (decisión del propietario). Sin merge ni deploy.
- CORE-2 y CORE-4 fuera de alcance. Cuando un host adopte el Core, deberá pasar `{releaseB}` y `{adapter}` (D-13) y tener en cuenta que `connectivity()` ya no devuelve `CONNECTED` (D-14).
- CORE-7.1: puente MCP server-side. `crawl()` sigue con el contrato heredado (D-09).
- `entityGraph().products` sigue leyendo `config.dishes`, forma de Restaurant. No estaba en el alcance de CORE-3: queda como observación.
- Release E externo sigue pendiente de Platform Layer. No se simulan conexiones, citas ni métricas.

## Cómo retomar

1. Leer `docs/README.md`, `ROADMAP.md` §3–§4, `HANDOFF.md` y las decisiones pertinentes.
2. Ejecutar `npm run verify` antes de cambiar nada.
3. Crear una rama nueva desde `main` en este repositorio; no acceder ni modificar otros repositorios.
