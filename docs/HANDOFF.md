# Handoff — extracción de Rubik SEO/GEO Core

**Última sesión:** 25/09/2026 · **Estado:** CORE-7.1 cerrado en `main@bc271fe` (PR #11) · **Siguiente:** CORE-8 (SEO off-page Core-only) · **Alcance:** solo `Juanmaes83/RUBIK-SEO-GEO-CORE` (D-12)

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


## Sesión 9 — cierre CORE-3 y seguimiento documental (25/09/2026)

1. PR #3 se fusionó en `main` mediante `b38225320f4b3dde3f2820f2935603adea33c8dc`. CORE-3 queda cerrado; CI Node 20/22 verde, 113/113 y 0 omitidos (run 36106021399).
2. La evaluación SEO/GEO autorizada se registra en [`ECOSYSTEM-REFERENCES.md`](ECOSYSTEM-REFERENCES.md); no añade dependencias al Core ni altera el límite de repositorio.
3. **Microcopy OpenSEO aplazada (D-16):** un mensaje positivo de conectividad puede sugerir que la autorización MCP está verificada. El código devuelve `NOT_CONNECTED` y `authorization: NOT_VERIFIED`; no cambiar comportamiento ahora. Corregir el texto en una fase posterior para reflejar que la autorización está pendiente de verificación.
4. La dependencia residual `entityGraph().products` → `config.dishes` sigue anotada para una fase Core-only posterior.


## Sesión 10 — CORE-3.1 (25/09/2026)

**Rama:** `feat/core-3-1-entity-products` desde `main@345cef0`. Estado inicial: `npm run verify` daba 113 (111 pasan, 2 se omiten en Windows).

1. **Contrato detectado:** los 7 adapters exponen `source(config).offerings`. `restaurant` los toma de `dishes`; los 6 genéricos, del primer array presente entre `services`, `products` y `offerings`.
2. **Cambio (D-17):** `intelligence.products(config,{core})` y `entityGraph(config,{releaseB,core})`. Ya no se lee `config.dishes` en `entityGraph`. Sin `core` inyectado, lista vacía nueva; un `core` sin `source()` lanza `TypeError`.
3. **Compatibilidad:** con LÚMINA coincide con la proyección anterior. Los valores privados ya no se exponen y un `origin` ausente pasa a `''`.
4. **Pruebas:** `tests/core-3-1-entity-products.test.cjs` (16). Contra el `intelligence` de `main` fallan 15; la que pasa (entradas `null` ⇒ `TypeError`) lo hace porque en `main` `products()` no existe. `npm run verify` da 129 (127 pasan, 2 se omiten en Windows). Golden idéntico (blob `5aa93a3`).
5. **Deuda restante:** `geoReadiness()` sigue leyendo `config.dishes`; `entityGraph().business/location` no usan las alternativas genéricas. D-16 (microcopy OpenSEO) sigue aplazada, sin cambios.

**Cierre:** CORE-3.1 fusionado en `main` mediante [PR #6](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/6) (merge `0be47522148e7fb33b6e0a6177cd8a219e011dc5`). CI Node 20/22 verde, 129/129, 0 omitidos ([run 36108440350](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36108440350)).

## Sesión 11 — CORE-3.2 (25/09/2026)

**Rama:** `feat/core-3-2-neutral-intelligence` desde `main@0be4752` (contiene el merge del PR #6). Estado inicial: `npm run verify` daba 129 (127 pasan, 2 se omiten en Windows).

1. **Contrato observado:** `source(config)` de los 7 adapters expone:
   - `name`: `restaurant` usa `brand.name`; los genéricos, `brand.name` o `business.name`;
   - `address`: claves de schema.org. `restaurant` toma `modules.location.address`; los genéricos, `modules.location.address` o `business.address`. En ambos casos `visit.address` sirve como calle heredada;
   - `city` y `offerings`;
   - todo con valores visibles vía `pub()`.
2. **Cambio (D-18):**
   - `entityGraph(config,{releaseB,core})`: `business` = `source.name`, `location` = copia de `source.address`, `products` = `source.offerings`, `pages` sin cambios. Resuelve `source` una sola vez.
   - `geoReadiness(config,{schemaGraph,publicHtml,core})`: señales de negocio, ubicación y producto desde `source`, siempre HEURISTIC.
   - Sin `core`: `entityGraph` devuelve `''`, `{}` y `[]`; `geoReadiness` devuelve `adapterSource:'NOT_PROVIDED'`, señales `null`, sin gaps ni fortalezas o debilidades, y `factualSignals:null`.
   - Un `core` inválido lanza `TypeError`.
3. **Contratos cerrados intactos:** `products()` (D-17) y `pages()` (D-13). Las pruebas de CORE-3.1 y CORE-3 pasan sin cambios; solo se actualiza un comentario de CORE-3.1 que ya estaba obsoleto.
4. **Pruebas:** `tests/core-3-2-neutral-intelligence.test.cjs` (24).
   - Contra el `intelligence` de `main` fallan 23; la que pasa (globals ignorados) pasa también en `main`, porque `main` tampoco leía globals.
   - `npm run verify` da 153 (151 pasan, 2 se omiten en Windows). Golden idéntico (blob `5aa93a3`).
5. **Sin cambios** en adapters, Publisher ni materializer. D-16 intacta.

**Cierre:** CORE-3.2 fusionado en `main` mediante [PR #7](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/7) (merge `3ad7b130c52538c3f48fcee1da70c9909ed292f4`). CI Node 20/22 verde, 153/153, 0 omitidos ([run 36111618492](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36111618492)).

- `geoReadiness()` y `entityGraph()` derivan negocio, dirección y ofertas del adapter activo con `{core}` explícito. Sin `core`, la información de vertical queda desconocida/vacía; no se usa Restaurant como fallback.
- El contrato de host cambió: `entityGraph().location` usa la dirección schema.org pública del adapter y `geoReadiness()` necesita `{core}`. No se ha migrado ni validado ningún host.
- D-16 (microcopy OpenSEO) sigue aplazada e intacta.
- Próxima fase Core-only: CORE-6, multidioma. Primero decidir contrato de locale, metadata, Page Registry, canonical y hreflang (D-19); después implementar y verificarlo dentro de este repositorio.
- CORE-2/4/5 y las conexiones reales de CORE-7 siguen bloqueadas por depender de hosts o Platform Layer. No se accede a esos repositorios.

## Sesión 12 — CORE-6 multidioma (25/09/2026)

**Rama:** `feat/core-6-multilingual` desde `main@3ad7b13` (merge del PR #7). El PR #8 (cierre documental de CORE-3.2) seguía abierto y **no** se usó como base; después su rama se integró en la de CORE-6 para conservar ambos cambios (sesión 13). Estado inicial: `npm run verify` daba 153 (151 pasan, 2 se omiten en Windows).

1. **Contrato primero:** D-19 se registró en un commit propio antes del código, basado en la especificación local (Release A §3, Arquitectura §6/§10/§17). Donde la especificación no llega, se eligió el comportamiento conservador: `es` sigue siendo el idioma por defecto, sin `x-default` y con el sitemap sin cambios.
2. **Implementación:**
   - `core`: `normalizeLocale` y `languageSettings`;
   - Page Registry: `locale`, `translationKey`, bloqueos de locale y canonical entre locales, duplicados por locale y `alternates`;
   - Publisher: hreflang recíproco solo en producción, `lang` e `inLanguage`;
   - el materializer no cambia.
3. **Pruebas:** `tests/core-6-multilingual.test.cjs` (19). `npm run verify` da 172 (170 pasan, 2 se omiten en Windows). Monolingüe idéntico a `main` byte a byte y golden sin cambios.
4. **No se ha validado ningún host.** Adapters, entidad, artículos y fórmulas AUTO siguen sin localizar (límites de D-19). D-16 intacta.

**Bloqueo de CI:** los jobs del [PR #9](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/9) no arrancan: *«The job was not started because an Actions budget is preventing further use»* ([run 36113779831](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36113779831), reintentado con el mismo resultado). Es un límite de facturación de la cuenta, no un fallo de pruebas. Evidencia local complementaria: Node 20.20.2 y 22.23.3 dan 172 (170 pasan, 2 se omiten); los pasos del CLI de la CI también pasan en local.

**Pendiente:** CI Node 20/22 del [PR #9](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/9), revisión humana y merge. El solape documental con el PR #8 quedó resuelto en la sesión 13. Sin merge ni deploy.

## Sesión 13 — revisión del PR #9 (25/09/2026)

1. **`apply()` limitado a la portada por diseño:**
   - inyecta el `<head>` del HOME (`publish().publisher.head`), que siempre está en el idioma por defecto (D-19);
   - `<html lang>` se toma ahora de `seo.site.defaultLanguage` reconciliado, que sigue siendo `es`;
   - no aplica páginas localizadas: su `lang` real viene de `renderPage`;
   - queda documentado en el contrato de host y en D-19, y lo fijan 2 pruebas nuevas (monolingüe y multidioma).
2. **PR #8 integrado** en la rama del PR #9 (merge `e29f622`), conservando ambos cambios:
   - del PR #8: el cierre de CORE-3.2 y la secuencia de CORE-6, con su criterio de CORE-6 literal;
   - del PR #9: el estado «en progreso» de CORE-6, su deuda, la sesión 12 y el bloqueo de CI.
   - Solo se descartaron las líneas obsoletas de CORE-3.2 «en revisión».
3. **Validación local:** `npm run verify` y los checks con Node 24, 20.20.2 y 22.23.3 dan 174 (172 pasan, 2 se omiten en Windows). Monolingüe idéntico a `main` (0 diferencias) y golden sin cambios.
4. **CI de GitHub:** sigue sin poder arrancar por el presupuesto de Actions (ver la sesión 12). No se declara aprobada.


## Sesión 14 — secuencia SEO off-page y plataforma (25/09/2026)

**Decisión aprobada:** incorporar SEO off-page como fase explícita y aplazar la plataforma multi-proyecto hasta el final. Registrado en D-20.

- Secuencia tras CORE-6: CORE-7 prepara contratos/mocks de integraciones; CORE-8 implementa capacidades Core-only de SEO off-page & Authority con datos fuente/importados y provenance; CORE-9 es la fase final de Platform Layer y activa conectores reales.
- CORE-8 cubre análisis verificable de backlinks, menciones/citas y presencia local. No crea enlaces automáticamente, no almacena datos en el Core y no promete posiciones. Los conectores externos dependen de CORE-9.
- CORE-9 es un plano de control multi-proyecto con backend, autenticación, secretos, trabajos programados e historial. Cada host conserva su Project State canónico, Studio, Media Library y Page Registry.
- La plataforma se planifica como producto aparte. Esta decisión no autoriza cambios ni accesos a otros repositorios; este repositorio solo conserva los contratos y la secuencia del Core.
- Estado en esa sesión: CORE-6 seguía en revisión y su CI estaba bloqueada. Se cerró después de esa sesión: merge PR #9 `304f655`, CI verde (run `36115604817`). Sin deploy.

## Sesión 15 — cierre de CORE-6 (25/09/2026)

- PR #9 (`feat/core-6-multilingual`) fusionado en `main` como `304f6555416210ff562343dea20a4a22db252a67`.
- CI del HEAD del PR verde en Node 20.20.2 y 22.23.2: 174/174 pruebas por versión, 0 omitidas; syntax, documentación y ambos smoke checks del CLI también verdes ([run 36115604817](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36115604817)).
- CORE-6/D-19 queda cerrado. No se hizo deploy ni validación en host. Se mantienen los límites documentados de D-19 y la deuda heredada de canonical/sitemap de home.
- Próxima fase: CORE-7, contratos de integración y pruebas con mocks en este Core. No activar proveedores reales ni tocar otros repositorios; las conexiones reales permanecen para CORE-9.

## Sesión 16 — CORE-7 contratos de integración (25/09/2026)

**Rama:** `feat/core-7-provider-contracts` desde `main@82ab67e` (CORE-6 cerrado y D-20). Estado inicial: `npm run verify` daba 174 (172 pasan, 2 se omiten en Windows).

1. **Decisión D-21:** módulo `src/rubik-seo-geo-providers.js` (export `./providers`), sin dependencias.
   - Catálogo declarativo de proveedores y operaciones: release, coste, fuente y destino.
   - `runProviderRequest` con transporte, reloj, caché y presupuesto inyectados.
   - Sobre de resultado con provenance (fuente, fechas y evidencia en lista blanca), estados honestos, errores acotados y redactados, datos parciales, confirmación de coste y presupuesto.
   - `toReleaseC`/`toReleaseE` reutilizan los normalizadores existentes.
2. **Límites respetados:**
   - sin red, secretos ni persistencia, y los mocks nunca verifican una conexión;
   - OpenSEO queda diferido a CORE-7.1;
   - los contratos heredados y el golden no cambian.
3. **Pruebas:** `tests/core-7-provider-contracts.test.cjs` (18) y verificación por mutación. `npm run verify` da 192 (190 pasan, 2 se omiten en Windows), igual con Node 20.20.2 y 22.23.3.
4. **Deuda:**
   - no hay transportes reales (CORE-9);
   - el puente MCP de OpenSEO (CORE-7.1);
   - backlinks, presencia y citas con análisis off-page (CORE-8);
   - los adapters heredados de Intelligence todavía no usan el sobre común; se migrarán cuando se conecten los transportes reales.

**Pendiente:** CI Node 20/22 del PR de CORE-7 (`feat/core-7-provider-contracts`), revisión humana y merge. Sin merge ni deploy.

### Sesión 16b — revisión del PR #10 (25/09/2026)

1. **Secretos:**
   - búsqueda completa de claves sensibles, sin límite de profundidad y segura ante ciclos;
   - el input con valores tipo credencial también se rechaza;
   - redacción ampliada (`client_secret`, `refresh_token`, `x-api-key`, `password`, Bearer/Basic/Token, credenciales en URL y pares clave-valor) en errores, evidencia y datos;
   - el input con ciclos devuelve `INVALID_INPUT`.
2. **Presupuesto:** las operaciones quota/paid sin presupuesto finito devuelven `BUDGET_REQUIRED` antes de llamar. La confirmación de pago se mantiene. `estimatedUsd` sigue en `null`.
3. **Backlinks:** `normalizeBacklinks` neutral para `dataforseo.backlinks`, con esquema documentado en D-21 y en el contrato de host. Los valores ausentes son `null` y las filas inválidas dejan el mapeo en `PARTIAL`.
4. **Pruebas:** 27 en `core-7-provider-contracts`; con el módulo anterior fallan 7 de las nuevas. Las mutaciones se detectan. `npm run verify` y Node 20.20.2/22.23.3 dan 201 (199 pasan, 2 se omiten en Windows). Smoke del CLI correcto; golden y paridad sin cambios.


## Sesión 17 — cierre de CORE-7 y siguiente fase (25/09/2026)

- **CORE-7/D-21 cerrado:** PR #10 fusionado en `main` con merge `6ef8c4e56da1ea9e28649c8160f815ef6c9895c2`.
- **CI del HEAD final `e394035`:** Node 20.20.2 y 22.23.2, 205/205 en cada job, 0 omitidas; sintaxis, documentación y smoke CLI verdes (run [36121912236](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36121912236)).
- **Contrato final:** redacción/rechazo de pares genéricos `token`/`key`, presupuesto finito obligatorio para operaciones quota/paid (`BUDGET_REQUIRED`) y normalización neutral de backlinks. 31 pruebas en el módulo de providers. No hubo llamadas a proveedores reales ni deploy.
- **Siguiente:** CORE-8, contratos neutrales y análisis auditable de SEO off-page usando señales aportadas o importadas con provenance. Conexiones reales siguen reservadas a CORE-9; CORE-2/4/5 dependen de un host y no se inician en este repositorio.

## Sesión 17 — CORE-7.1 puente OpenSEO/MCP (25/09/2026)

**Rama:** `feat/core-7-1-openseo-bridge` desde `main@3e03f49` (cierre de CORE-7). Estado inicial: `npm run verify` daba 205 (203 pasan, 2 se omiten en Windows).

1. **D-22:** contrato del puente dentro de `providers`.
   - Catálogo `openseo` con `requires:'mcp'` y las 5 herramientas documentadas.
   - Cliente MCP inyectado, lectura solo de `structuredContent` y errores controlados (401/403/429 + `Retry-After`, `USAGE_EXCEEDED`, timeout, JSON-RPC, `isError`, sin `structuredContent`).
   - `auditId` pasa a ser el job; estados con el `statusVocabulary` inyectado (lo no clasificado nunca es `READY`).
   - Incidencias en la forma de Intelligence, con `crawlAccess` para `blocked-page`/`rate-limited-page`; páginas correlacionadas por URL canónica.
   - `openseoConnectivity`: `CONNECTED` solo con health ok y `whoami` a través de un cliente live.
   - Lighthouse siempre desactivado y disparador manual obligatorio.
2. **Sin cambios:** D-14, D-16, `crawl()` heredado, las comprobaciones de CORE-7 y el golden. Solo se adaptó la aserción `deferred` → `requires` de CORE-7.
3. **Pruebas:** `tests/core-7-1-openseo-bridge.test.cjs` (21) y verificación por mutación. `npm run verify` da 226 (224 pasan, 2 se omiten en Windows), igual con Node 20.20.2 y 22.23.3.
4. **Deuda:** validación contra una instancia real, transporte MCP autenticado, secretos y persistencia del `projectId`/job en CORE-9; valores reales de `status` para el vocabulario; `crawl()` heredado.

**Cierre:** PR #11 fusionado en `main@bc271fe5632cdf34b98ad0e218341cdcc8e5c81e`. CI del HEAD `688e3bb` verde en Node 20.20.2/22.23.2, 233/233 por job, 0 omitidas (run `36126029028`). Sin conexión real ni deploy.

### Sesión 17b — revisión del PR #11 (25/09/2026)

1. **`whoami` ya no autentica con cualquier contenido no vacío.** Como su forma no está documentada, exige el verificador inyectado `whoamiAuthenticated`, que debe devolver exactamente `true`.
   - `authenticated:false`, `authorized:false` y un `error`/`errors` presente siempre dan «no autenticado».
   - Sin verificador → `WHOAMI_UNVERIFIED`.
   - La identidad no se copia.
   - El health solo y los mocks siguen sin verificar.
2. **Pruebas:** 5 nuevas (26 en total en `core-7-1-openseo-bridge`); 4 fallan con el módulo anterior. `npm run verify` y Node 20.20.2/22.23.3 dan 231 (229 pasan, 2 se omiten en Windows). Golden sin cambios.

### Sesión 17c — segunda revisión del PR #11 (25/09/2026)

- Un `errors` no vacío (cadena, array u objeto) rechaza `whoami` aunque el verificador devuelva `true`. Los valores vacíos no rechazan. Las reglas de `error` y `authenticated`/`authorized` no cambian, y el mock y el health solo siguen sin verificar.
- Pruebas: 2 nuevas (28 en `core-7-1-openseo-bridge`); la de rechazo falla con el módulo anterior. `npm run verify` y Node 20.20.2/22.23.3 dan 233 (231 pasan, 2 se omiten en Windows).


## Sesión 18 — cierre de CORE-7.1 (25/09/2026)

- PR #11 fusionado en `main@bc271fe5632cdf34b98ad0e218341cdcc8e5c81e`.
- D-22 queda cerrado: contrato OpenSEO/MCP Core-only para las cinco herramientas documentadas; cliente inyectado; solo `structuredContent`; auditoría manual y Lighthouse desactivado.
- `whoami` requiere `whoamiAuthenticated(...) === true`; las negativas explícitas y cualquier `errors` no vacío prevalecen. Identidad y contenido MCP no se copian.
- CI del HEAD `688e3bb`: run `36126029028`, Node 20.20.2 y 22.23.2, 233/233 por job, 0 omitidas. Tests locales: 233 (231 pasan, 2 omitidas en Windows por symlinks de fichero); golden/paridad sin cambios.
- No hay conexión real, secretos ni deploy. Transporte MCP autenticado, backend, persistencia y validación con instancia real (incluidos estados de auditoría y forma de páginas) quedan en CORE-9; `crawl()` conserva su contrato heredado hasta esa integración.
- Siguiente fase: CORE-8, SEO off-page & Authority Core-only. CORE-2/4/5 siguen dependiendo de validación de un host.

## Sesión 19 — CORE-8, SEO off-page & Authority Core-only (25/09/2026)

- **Rama:** `feat/core-8-offpage-authority` desde `main@a031224`. Decisión D-23. Modelo de servicio, IA frente a aprobación humana, límites con CORE-9 y fuentes: [`integrations/OFFPAGE-SERVICE.md`](integrations/OFFPAGE-SERVICE.md).
- **Investigación de solo lectura:**
  - repositorios propios: digital-marketing-pro, seo-god, open-seo-mcp-skills, marketingskills y open-seo;
  - externos: every-app/open-seo, seranking/seo-skills, elmo, geo-aeo-tracker y backlink-checker-php;
  - Hugging Face/arXiv y fuentes oficiales de Google, OpenAI, Bing y Perplexity;
  - foros, tratados como anecdóticos.

  No se copió nada ni se accedió a WEB-RESTAURACI-N-PREMIUM-DIN-MICA.
- **Código:**
  - `src/rubik-seo-geo-offpage.js` (nuevo): perfil, snapshots y comparación, menciones, NAP, GEO, oportunidades, acciones y campañas, cierre de periodo, informe y validación de IA.
  - `src/rubik-seo-geo-providers.js`: entrada `ai-assist` en el catálogo (release `O`, `paid`).
  - `package.json`: export `./offpage`.
- **Pruebas:** 29 nuevas; una aserción del catálogo de CORE-7 ampliada (`ai-assist`, release `O` siempre `paid`). La verificación por mutación de 12 guardas las mata todas. `npm run verify`: 262 (260 pasan, 2 se omiten en Windows). Golden sin cambios.
- **Pendiente para cerrar CORE-8:** PR, CI Node 20/22 en verde y revisión. Sin merge ni deploy.
- **CORE-9:** conectores reales, modelos, persistencia, programación, historial, envío tras aprobación y secretos.


## Sesión 20 — auditoría CORE-8 y ejecución autónoma preparada (25/09/2026)

**Estado verificado del punto de partida:** PR #12, rama `feat/core-8-offpage-authority`, HEAD `42d213da5d728bee3296a34b0266f52e82a3368a`; PR abierto, sin conflictos reportados; CI run `36129957035` verde en Node 20/22 con 262/262 por job, sin omitidas. No está fusionado ni desplegado.

**Auditoría:** no aprobar merge hasta corregir y cubrir con regresiones:
1. `measurement()`/`geoRun()` no deben permitir que campos de entrada falsificables conviertan datos manuales en `VERIFIED`.
2. `summarizeGeo()` debe calcular cobertura/repeticiones sobre consultas del mismo locale y mercado.
3. `compareGeo()` debe hacer no comparable la serie cuando cambia el modelo/superficie relevante; no informar `UP`/`DOWN` entre modelos distintos.
4. `findConflicts()` debe separar cambios temporales/proveedores no comparables de contradicciones reales.
5. `evidenceItem()` debe minimizar/validar también `id`, `subject`, `field` y `provider` antes de enviarlos a un modelo.
6. `validateAiOutput()` no comprueba entailment semántico. Ajustar el contrato para que “aceptada” no se presente como hecho probado, preservar revisión humana y limitar estado FACT a evidencia comparable con reglas honestas; añadir pruebas para afirmaciones no respaldadas semánticamente.

**Siguiente secuencia:** terminar correcciones CORE-8 y CI; luego implementar CORE-8.1 de acuerdo con D-24 y OFFPAGE-SERVICE §6; luego avanzar CORE-9 en este repo con diseño/contratos/mocks hasta el límite autorizado. Detalle paso a paso: [`AUTONOMOUS-CONTINUATION.md`](AUTONOMOUS-CONTINUATION.md).

**Persistencia para pausa por créditos:** antes de parar, Claude debe dejar commits coherentes y actualizar este handoff con fecha, rama/PR, HEAD, archivos, pruebas exactas, CI, hallazgos, bloqueos y el siguiente comando/tarea. Al reanudar, verificar el HEAD del remoto y el estado de CI antes de repetir trabajo. No merge/deploy y nunca acceder ni escribir en WEB-RESTAURACI-N-PREMIUM-DIN-MICA ni otro repositorio.


## Sesión 21 — correcciones de la auditoría de CORE-8 (25/09/2026)

- **Punto de partida verificado:** rama `feat/core-8-offpage-authority`, HEAD remoto `669c5ff` (documentación del propietario), PR #12 abierto y mergeable, con CI verde del HEAD anterior. Ese verde no resolvía los hallazgos.
- **Hecho:** los seis hallazgos de AUTONOMOUS-CONTINUATION etapa 1 están corregidos (detalle en D-23, «Correcciones tras la auditoría»).
  - `src/rubik-seo-geo-providers.js`: `isTrustedResult`; la caché no confiable vuelve como `NOT_VERIFIED`.
  - `src/rubik-seo-geo-offpage.js`: trust, GEO por grupo exacto, rupturas de serie, conflicto frente a divergencia, minimización completa y validación estructural con candidatas.
  - `tests/core-8-review-regressions.test.cjs`: 12 regresiones nuevas.
  - `tests/core-8-offpage-authority.test.cjs`: actualizado a la nueva API.
- **Pruebas locales:**
  - Las 11 regresiones iniciales fallan contra `42d213d` en un worktree temporal (ya eliminado) y pasan ahora.
  - Una mutación de 17 guardas mata las 17.
  - `npm run verify`: 274 (272 pasan, 2 se omiten en Windows).
- **CI:** run [36133453921](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36133453921) del HEAD `d65dcf1` verde en Node 20.20.2/22, 274/274 por job, 0 omitidas. PR #12 cumple los gates técnicos de CORE-8 y sigue abierto para revisión humana.
- **Siguiente paso:** CORE-8.1 en la rama `feat/core-8-1-offpage-operations`, apilada sobre el HEAD corregido de CORE-8. El PR #12 sigue abierto para revisión humana; sin merge.

## Sesión 22 — CORE-8.1 implementada en rama apilada (25/09/2026)

- **Base:** PR #12 cumplió los gates técnicos de CORE-8 (runs `36133453921` y `36133533112` verdes, 274/274). La rama `feat/core-8-1-offpage-operations` sale de `4e64f48`. **Dependencia:** fusionar primero PR #12; después, este PR.
- **Hecho:**
  - §6.3 con 8 entregables y criterios comprobables;
  - `src/rubik-seo-geo-offpage-ops.js`;
  - `offpage.claimIssues` (aditivo);
  - 13 pruebas en `tests/core-8-1-offpage-operations.test.cjs`;
  - export `./offpage-ops`;
  - documentación: D-24 (implementación), OFFPAGE-SERVICE §6, ROADMAP, README, ARCHITECTURE, HOST §5.3 y PROVENANCE.
- **Pruebas locales:** una mutación de 20 guardas mata las 20. `npm run verify`: 287 (285 pasan, 2 se omiten en Windows); igual con Node 20.20.2/22.23.3 en local.
- **PR y CI:** [PR #13](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/13), apilado sobre #12; CI run [36203308792](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36203308792) del HEAD `a0f59fa` verde en Node 20.20.2/22, 287/287 por job, 0 omitidas; pendiente de revisión humana.
- **Siguiente paso:** CORE-9 en la rama `docs/core-9-platform-spec`, que solo prepara especificación, arquitectura, límites de datos, threat model, contratos y mocks dentro de este repositorio.

## Sesión 23 — preparación de CORE-9 dentro del Core (26/09/2026)

- **Reanudación tras la pausa por créditos:** comprobado el estado remoto. `a0f59fa` estaba pusheado, pero faltaba el PR, así que se abrió el PR #13 (base `feat/core-8-offpage-authority`). CI run `36203308792` verde (287/287 por job). `5f60000` registra el PR y el CI en la documentación.
- **Rama:** `docs/core-9-platform-spec`, desde `5f60000`. **Orden de fusión:** #12, luego #13 (cambiar su base a `main`) y después el PR de CORE-9.
- **Hecho:**
  - `docs/core-9/PLATFORM-SPEC.md`;
  - `src/rubik-seo-geo-platform-contracts.js`;
  - 9 pruebas en `tests/core-9-platform-contracts.test.cjs`;
  - export `./platform-contracts`;
  - D-25, ROADMAP, README, ARCHITECTURE, HOST y PROVENANCE, y el índice `docs/README.md`.
- **Pruebas:** una mutación de 16 guardas mata las 16. `npm run verify`: 296 (294 pasan, 2 se omiten en Windows); igual con Node 20.20.2/22.23.3 en local.
- **PR y CI:** [PR #14](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/14), apilado sobre #13; CI run [36203720653](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36203720653) del HEAD `eabd93c` verde en Node 20.20.2/22, 296/296 por job, 0 omitidas; pendiente de revisión humana.
- **Bloqueado (requiere al propietario):** PLATFORM-SPEC §10, es decir, proyecto destino, infraestructura, proveedores y presupuestos, modelo de IA, legal/DPA y primer host. No se implementa la plataforma, no se crea ni toca otro repositorio, no se usan secretos ni se conectan servicios.
- **Siguiente paso concreto:** revisión humana de PR #12 → #13 → CORE-9. Tras las respuestas de §10, etapa 1 del plan de PLATFORM-SPEC §8 en el proyecto destino autorizado.
