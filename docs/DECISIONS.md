# Decisiones técnicas de la extracción

Registro de los ajustes inevitables al convertir el SEO/GEO de Restaurantes Premium en un Core independiente. Cada decisión cita su evidencia. Regla: el código del Core no cambia de comportamiento; lo que cambia es dónde vive cada responsabilidad.

---

## D-01 · Base de extracción: `388e48a`, no el commit SCULPT `d49d0e3`

- **Contexto:** `SCULPT-SOURCE.md` registra `d49d0e3a84a2b718585d38d219d6ccd9ad9ef5d1` (Merge PR #52, 16/09/2026), pero la rama `sculpt/import-seo-geo-core` no importó código: es idéntica a `main` (`c384767`).
- **Evidencia:** `git diff --stat d49d0e3 origin/main` sobre `rubik-seo-geo-*`, `scripts/seo-geo-*` y `tests/seo-geo-*` da 17 ficheros y +950/−54 líneas. En medio están Hardening A (#53), B (#54) y C (#55), Release E (#56) y Project Model v5 (#57).
- **Decisión:** extraer desde `origin/main@388e48a98e881aff4adf26f16a0679dc3e1f11f5` (21/09/2026). Es el `main` vigente y contiene todos los cierres verificados. `SCULPT-SOURCE.md` se conserva sin cambios como registro histórico del bootstrap.

## D-02 · Módulos del Core copiados sin modificar

- Los siete módulos puros (`core`, `adapters`, `publisher`, `release-b`, `media`, `intelligence`, `release-e`) se copian sin tocar un byte a `src/`. Así, compatibilidad y trazabilidad se pueden comprobar con el hash del blob de git (ver `PROVENANCE.md`).
- Siguen dentro dos acoplamientos del host, conservados a propósito para no romper Restaurant (ver D-07).

## D-03 · Materializer dividido en Core y hook de host

- **Contexto:** `scripts/seo-geo-materialize-public.cjs` mezclaba dos cosas: la materialización genérica (rutas, gates raw-HTML, sitemap, robots, 404 y manifiesto) y código exclusivo de Restaurantes: `premiumHomeBody` (mapa de IDs del `index.html` premium) y `loadDefaultProjectState` (evalúa `class4-config.js`).
- **Decisión:**
  - `src/rubik-seo-geo-materialize.cjs` conserva la lógica genérica. Acepta `renderHomeBody(template,state)`, y por defecto usa la identidad.
  - `hosts/restaurant/restaurant-host.cjs` contiene `premiumHomeBody` y `loadDefaultProjectState` sin cambios. Ahora `loadDefaultProjectState` pide la ruta explícita a `class4-config.js`: el Core nunca lee un checkout del host de forma implícita.
  - El CLI exige `--project-state` y `--template` y acepta `--home-body=<módulo>`. Ya no existe un proyecto por defecto.
  - Renombrado: `materializePremiumHome` → `materializeHome`.
- **Evidencia de compatibilidad:** con el `index.html` real y el mismo estado LÚMINA, materializar con el script fuente y con Core + host Restaurant da **0 diferencias** en los 6 ficheros de salida, tanto en preview como en production (verificación hecha durante la extracción).
- **Tests:** Hardening A/B usan `tests/fixtures/restaurant-home-template.html`, que es la estructura mínima de slots del `index.html` premium, y `tests/fixtures/restaurant-lumina-state.json`, que es `RestaurantDefaults` evaluado desde `class4-config.js@388e48a` con el mismo `vm` que el original.

## D-04 · Tests del host que no se trasladan

No se trasladan porque verifican ficheros del producto de Restaurantes, no el Core. Siguen siendo responsabilidad del repositorio fuente:

| Test fuente | Motivo |
|---|---|
| 5 tests finales de `seo-geo-hardening-b-page-contract.test.cjs` | Leen `rubik-seo-geo-studio.js`, `rubik-seo-geo-release-c-studio.js`, `styles-seo-geo.css`, `app-v4.js`, `studio-real-preview.js` y `class4-store.js`. |
| `seo-geo-spain-first-contract.test.cjs` | Comprueba el selector de idioma del Studio de Restaurantes. La regla España-first del Core ya la cubre `seo-geo-core.test.cjs` (`supportedLanguages:['es']`). |
| `seo-geo-studio-e2e.mjs`, `seo-geo-release-c-studio-e2e.mjs`, `seo-geo-release-d-studio-e2e.mjs` | Playwright sobre la app de Restaurantes (`static-server.mjs`, `RestaurantStudioConfig`). |
| `hardening-c-performance.mjs` | Lighthouse y móvil de la web pública de Restaurantes. |
| `project-model.mjs` | Project Model v5 del host (ver D-05). |

El gate de encoding se adapta: aplica la misma regla contra mojibake, pero sobre los ficheros de este repositorio.

## D-05 · Studio y Project Model se quedan en el host

- `rubik-seo-geo-studio.js`, `rubik-seo-geo-release-{c,d,e}-studio.js` y `styles-seo-geo*.css` son UI del host. Dependen de `window.RestaurantStudioConfig`, `RestaurantStudioShell`, `RestaurantStore`, `.studio-nav`, `#studio-scroll` y del evento `restaurant:config-applied`. No se copian. Lo que sí se documenta es el contrato que cualquier Studio anfitrión debe implementar (`HOST-INTEGRATION-CONTRACT.md` §4).
- `project-model.js` (v5) pertenece al host. El Core solo consume la proyección runtime (`config.seo`, `brand`, `hero`, `visit`, `modules.location`, `dishes|services|products|offerings`, `media`). El namespace `seoGeo` del envelope v5 se proyecta a `config.seo` mediante `toRuntime()`.

## D-06 · Estados documentales reconciliados

- **Discrepancia:** `docs/SEO-GEO-ENGINE-ARCHITECTURE.md` (última edición de estado: `8bf5462`, 18/09) presenta Release E como «FUTURO · NO DESARROLLADO» y Hardening C como «SIGUIENTE». Los contratos A–D y Hardening conservan también cabeceras de la época del PR («en revisión humana», «PR remains DRAFT»).
- **Fuente vigente:** GitHub (PRs #44–#57 en estado MERGED), `docs/PROJECT-STATE-CLOSEOUT-2026-09-21.md`, `docs/ROADMAP-EXECUTION-NEXT.md` y la cabecera de `SEO-GEO-RELEASE-E-AUTHORITY-CITATIONS-INDEXATION.md`. Todos coinciden: Release E tiene el **contrato base cerrado** y las **conexiones externas abiertas**.
- **Decisión:** los contratos se copian completos en `docs/upstream/`. Solo se sustituyen las líneas de estado obsoletas (8 en total), marcadas con `[Core·D-06]`. El estado operativo del Core vive únicamente en `docs/ROADMAP.md`.

## D-07 · Acoplamientos que se conservan y quedan registrados como deuda

| Ubicación | Acoplamiento | Por qué no se toca ahora |
|---|---|---|
| `src/rubik-seo-geo-core.js`, rama navegador del UMD | Escribe `RestaurantDefaults.seo` e inyecta `rubik-seo-geo-adapters.js` y `rubik-seo-geo-release-d-studio.js` al recibir `rubik:seo-geo-request`, o con `?review=seo-geo-d`. | Es el bootstrap del lazy loading de Hardening C en Restaurantes. Cambiarlo rompería al host hasta que este adopte el nuevo contrato. En Node no se ejecuta. → ROADMAP CORE-2. |
| `src/rubik-seo-geo-intelligence.js` `pages()` | Lee `globalThis.RubikSEOGeoReleaseB`. En Node devuelve `[]` salvo que el host registre ese global. | Comportamiento del fuente cubierto por tests. → ROADMAP CORE-3 (inyección explícita). |
| `src/rubik-seo-geo-release-e.js` | `normalizePresenceRecord` usa `vertical:'restaurant'` por defecto. | Resultado del fuente fijado por tests. → ROADMAP CORE-3 (derivar del adapter activo). |
| `src/rubik-seo-geo-core.js` `fallbackRegistry` y `restaurantSource` | Copia embebida del adapter Restaurant para cuando no hay registry. | Garantiza el arranque en frío del host. Se mantiene. |

## D-08 · Paquete y CI propios

- `package.json` sin dependencias. `npm run check` hace `node --check` de todo, `npm test` usa un runner portable con lista explícita de ficheros (Node 20 no expande globs y npm usa cmd.exe en Windows), y `engines: node >=20`.
- `.github/workflows/core-ci.yml` agrupa los gates Node de los workflows fuente `seo-geo-foundation`, `-intelligence`, `-release-d`, `-release-e` y `-hardening-a/b`, más el smoke del CLI (preview fail-closed y producción sin baseUrl rechazada). Matriz Node 20 y 22.
- Se añaden tres gates nuevos: `core-independence` (imports solo dentro de `src/` o `node:`, sin storage, los 7 adapters registrados, host genérico no-Restaurant), `core-source-parity` (golden de `publish()` y `preview()` generado con los módulos fuente `388e48a` para Restaurant y RealEstate, en preview y production) y el gate de encoding adaptado.
