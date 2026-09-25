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

## Sesión 7 — evaluación del ecosistema SEO/GEO (25/09/2026)

1. A petición y con autorización expresa del usuario, se revisaron en modo lectura los README de repositorios SEO/GEO de su cuenta y la documentación del Core. No fue una auditoría de código, licencias, seguridad ni mantenimiento.
2. No se accedió a WEB-RESTAURACI-N-PREMIUM-DINAMICA ni se modificó ningún repositorio externo.
3. La decisión quedó registrada en [`ECOSYSTEM-REFERENCES.md`](ECOSYSTEM-REFERENCES.md): CORE-3 sigue primero; `open-seo` es candidato de integración futura y sigue sujeto a contrato inyectable, mocks y Platform Layer; crawlers y medición son proveedores intercambiables; skills y extensiones son referencias de workflow/QA, no dependencias del Core.
4. Se actualizó [`docs/README.md`](README.md) y [`ROADMAP.md`](ROADMAP.md) con el mapa de autoridad, la decisión y el límite de acceso: los cambios siempre se hacen en el Core; lecturas externas solo con autorización específica; el repositorio de Restaurantes no se accede nunca.

## Pendiente

- CORE-3: inyección explícita de dependencias, vertical activo en Release E, health honesto de OpenSEO según el contrato ya documentado y validación temprana de rutas del Page Registry.
- CORE-2 y CORE-4 quedan fuera de alcance porque exigen cambios o validación en un host/repo externo.
- Release E externo sigue pendiente de Platform Layer; no se simulan conexiones, citas ni métricas.

## Cómo retomar

1. Leer `docs/README.md`, `ROADMAP.md` §3–§4, `HANDOFF.md` y las decisiones pertinentes.
2. Ejecutar `npm run verify` antes de cambiar nada.
3. Crear una rama nueva desde `main` en este repositorio; no acceder ni modificar otros repositorios.
