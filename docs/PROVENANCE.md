# Procedencia

- **Repositorio fuente (solo lectura):** `Juanmaes83/WEB-RESTAURACI-N-PREMIUM-DIN-MICA`
- **Commit de extracción:** `388e48a98e881aff4adf26f16a0679dc3e1f11f5` (`origin/main`, 21/09/2026, «docs: clarify Release E contract closure»)
- **Bootstrap SCULPT previo:** `SCULPT-SOURCE.md` (`d49d0e3`) se conserva tal cual. Motivo del cambio de base: `DECISIONS.md` D-01.
- **Método:** `git archive 388e48a`. No se modificó el working tree ni ninguna rama del repositorio fuente.

## Ficheros trasladados

Los blob ids de git son independientes de los finales de línea. «idéntico» significa que `git rev-parse 388e48a:<fuente>` coincide con `git hash-object` del fichero en este repositorio.

| Destino | Fuente @388e48a | Blob fuente | Blob destino | Relación |
|---|---|---|---|---|
| `src/rubik-seo-geo-core.js` | `rubik-seo-geo-core.js` | `dd7c1d415059` | `6c053577d2e4` | derivado en CORE-6 (D-19: `normalizeLocale`, `languageSettings`, `inLanguage` multidioma). Idéntico hasta `main@3ad7b13` |
| `src/rubik-seo-geo-adapters.js` | `rubik-seo-geo-adapters.js` | `142d41303c38` | `142d41303c38` | idéntico |
| `src/rubik-seo-geo-publisher.js` | `rubik-seo-geo-publisher.js` | `0d791f828366` | `97834c8524a6` | derivado en CORE-6 (D-19: hreflang, `lang` e `inLanguage` por página; `apply()` limitado a la portada con `lang` del idioma por defecto). Idéntico hasta `main@3ad7b13` |
| `src/rubik-seo-geo-release-b.js` | `rubik-seo-geo-release-b.js` | `f7432eb72699` | `5ca6d711ede8` | derivado en CORE-3 (D-15: validación de rutas) y CORE-6 (D-19: locale, `translationKey`, `alternates`). Idéntico hasta `main@995207f` |
| `src/rubik-seo-geo-media.js` | `rubik-seo-geo-media.js` | `07422b3b6b05` | `07422b3b6b05` | idéntico |
| `src/rubik-seo-geo-intelligence.js` | `rubik-seo-geo-intelligence.js` | `a72162b4ba48` | `65e16b388b9a` | derivado en CORE-3 (D-13: `pages` inyectado; D-14: health), CORE-3.1 (D-17: `products` desde el adapter) y CORE-3.2 (D-18: `geoReadiness`/`entityGraph` desde el adapter). Idéntico hasta `main@995207f` |
| `src/rubik-seo-geo-release-e.js` | `rubik-seo-geo-release-e.js` | `0cc98079cfb7` | `49ed42cac6af` | derivado en CORE-3 (D-13: vertical desde el adapter). Idéntico hasta `main@995207f` |
| `src/rubik-seo-geo-materialize.cjs` | `scripts/seo-geo-materialize-public.cjs` | `1ea145638d63` | `28909839c550` | derivado (D-03: parte Core; D-11: rutas validadas y contenidas en outputDir) |
| `hosts/restaurant/restaurant-host.cjs` | `scripts/seo-geo-materialize-public.cjs` | `1ea145638d63` | `7e8d3921fd1e` | derivado (D-03: parte host, funciones sin cambios) |
| `tests/seo-geo-core.test.cjs` | `tests/seo-geo-core.test.cjs` | `f74003af5ac1` | `9bf1bee6c6dd` | adaptado (rutas `../src/`) |
| `tests/seo-geo-publisher.test.cjs` | `tests/seo-geo-publisher.test.cjs` | `ce34b44cc811` | `e597bd42e6b4` | adaptado (rutas `../src/`) |
| `tests/seo-geo-media-b1.test.cjs` | `tests/seo-geo-media-b1.test.cjs` | `e396d8f8adc4` | `c0a4901dc678` | adaptado (rutas `../src/`) |
| `tests/seo-geo-release-b.test.cjs` | `tests/seo-geo-release-b.test.cjs` | `7e32b2b7ee4d` | `30dcd3cf4ed5` | adaptado (rutas `../src/`) |
| `tests/seo-geo-release-c.test.cjs` | `tests/seo-geo-release-c.test.cjs` | `8b7073e43ce7` | `fe294d37fa42` | adaptado (rutas `../src/`) |
| `tests/seo-geo-release-d.test.cjs` | `tests/seo-geo-release-d.test.cjs` | `33e3a4da506c` | `41268a25da0c` | adaptado (rutas `../src/`) |
| `tests/seo-geo-release-e.test.cjs` | `tests/seo-geo-release-e.test.cjs` | `833a1bb0fcf5` | `0ae0289b15f7` | adaptado (rutas `../src/`) |
| `tests/seo-geo-source-convergence.test.cjs` | `tests/seo-geo-source-convergence.test.cjs` | `4ada3297b1ab` | `718ca5d41281` | adaptado (rutas `../src/`) |
| `tests/seo-geo-hardening-a-raw-html.test.cjs` | `tests/seo-geo-hardening-a-raw-html.test.cjs` | `4fde03f239c9` | `e5932852e30d` | adaptado (D-03 fixtures) |
| `tests/seo-geo-hardening-b-page-contract.test.cjs` | `tests/seo-geo-hardening-b-page-contract.test.cjs` | `ed7319f11997` | `ea6406a6d7c8` | adaptado (D-03 fixtures, D-04 −5 tests host) |
| `tests/seo-geo-encoding-gate.test.cjs` | `tests/seo-geo-encoding-gate.test.cjs` | `cd0865e43e74` | `4382a1c0bce6` | adaptado (ficheros propios) |
| `docs/upstream/SEO-GEO-ENGINE-ARCHITECTURE.md` | `docs/SEO-GEO-ENGINE-ARCHITECTURE.md` | `26ca94420dd7` | `212245a4298d` | estado reconciliado (D-06) |
| `docs/upstream/SEO-GEO-FOUNDATION.md` | `docs/SEO-GEO-FOUNDATION.md` | `ff0ed9f98e1a` | `ff0ed9f98e1a` | idéntico |
| `docs/upstream/SEO-GEO-INTEGRATIONS.md` | `docs/SEO-GEO-INTEGRATIONS.md` | `e1d649c56dfb` | `e1d649c56dfb` | idéntico |
| `docs/upstream/SEO-GEO-PRODUCTION-HARDENING-CONTRACT.md` | `docs/SEO-GEO-PRODUCTION-HARDENING-CONTRACT.md` | `132f62ed3e28` | `82344442f47f` | estado reconciliado (D-06) |
| `docs/upstream/SEO-GEO-RELEASE-A-CONTRACT.md` | `docs/SEO-GEO-RELEASE-A-CONTRACT.md` | `45c680dc6409` | `c31b5e97a43c` | estado reconciliado (D-06) |
| `docs/upstream/SEO-GEO-RELEASE-B-CONTRACT.md` | `docs/SEO-GEO-RELEASE-B-CONTRACT.md` | `3ca8b1528bc3` | `6c8784fd5e6e` | estado reconciliado (D-06) |
| `docs/upstream/SEO-GEO-RELEASE-C-CONTRACT.md` | `docs/SEO-GEO-RELEASE-C-CONTRACT.md` | `4126c406656e` | `4d48546f352e` | estado reconciliado (D-06) |
| `docs/upstream/SEO-GEO-RELEASE-D-CONTRACT.md` | `docs/SEO-GEO-RELEASE-D-CONTRACT.md` | `d2650a0a1788` | `316207620c2c` | estado reconciliado (D-06) |
| `docs/upstream/SEO-GEO-RELEASE-E-AUTHORITY-CITATIONS-INDEXATION.md` | `docs/SEO-GEO-RELEASE-E-AUTHORITY-CITATIONS-INDEXATION.md` | `c8a5a02f4552` | `c8a5a02f4552` | idéntico |

Para reproducir la comprobación:

```bash
git -C <fuente> rev-parse 388e48a:rubik-seo-geo-core.js
git hash-object --path=src/rubik-seo-geo-core.js src/rubik-seo-geo-core.js
```

## Ficheros nuevos de este repositorio

| Fichero | Origen |
|---|---|
| `tests/fixtures/restaurant-lumina-state.json` | `window.RestaurantDefaults` evaluado desde `class4-config.js@388e48a` (sha256 del fichero fuente `e01310e2…eb744`) con el mismo sandbox `vm` que `loadDefaultProjectState`. Contenido demo ya público en el repositorio fuente. |
| `tests/fixtures/restaurant-home-template.html` | Estructura mínima de slots de `index.html@388e48a` (sha256 `e2a51f0c…c3c47`): solo los elementos que pinta `premiumHomeBody`. |
| `tests/fixtures/golden/source-388e48a-publish.json` | Salida de `publish()` y `preview()` de los **módulos fuente** para LÚMINA (Restaurant) y Casa Norte (RealEstate), en preview y production (`scripts/generate-source-golden.cjs`). |
| `tests/core-independence.test.cjs`, `tests/core-source-parity.test.cjs` | Gates nuevos (D-08). |
| `tests/core-materialize-path-safety.test.cjs` | Prueba de seguridad de path traversal (D-11). |
| `src/rubik-seo-geo-providers.js` | Nuevo en CORE-7 (D-21): contratos neutrales de proveedor para Release C/E. Sin equivalente en el fuente. CORE-8 añade la entrada de catálogo `ai-assist` (D-23). |
| `src/rubik-seo-geo-offpage.js` | Nuevo en CORE-8 (D-23): contratos del servicio off-page & Authority. Sin equivalente en el fuente. Patrones inspirados (no copiados) en los repositorios y fuentes listados en [ECOSYSTEM-REFERENCES.md](ECOSYSTEM-REFERENCES.md) y [OFFPAGE-SERVICE.md](integrations/OFFPAGE-SERVICE.md). |
| `tests/core-8-offpage-authority.test.cjs` | CORE-8: servicio off-page con datos manuales, importados y mock; periodos, GEO, aprobación humana y validación de IA (D-23). |
| `src/rubik-seo-geo-platform-contracts.js` | Nuevo en la preparación de CORE-9 (D-25): contratos y mocks de plataforma. Sin equivalente en el fuente. |
| `tests/core-9-platform-contracts.test.cjs` | CORE-9: aislamiento, permisos, auditoría, gasto, consentimiento, provenance firmada y trabajos, solo con mocks (D-25). |
| `docs/core-9/PLATFORM-SPEC.md` | Especificación revisable de CORE-9 (D-25). |
| `src/rubik-seo-geo-offpage-ops.js` | Nuevo en CORE-8.1 (D-24): operación off-page continua sobre CORE-8. Sin equivalente en el fuente. |
| `tests/core-8-1-offpage-operations.test.cjs` | CORE-8.1: borradores, continuidad, GEO repetido, outreach individual y reseñas neutrales en tres verticales (D-24). |
| `tests/core-8-review-regressions.test.cjs` | Revisión de CORE-8 (D-23, sesión 21): regresiones de los seis hallazgos de la auditoría del PR #12. |
| `tests/core-7-1-openseo-bridge.test.cjs` | CORE-7.1: puente OpenSEO/MCP con cliente inyectado y mocks (D-22). |
| `tests/core-7-provider-contracts.test.cjs` | CORE-7: sobre de resultado, provenance, errores, datos parciales, coste/presupuesto/caché y mapeo C/E con mocks (D-21). |
| `tests/core-6-multilingual.test.cjs` | CORE-6: contrato multidioma D-19 (locales, hreflang recíproco, canonical por locale, materializer). |
| `tests/core-3-2-neutral-intelligence.test.cjs` | CORE-3.2: `geoReadiness()` y `entityGraph()` desde `source(config)` de los 7 adapters (D-18). |
| `tests/core-3-1-entity-products.test.cjs` | CORE-3.1: `entityGraph().products` desde el contrato de oferta de los 7 adapters (D-17). |
| `tests/core-3-explicit-injection.test.cjs` | CORE-3: inyección explícita, vertical por adapter, health OpenSEO con mocks locales y validación de rutas en el Page Registry (D-13…D-15). |
| `scripts/run-tests.cjs`, `scripts/check-syntax.cjs`, `scripts/check-docs.cjs`, `scripts/generate-source-golden.cjs` | Herramientas del repositorio. |
| `docs/integrations/OPENSEO.md` | Documento propio, basado en la lectura del código de `Juanmaes83/open-seo@0ffff93101043aad7600a3b6a499a0cd2887ef49` (idéntico a `every-app/open-seo`). No se copió código de OpenSEO. |
| `docs/README.md` | Mapa de autoridad documental propio (D-10). |
| `.github/workflows/core-ci.yml` | Consolidación de los workflows Node del fuente (D-08). |

## No trasladado (se queda en el host)

`rubik-seo-geo-studio.js`, `rubik-seo-geo-release-{c,d,e}-studio.js`, `styles-seo-geo*.css`, `project-model.js`, `class4-*.js`, `index.html`, los tests E2E de Playwright, `hardening-c-performance.mjs`, `seo-geo-spain-first-contract.test.cjs` y los workflows `seo-geo-hardening-c.yml` y `project-model-schema.yml`. Motivos: `DECISIONS.md` D-04 y D-05.
