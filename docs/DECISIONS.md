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
| `src/rubik-seo-geo-intelligence.js` `pages()` | ~~Lee `globalThis.RubikSEOGeoReleaseB`.~~ **Resuelto en CORE-3 (D-13):** `pages(config,{releaseB})`, sin global. | — |
| `src/rubik-seo-geo-release-e.js` | ~~`normalizePresenceRecord` usa `vertical:'restaurant'` por defecto.~~ **Resuelto en CORE-3 (D-13):** el vertical se deriva del adapter inyectado o queda `UNKNOWN`. | — |
| `src/rubik-seo-geo-core.js` `fallbackRegistry` y `restaurantSource` | Copia embebida del adapter Restaurant para cuando no hay registry. | Garantiza el arranque en frío del host. Se mantiene. |

## D-08 · Paquete y CI propios

- `package.json` sin dependencias. `npm run check` hace `node --check` de todo, `npm test` usa un runner portable con lista explícita de ficheros (Node 20 no expande globs y npm usa cmd.exe en Windows), y `engines: node >=20`.
- `.github/workflows/core-ci.yml` agrupa los gates Node de los workflows fuente `seo-geo-foundation`, `-intelligence`, `-release-d`, `-release-e` y `-hardening-a/b`, más el smoke del CLI (preview fail-closed y producción sin baseUrl rechazada). Matriz Node 20 y 22.
- Se añaden tres gates nuevos: `core-independence` (imports solo dentro de `src/` o `node:`, sin storage, los 7 adapters registrados, host genérico no-Restaurant), `core-source-parity` (golden de `publish()` y `preview()` generado con los módulos fuente `388e48a` para Restaurant y RealEstate, en preview y production) y el gate de encoding adaptado.

## D-09 · El contrato `OpenSEOAdapter` heredado no coincide con OpenSEO real

- **Evidencia:** en `Juanmaes83/open-seo@0ffff93` (idéntico a `every-app/open-seo`), OpenSEO expone MCP en `/mcp` (`src/server/mcp/context.ts`) y health en `GET /api/health` (`src/routes/api/health.ts`). No existe ruta HTTP de crawl: `src/routes/api/*` = `health`, `auth`, `autumn` y callbacks OAuth.
- El Core (`src/rubik-seo-geo-intelligence.js`) espera otra cosa: `POST <OPENSEO_ENDPOINT>` con `{action:'crawl'}`, polling en `/crawl/<jobId>` y conectividad por `GET` a la raíz. Esa conectividad da un **falso `CONNECTED`** contra cualquier web que responda 200.
- **Decisión:**
  - no se modifica el código ahora: el módulo sigue idéntico al fuente y su golden no cambia;
  - la integración se rediseña como puente server-side MCP en `docs/integrations/OPENSEO.md` y se planifica como ROADMAP CORE-7.1, bloqueada por CORE-3 (interfaz de proveedor inyectable) y por la Platform Layer;
  - la corrección de conectividad (`/api/health`) se hará en CORE-3, con tests y una decisión que actualice el golden si hace falta;
  - hasta entonces, **ningún host debe mostrar OpenSEO como conectado** basándose en `connectivity()`.
- **Actualización (CORE-3, D-14):** `connectivity()` ya usa `GET /api/health` y nunca devuelve `CONNECTED`. `crawl()` sigue con el contrato heredado hasta CORE-7.1.

## D-10 · Autoridad documental y sincronización

- El mapa de autoridad por tema está en `docs/README.md`. El estado solo vive en `ROADMAP.md`.
- `docs/upstream/` es una copia congelada, sin sincronización automática; el procedimiento manual está en `docs/README.md`.
- `upstream/SEO-GEO-INTEGRATIONS.md` se conserva sin cambios porque es contrato heredado. Para OpenSEO manda `integrations/OPENSEO.md` (señalado en `upstream/README.md`).
- Se añade `scripts/check-docs.cjs` (`npm run check:docs`, incluido en `verify`), que comprueba enlaces relativos, documentos obligatorios y encoding UTF-8 sin mojibake.

## D-11 · Path traversal en el materializer: corregido y con prueba

- **Hallazgo (revisión del PR #1):** `routeFile` hacía `path.join(outputDir, route)` con `page.path` del Page Registry. `release-b.pathOf` conserva `..`, y una página con `path:'/../../escape/'` pasa `canPublish`. Reproducido con el código de `007bb2e`: se escribió `<outputDir>/../../escape/index.html`.
- **Origen:** es código heredado. `scripts/seo-geo-materialize-public.cjs@388e48a` del repositorio fuente tiene la misma `routeFile`, así que el host Restaurant sigue expuesto hasta que lo corrija o adopte el Core (CORE-4). El fuente no se modifica desde aquí.
- **Corrección** (`src/rubik-seo-geo-materialize.cjs`):
  - `routeFile` exige una ruta absoluta de URL (`/…`);
  - rechaza NUL, `\` y `:` (separador de Windows, unidades y ADS);
  - rechaza segmentos `.`/`..` en claro o codificados con % y separadores codificados (`%2f`, `%5c`);
  - comprueba con `path.relative` que el fichero resultante queda dentro de `outputDir`;
  - `writeFile` repite esa comprobación de contención para todos los ficheros (páginas, sitemap, robots, 404 y manifiesto);
  - todas las rutas publicables se validan **antes de la primera escritura**, así que una ruta insegura hace fallar la build sin salida parcial, tanto en preview como en production.
- **Compatibilidad:** las rutas legítimas no cambian. La materialización con el `index.html` real y el estado LÚMINA sigue dando 0 diferencias contra el script fuente, y el golden de `publish()` no cambia. Los módulos `release-b` y `publisher` siguen idénticos al fuente: la defensa está en la frontera de escritura.
- **Prueba:** `tests/core-materialize-path-safety.test.cjs`. Con el código de `007bb2e` falla 4/4 y con la corrección pasa 4/4.
- **Pendiente:** que el Page Registry rechace `..` al crear la página (`release-b.createPage` / `pathOf`) es una mejora de UX, no de seguridad. Cambiaría la salida del módulo copiado del fuente, así que se deja para CORE-3 con una decisión propia. **→ Hecho en CORE-3 (D-15).**
- **Seguimiento de la revisión (D-11b):**
  1. **La contención era solo léxica.** `writeFile` seguía enlaces ya presentes dentro de `outputDir`. Reproducido: un enlace `out/blog` apuntando fuera (una junction en Windows) y una página `/blog/post/` escribían fuera de `outputDir`. Corrección:
     - `assertNoLinkInside` hace `lstat` de cada componente existente entre `outputDir` (exclusive) y el destino. Rechaza enlaces simbólicos o junctions, componentes que no son directorio y destinos que no son un fichero regular.
     - La comprobación se aplica en la validación previa, **antes de la primera escritura**, a todas las rutas publicables **y** a los ficheros fijos (sitemap, robots, 404 y manifiesto). También se aplica de nuevo en cada `writeFile`.
     - `writeFile` crea los directorios nivel a nivel, volviendo a comprobarlos, en lugar de `mkdir` recursivo. Abre el fichero con `O_NOFOLLOW` donde existe; en Windows no existe y la barrera son las comprobaciones `lstat`.
     - `outputDir` puede ser un enlace: se trata como la raíz elegida por quien lanza la build.
     - Límite conocido: sigue existiendo una ventana TOCTOU si otro proceso crea un enlace entre la comprobación y la escritura, y los hardlinks no se detectan. Es aceptable para una herramienta de build que escribe en un directorio controlado por el operador.
  2. **Falsos positivos léxicos.** `isInside` usaba `rel.startsWith('..')` y rechazaba nombres válidos como `/..foo/` o `/.../`. Ahora solo rechaza `rel === '..'`, un prefijo `'..' + path.sep`, rutas absolutas y la propia raíz.
  - **Pruebas añadidas** (en el mismo fichero):
    - `isInside` unitario;
    - `routeFile` acepta `/..foo/`, `/.../` y `/a..b/`, y rechaza `/../x/` y `/a/../../x/`;
    - en preview y en production: páginas `/..foo/` y `/.../` materializadas dentro de `outputDir`; enlace de directorio hacia fuera rechazado sin salida parcial; symlink de fichero en `sitemap.xml` rechazado sin tocar su destino;
    - un `outputDir` que es a su vez un enlace sigue funcionando.
    - Si la plataforma no permite crear un tipo de enlace, esa prueba se omite indicando el motivo. En Windows sin privilegio, los symlinks de fichero dan EPERM y los de directorio se prueban con junction.
  - **Compatibilidad:** la paridad Restaurant sigue en 0 diferencias y los fixtures y el golden no cambian.

## D-12 · CORE-2 bloqueado por alcance; CORE-3 pasa a ser la siguiente fase Core-only

- **Contexto:** el roadmap ponía CORE-2 antes que CORE-3. CORE-2 consiste en sacar el bootstrap navegador de `core.js` a un loader del host, y eso exige migrar y validar el host Restaurantes Premium en su propio repositorio.
- **Regla de alcance vigente (25/09/2026):** el trabajo se hace exclusivamente en `Juanmaes83/RUBIK-SEO-GEO-CORE`, sin acceder, leer ni modificar el repositorio de Restaurantes ni ningún otro.
- **Decisión:**
  - CORE-2 queda ⛔ **bloqueado por alcance**. No se ha iniciado ni se declara completado, y el acoplamiento de `core.js` (D-07, primera fila) sigue igual;
  - CORE-3 se activa como la siguiente fase, porque solo afecta a módulos de este repositorio.
- **Alcance de CORE-3:**
  1. inyección explícita de Release B en Release C (D-13);
  2. vertical de Release E derivado del adapter activo (D-13);
  3. conectividad OpenSEO por `/api/health` (D-14);
  4. validación de rutas en el Page Registry (D-15).
- **Fuera de alcance:** el puente MCP y el backend de OpenSEO (CORE-7.1), multidioma y CORE-4…CORE-7.
- **Consecuencia:** CORE-7.1 sigue bloqueado. Su dependencia de CORE-3 queda en revisión (PR de CORE-3), pero dependen además de CORE-2 y de la Platform Layer.

## D-13 · Dependencias explícitas en Release C y Release E

- **Release C.**
  - Firmas nuevas: `intelligence.pages(config,{releaseB})` y `intelligence.entityGraph(config,{releaseB})`.
  - Se elimina la lectura de `globalThis.RubikSEOGeoReleaseB`, sin ningún fallback global.
  - Sin dependencia inyectada (`undefined`/`null`), el resultado es una lista vacía nueva en cada llamada: determinista y sin estado compartido. Es el mismo resultado que daba antes en Node.
  - Un valor inyectado sin `registry()` lanza `TypeError`, porque indica un error de cableado.
- **Release E.**
  - Firmas nuevas: `normalizePresenceRecord(input,{adapter})`, `normalizeCitationObservation(input,{adapter})` y `record(state,kind,value,{adapter})`. `adapter` es el descriptor del adapter activo (`{id, schemaType}`), tal como lo devuelven `core.adapter(config)` o `adapters.describe(config)`.
  - Release E sigue **sin dependencias de módulo**, así que no se crea ningún ciclo. Hoy no hay ningún llamador de Release E dentro de este repositorio: el llamador es el Studio del host.
  - Los registros de presencia y las observaciones de cita incluyen ahora `vertical` y `entityType`.
  - Con adapter, se toman `id` y `schemaType`. Si el input declara otro `vertical`, se lanza un error para no mezclar verticales.
  - Sin adapter, se conserva un `vertical` explícito del input o, si no hay, `UNKNOWN`. **Nunca `restaurant`.**
  - Un descriptor sin `id` o sin `schemaType` lanza `TypeError`.
  - Provenance y estados no cambian: sin mención ni cita, `status` sigue siendo `UNKNOWN`.
- **Compatibilidad:** la salida de `publish()`/`preview()` no cambia y el golden `source-388e48a-publish.json` queda intacto. Para el host es un cambio de contrato: al adoptar el Core (CORE-4) debe pasar `{releaseB}` y `{adapter}`. Sin ellos obtiene `[]` y `UNKNOWN`, sin errores silenciosos de vertical.
- **Pruebas:** `tests/core-3-explicit-injection.test.cjs` §1–§2. Incluyen seis adapters no Restaurant y Restaurant, un global contaminado que se ignora y entornos inyectados alternos sin contaminación entre llamadas.

## D-14 · Conectividad OpenSEO por `GET /api/health`

- **Corrige D-09:** `OpenSEOAdapter.connectivity()` ya no hace `GET` a la raíz. Solo consulta `GET <endpoint>/api/health` (respetando un posible path base del endpoint), con `accept: application/json` y sin credenciales.
- **Estados** (alineados con `integrations/OPENSEO.md` §7):

  | Respuesta de `/api/health` | Estado devuelto |
  |---|---|
  | `status:"ok"` | `NOT_CONNECTED` con `health:'ok'`, `reachable:true`, `authorization:'NOT_VERIFIED'` |
  | `status:"issues"` | `ERROR` con `failingChecks`: solo los nombres de los checks, nunca sus valores |
  | Sin JSON, payload inesperado, HTTP no 2xx o error de red | `ERROR` |
  | Endpoint vacío o inválido | `NOT_CONFIGURED` / `ERROR`, sin llamar a la red |

- **Por qué `NOT_CONNECTED` y no `CONNECTED`:** según OPENSEO.md §7, `CONNECTED` exige que el health esté bien **y** que la autenticación MCP (`whoami`) funcione. Esa comprobación la hará el puente server-side (CORE-7.1), que no existe todavía. Una instancia sana pero sin autorización verificada es, por definición de §7, `NOT_CONNECTED`. Se corrige en consecuencia la redacción de §4 paso 3, que decía «`ok` ⇒ `CONNECTED`».
- El test heredado de Release C que esperaba `CONNECTED` ante un GET 200 con cualquier JSON ahora espera `ERROR`: es exactamente el falso positivo de D-09.
- No se implementan el puente MCP, el backend ni las credenciales, y no se hacen llamadas de red (todo con mocks locales). `crawl()` sigue con el contrato heredado (D-09) hasta CORE-7.1.

## D-15 · Validación de rutas en el Page Registry (compromiso de D-11)

- `release-b` añade `unsafePathReason(path)`, exportada, con las mismas reglas que la barrera del materializer. Rechaza segmentos `.`/`..` (también con codificación %), separadores codificados (`%2f`, `%5c`), barra invertida, `:`, NUL y codificación % mal formada. Conserva como válidos `/..foo/`, `/.../`, `/a..b/` y los acentos.
- **Al crear o migrar:** `createPage` y `migratePath` lanzan `unsafe page path` y no modifican el Project State (ni la página ni los redirects).
- **Al normalizar:** una ruta insegura ya guardada no se reescribe en silencio. `pageContract` añade el bloqueo `unsafe-path` (mensaje «Ruta insegura…»), así que `canPublish` es falso, la auditoría la muestra y queda fuera del sitemap y de la materialización.
- **Defensa en profundidad:** la barrera del materializer (D-11) se mantiene. Los e2e de materialización con `/../../escape/` pasan a comprobar el primer bloqueo (el Page Registry la bloquea y la build la omite, sin escribir fuera) y que `routeFile` sigue rechazando esa ruta. La barrera física (enlaces) sigue cubierta por sus e2e.
- **Compatibilidad:** las rutas válidas no cambian y el golden queda intacto.


## D-16 · Microcopy de conectividad OpenSEO pendiente

- **Contexto:** tras CORE-3 (D-14), `connectivity()` consulta `/api/health` y devuelve `NOT_CONNECTED` con `authorization: 'NOT_VERIFIED'` cuando la instancia responde correctamente. Un mensaje de éxito asociado todavía puede dar a entender que la autorización MCP ya fue verificada por un puente server-side.
- **Decisión:** se aplaza la corrección de ese texto para una fase posterior. No se cambia ahora el código ni el contrato de estados: mientras no exista y se valide el puente MCP, no declarar `CONNECTED`; conservar `NOT_CONNECTED` / `NOT_VERIFIED`.
- **Trabajo posterior:** ajustar el mensaje para que indique que el health responde, pero que la autorización MCP aún no se ha verificado. Añadir o actualizar la prueba de texto junto con la corrección, sin relajar las pruebas de estado.

## D-17 · `entityGraph().products` desde el contrato de oferta del adapter (CORE-3.1)

- **Contexto:** tras CORE-3, `intelligence.entityGraph()` seguía leyendo `config.dishes` directamente, una forma de Restaurant. En un proyecto `real-estate` con `services`, `products` quedaba vacío, y en cualquier vertical con un `dishes` ajeno lo habría leído.
- **Contrato detectado** (sin inventar un campo común): cada adapter ya expone `source(config).offerings`, que `publish`, `preview` y `signature` usan desde Release D.
  - `restaurant`: `config.dishes` con `enabled!==false`, valores visibles con `pub()`; conserva las filas sin nombre.
  - Los seis genéricos (`offerRows`): el **primer array presente** entre `services`, `products` y `offerings` (aunque esté vacío), con `name`, o `title` si falta, y `enabled!==false`; descarta las filas sin nombre visible.
  - `core.source(config)` resuelve el adapter activo.
- **Decisión:**
  - Nueva función `intelligence.products(config,{core})`. `entityGraph(config,{releaseB,core})` la usa, con cada dependencia inyectada de forma independiente.
  - `products` mantiene su forma `{id,name,origin}` y los valores salen de `offerings`.
  - Sin `core` inyectado devuelve una lista vacía nueva, sin fallback global y sin default de Restaurant (mismo patrón que `pages`, D-13).
  - Un `core` sin `source()` lanza `TypeError`.
  - Las entradas `null` en el array de oferta lanzan `TypeError`, igual que `core.source`: se hereda el contrato del adapter, sin reparación silenciosa.
- **Compatibilidad Restaurant:** con el fixture LÚMINA, el resultado coincide con la proyección anterior sobre `dishes`. Diferencias intencionadas y ya propias del contrato del adapter:
  - los valores privados (`{value,visibility:'private'}`) dejan de exponerse;
  - un `origin` ausente pasa de `undefined` a `''`.
- **Contrato del host:** `entityGraph` necesita `{core}` además de `{releaseB}`. Sin `core`, `products` queda vacío.
- **Golden:** `publish()`/`preview()` no usan Intelligence. El golden `source-388e48a-publish.json` y los fixtures no cambian (blob `5aa93a3` idéntico a `main`).
- **Pruebas:** `tests/core-3-1-entity-products.test.cjs`, 16 tests.
- **Deuda restante, fuera de este alcance:**
  - `geoReadiness()` sigue leyendo `config.dishes` para sus señales heurísticas de producto; **→ abordado en CORE-3.2 (D-18)**, junto con `business`/`location`;
  - `entityGraph().business` y `.location` leen `brand.name` y `modules.location.address`, sin las alternativas `business.*` de los adapters genéricos.

## D-18 · Intelligence sin acoplamientos verticales: `geoReadiness()` y `entityGraph().business/location` (CORE-3.2)

- **Contexto (D-17):**
  - `geoReadiness()` leía `config.dishes`, `brand.name` y `modules.location.address.city`;
  - `entityGraph().business` y `.location` leían `brand.name` y `modules.location.address` en bruto, sin las alternativas `business.*` de los adapters genéricos y sin respetar la visibilidad.
- **Contrato observado** (`src/rubik-seo-geo-adapters.js`, sin cambios): `source(config)` de los 7 adapters devuelve `name`, `city`, `address` y `offerings`, con valores visibles vía `pub()`.
  - `address` usa claves de schema.org: `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry`.
  - `restaurant` (`restaurantSource`): `name` = `brand.name`; `address` desde `modules.location.address`, y `visit.address` como calle heredada.
  - Los genéricos (`genericSource`/`addressFrom`): `name` = `brand.name` o `business.name`; `address` desde `modules.location.address` o `business.address`, más `visit.address`.
- **Decisión** (`src/rubik-seo-geo-intelligence.js`):
  - **Resolución única del source:** `adapterSource(config,{core})` resuelve `core.source(config)` una vez. Devuelve `null` si no hay `core` y lanza `TypeError` si `core` no tiene `source()`. `products()` y `entityGraph()` la reutilizan, y la proyección de oferta (`offeringsOf`) es la de D-17, sin duplicar lo que hacen los adapters.
  - **`entityGraph(config,{releaseB,core})`:** `business` = `text(source.name)`, `location` = copia de `source.address`, `products` = oferta del adapter, `pages` = `pages(config,{releaseB})` (D-13) y `people` = `config.seo.people` (namespace propio del Core). Sin `core`: `business:''`, `location:{}`, `products:[]`.
  - **`geoReadiness(config,{schemaGraph,publicHtml,core})`:** las señales `businessName`, `location` (`source.city`) y `products` (`source.offerings`) salen del adapter. Los gaps, las fortalezas y debilidades de cita y `content.factualSignals` se calculan igual que antes, sobre esos datos.
    - Sin `core`: `entity.adapterSource:'NOT_PROVIDED'`, esas tres señales a `null` (desconocidas, nunca `false`), sin gaps ni fortalezas o debilidades inferidas y `factualSignals:null`.
    - Con `core`: `adapterSource:'PROVIDED'`.
    - Todo sigue etiquetado como HEURISTIC y `technical`/`aiSearch` no cambian.
- **Cambios de contrato para el host (CORE-4):**
  1. `entityGraph().location` pasa de la forma del host (`street`/`city`… en bruto) a la `address` de schema.org del adapter, **solo con valores públicos**;
  2. `geoReadiness` necesita `{core}` para sus señales de entidad;
  3. `business` y `location` quedan vacíos sin `core`.
- **Sin cambios:** adapters, Publisher, materializer, `products()` (D-17) y `pages()` (D-13). El golden `source-388e48a-publish.json` y los fixtures son idénticos a `main` (blob `5aa93a3`), porque `publish()`/`preview()` no usan Intelligence. Sin dependencias circulares: `core` se inyecta y el módulo no lo importa.
- **Pruebas:** `tests/core-3-2-neutral-intelligence.test.cjs` (24). Cubren los 7 adapters, las formas genéricas `business.*` y `services|products|offerings`, la visibilidad, la calle sin ciudad, datos incompletos, Core ausente o inválido, globals contaminados, resolución única y la copia de `location`.
- **Deuda restante:** las dos lecturas que quedan en Intelligence, `config.seo.people` y los campos de integraciones, pertenecen al namespace `seo` del Core, no a un vertical. No quedan lecturas de rutas propias de Restaurant en `src/rubik-seo-geo-intelligence.js` (lo verifica la prueba de código fuente). D-16 sigue aplazada.

## D-19 · Contrato multidioma del Core (CORE-6)

**Estado:** CORE-6 cerrado. El contrato se definió antes de implementar; la implementación de `feat/core-6-multilingual` se fusionó mediante PR #9 en `main@304f655` el 25/09/2026.

### Especificación local disponible (única fuente)

- `upstream/SEO-GEO-RELEASE-A-CONTRACT.md` §3 · TECH DEBT · MULTILINGUAL SEO. Exige:
  - contenido real por locale, nunca sustitución de cadenas;
  - metadata, Page Registry y canonical por locale;
  - hreflang solo entre URLs equivalentes reales;
  - `schema/inLanguage` y estado AUTO/CUSTOM por locale;
  - un flujo de traducción revisado por personas.
  - Prohíbe simular inglés traduciendo solo palabras sueltas.
- `upstream/SEO-GEO-ENGINE-ARCHITECTURE.md`:
  - §6 `seo.site` con `locale`, `defaultLanguage` y `supportedLanguages`;
  - §10, cada página indexable puede tener «language/hreflang cuando proceda»;
  - §17, «Hreflang sólo si existen versiones lingüísticas reales y equivalentes. No crear hreflang a páginas inexistentes», y un sitemap solo con URLs canónicas, indexables y publicadas.
- Código actual:
  - `core.reconcile` fuerza `defaultLanguage:'es'` y `supportedLanguages:['es']`;
  - las fórmulas AUTO del HOME solo existen en español (`templateId … .es`);
  - Publisher y materializer emiten `lang="es"`;
  - los adapters devuelven `language:'es'`;
  - no existe hreflang;
  - las comparaciones de duplicados de title y description ignoran el idioma.

La especificación **no** define: sintaxis de locales, representación de correspondencias, `x-default`, sitemap con alternates ni localización de la entidad o de los adapters. En esos puntos se elige el comportamiento conservador que preserva el contrato actual.

### Decisiones

1. **Identificadores y normalización (`core.normalizeLocale`).**
   - Se acepta un subconjunto de BCP 47: idioma de 2–3 letras y región opcional de 2 letras o 3 dígitos, con `-` o `_` como separador.
   - Se normaliza a idioma en minúsculas y región en mayúsculas: `en_gb` → `en-GB`, `ES` → `es`.
   - Cualquier otra forma (scripts como `zh-Hant`, variantes, extensiones, cadenas vacías o no textuales) es inválida y devuelve `''`.
   - *Límite:* los scripts y las variantes quedan para una decisión futura.

2. **Idioma predeterminado y habilitados (`core.languageSettings`, aplicado en `reconcile`).**
   - `defaultLanguage` sigue fijado en `es` en esta fase. Motivo: las fórmulas AUTO, el HOME y la etiqueta de los adapters son solo en español. Otro idioma por defecto publicaría texto español bajo otra etiqueta (fallback silencioso en el idioma equivocado).
   - `supportedLanguages` = `es` más los locales válidos que declare el host en `seo.site.supportedLanguages`, normalizados, sin duplicados y en su orden. Los inválidos se descartan.
   - No se añade ningún idioma obligatorio más allá del `es` ya existente.
   - Con `['es']`, o sin declararlo, el resultado es `['es']`: idéntico al actual.

3. **Representación del contenido localizado (responsabilidad del host).**
   - Cada versión lingüística es **una página propia** del Page Registry (`seo.pages[id]`), con su `path` explícito (por ejemplo `/en/about/`), su contenido y su metadata (`title`, `description`, `h1` y `seo.*`, con AUTO/CUSTOM por página, es decir, por locale).
   - La página declara `locale`; si falta, se usa `defaultLanguage`.
   - La correspondencia entre traducciones se declara con **`translationKey`**: todas las páginas con la misma clave son versiones del mismo contenido. No se infiere nada de la URL, el slug ni la similitud del texto.
   - El Core **no genera ni inventa traducciones**. La revisión humana de las traducciones es responsabilidad del flujo del host; el Core no la simula con ningún indicador.

4. **Resolución de rutas y páginas sin traducción (Page Registry).**
   - Las rutas son las declaradas por el host. No se derivan prefijos de locale.
   - Siguen valiendo la unicidad global de `path` (`duplicate-path`) y la seguridad de rutas (D-11, D-15).
   - Si una página no tiene traducción a un locale, **no existe** URL en ese locale. No hay fallback que sirva la versión por defecto bajo una ruta de otro idioma.
   - Nuevos bloqueos de contrato:
     - `invalid-locale`: el locale declarado no es válido;
     - `unsupported-locale`: el locale no está en `supportedLanguages`;
     - `home-requires-default-locale`: una página `pageType:'home'` solo puede estar en el idioma por defecto, porque su grafo y sus fórmulas son del HOME español.
   - Una versión localizada de la portada es una página propia de otro tipo (por ejemplo `generic`, en `/en/`).

5. **Metadata por locale.**
   - Cada página aporta la suya. Las páginas de locales distintos del predeterminado no tienen fórmulas AUTO, así que sin title, description o H1 reales quedan bloqueadas por los contratos ya existentes (`missing-*`).
   - Los duplicados de title y description (`duplicate-title`/`duplicate-description`) se comparan **solo entre páginas del mismo locale**, con minúsculas propias de ese locale. Una traducción que conserve la marca como título no bloquea. En un sitio monolingüe el comportamiento es idéntico.

6. **Canonical AUTO/CUSTOM por locale.**
   - AUTO: `baseUrl` + la ruta de la propia página localizada.
   - CUSTOM: se mantiene el contrato de Release B/Hardening B. Solo es publicable si coincide con la URL propia de esa página; cualquier otro valor es `canonical-conflict`.
   - Si el canonical CUSTOM apunta a la URL de una página de **otro locale**, se añade además `cross-locale-canonical`: una traducción no se canonicaliza hacia otro idioma.
   - *Límite:* no se admiten canonicals de consolidación hacia otra URL, igual que hoy.

7. **Equivalencia y elegibilidad para hreflang.**
   - Una página es elegible si cumple todo esto: `canPublish` es verdadero (publicada, indexable y con contrato OK); no tiene `canonicalConflict`; su locale es válido y está soportado; declara `translationKey`; y hay URL absoluta (producción con `baseUrl` válida).
   - Dos páginas elegibles son equivalentes si comparten `translationKey` y tienen locales distintos.
   - Si varias páginas elegibles comparten clave **y** locale, ese locale es ambiguo: se excluye del grupo y se marca con el aviso `ambiguous-translation`.
   - Solo hay hreflang si quedan **al menos dos locales distintos**.

8. **Reciprocidad.**
   - El grupo es un grafo completo. Cada miembro elegible emite `<link rel="alternate" hreflang="<locale>" href="<canonical>">` para **todos** los miembros, incluido él mismo, en orden determinista por locale.
   - Como todos ven el mismo conjunto, la relación es recíproca por construcción.
   - Una página no elegible (draft, noindex, bloqueada, con locale no soportado o sin clave) no emite hreflang y ningún miembro apunta a ella.
   - Nunca se apunta a rutas inexistentes ni a idiomas no soportados.
   - Una página con clave pero sin otro locale elegible recibe el aviso `no-hreflang-alternate`.

9. **Dónde se emite.**
   - Solo en el `<head>` de producción (`data-rubik-seo="hreflang"`), junto al canonical. En preview no se emite, porque no hay URLs absolutas y la página es noindex.
   - El sitemap **no cambia de formato**: lista, como hoy, cada URL canónica publicable de cualquier locale y omite las páginas no publicables, noindex o no traducidas.
   - No se añaden alternates `xhtml:link` al sitemap: basta un único método (el head) y así el sitemap monolingüe sigue siendo idéntico.

10. **`x-default`: no se emite.** La especificación no lo menciona y el Core no tiene una página selectora de idioma ni una política de redirección por idioma que lo justifique.

11. **Idioma del documento y schema.**
    - `renderPage` usa `<html lang="<locale de la página>">`, que es `es` en las páginas por defecto (idéntico).
    - La portada materializada conserva el `lang` de la plantilla del host (idioma por defecto) y la página 404 sigue en `es`.
    - `inLanguage` se añade al `WebPage` del grafo **solo cuando el sitio declara más de un idioma soportado**. Así el grafo y el golden monolingües no cambian.
    - Los artículos del blog (`derivedBlogPages`) siguen en el idioma por defecto en esta fase.

12. **Responsabilidades.**
    - **Host:** declarar `supportedLanguages`, crear las páginas localizadas con contenido y metadata reales, sus rutas y su `translationKey`, y revisar las traducciones.
    - **Adapter:** sin cambios. Sigue siendo agnóstico de idioma y la entidad (negocio, dirección, oferta) se comparte entre locales.
    - **Core:** normalizar, validar, bloquear, calcular la equivalencia y emitir hreflang, `lang` e `inLanguage`.
    - *Límite:* la localización de la entidad schema.org, de los datos de adapter, de los artículos y de las fórmulas AUTO en otros idiomas no forma parte de esta fase.

### Compatibilidad exigida

Con `supportedLanguages:['es']` (la configuración actual), `publish()`, `preview()`, el sitemap, los HTML materializados y el golden `source-388e48a-publish.json` deben ser idénticos byte a byte, y las barreras de rutas (D-11, D-15) no cambian. Cualquier diferencia exigiría detenerse y registrar una nueva decisión.

### Implementación (CORE-6, PR #9 fusionado)

- **`core`:**
  - exporta `normalizeLocale` y `languageSettings`; `reconcile` aplica `languageSettings`;
  - `schemaGraph` añade `WebPage.inLanguage` solo si hay más de un idioma;
  - el check `deferred` de `preview` cambia de texto solo en sitios multidioma.
- **`release-b` (Page Registry):**
  - `normalizePage` añade `locale` (normalizado, o el valor declarado si es inválido, para que el contrato lo bloquee) y `translationKey`;
  - `pageContract` añade `invalid-locale`, `unsupported-locale`, `home-requires-default-locale` y `cross-locale-canonical`, y compara los duplicados por locale;
  - la nueva función `alternates(config,page)` devuelve los miembros de su grupo `{id,locale,path,url}`;
  - `audit` añade los avisos `translation.ambiguous-translation` y `translation.no-hreflang-alternate`. Van en la auditoría y no en el contrato de la página, para no crear una recursión con `registry`.
- **`publisher`:**
  - emite `<link rel="alternate" hreflang>` solo en páginas `live` de producción;
  - `<html lang>` por página;
  - `inLanguage` por página en sitios multidioma.
- **Materializer:** sin cambios. Las rutas localizadas pasan por las mismas barreras (D-11, D-15).
- **URL de los alternates:** es exactamente la del `<link rel="canonical">` publicado; la home conserva la barra final de `baseUrl`. Se detectó que `canonicalFor`, y con él el sitemap, escribe la home **sin** barra final, a diferencia del canonical emitido. Es una incoherencia previa que se deja **sin cambiar**, porque modificarla alteraría el golden. Queda registrada como deuda.
- **Evidencia:**
  - `tests/core-6-multilingual.test.cjs` (19 pruebas, 15 de ellas fallan con el `src/` de `main`);
  - comparación byte a byte con `main` de `publish`, `preview`, `audit` y los HTML materializados para tres configuraciones monolingües: 0 diferencias;
  - golden (blob `5aa93a3`) y fixtures sin cambios.

- **`apply()` (revisión del PR #9):** está limitado a la portada por diseño. Inyecta `publish().publisher.head`, que es el `<head>` del HOME, y el HOME solo existe en el idioma por defecto (`home-requires-default-locale`). `<html lang>` se toma ahora de `seo.site.defaultLanguage` reconciliado en lugar del literal `'es'`; el valor es el mismo, `es`. No acepta ni resuelve una página localizada, y un argumento extra se ignora. Las páginas localizadas obtienen su `lang` real con `renderPage` (`publish().publisher.pages` y el materializer). Las pruebas fijan ambos casos.

**Cierre de CORE-6:** CI de PR #9 verde sobre HEAD `01076e49`: Node 20.20.2 y 22.23.2, 174/174 pruebas en cada job, 0 omitidas; syntax, documentación y smoke CLI verdes (run `36115604817`). Merge commit `304f6555416210ff562343dea20a4a22db252a67`. Sin deploy ni validación en host.


## D-20 · SEO off-page como fase explícita y Platform Layer al final

**Origen:** decisión aprobada por el usuario tras revisar el estado de Release E, Intelligence y la arquitectura host/Core. Esta decisión fija la secuencia futura; no declara capacidades externas ya implementadas.

1. **SEO off-page se incorpora como CORE-8.** Parte de los contratos ya existentes de Release E (presencia, menciones, citas y provenance) y de Intelligence (fuentes de backlinks). CORE-8 debe definir/implementar en el Core contratos neutrales, normalización y análisis auditable de observaciones externas: backlinks, menciones/citas y presencia local. Cada observación necesita fuente, fecha y evidencia suficiente para poder revisarla; las fuentes parciales se etiquetan como tales y la ausencia de datos se mantiene como `NOT_MEASURED`/`UNKNOWN`, nunca como cero o puntuación inventada.
2. **Límites de CORE-8:** el Core no adquiere storage, secretos ni llamadas autenticadas a proveedores; el host conserva la persistencia en su Project State. CORE-8 puede trabajar con datos explícitamente aportados o importados y fixtures deterministas. No crea, compra, intercambia ni automatiza enlaces; no promete posiciones y no produce un score opaco de autoridad. Las acciones off-site se presentan como recomendaciones/tareas revisables por una persona.
3. **CORE-7/7.1 se preparan antes de la plataforma:** contratos, mapeos y pruebas con mocks pueden hacerse Core-only. Conexiones reales a Release E, Search Console/Bing, OpenSEO/MCP u otros proveedores quedan aplazadas hasta la fase final.
4. **CORE-9 es la última fase: Platform Layer multi-proyecto.** Diseñar un plano de control con backend, autenticación/roles, almacenamiento seguro de secretos, trabajos programados, conectores, provenance y audit log. Activará las integraciones reales preparadas en CORE-7/7.1/8. El Project State, Studio, Media Library y Page Registry canónicos siguen perteneciendo a cada host; la plataforma no los duplica.
5. **Límite de repositorio:** la futura aplicación de plataforma se tratará como producto/proyecto separado. Esta decisión no autoriza acceder ni cambiar otro repositorio, y no cambia el alcance actual de RUBIK-SEO-GEO-CORE.

**Secuencia aprobada:** CORE-6 → CORE-7 (contratos/mocks) → CORE-8 (SEO off-page Core-only) → CORE-9 (Platform Layer final; activación de proveedores reales). CORE-2/4/5 siguen condicionadas a adopción/validación de host y no se consideran resueltas por D-20.

## D-21 · Contratos neutrales de integración para Release C y Release E (CORE-7)

**Estado:** implementado en la rama `feat/core-7-provider-contracts`. En progreso hasta su merge. No activa ningún proveedor real; eso corresponde a CORE-9, según D-20.

- **Problema:** las integraciones heredadas (`SearchConsoleAdapter`, `DataForSEOAdapter`, `OpenSEOAdapter` y las funciones de Release E) ya tienen estados honestos, pero cada una resuelve a su manera la procedencia, los errores, los datos parciales y el coste. Ninguna fija un sobre común ni límites de uso verificables. Para CORE-9 hace falta un contrato estable al que conectar transportes reales sin cambiar el Core.
- **Decisión:** nuevo módulo `src/rubik-seo-geo-providers.js` (export `./providers`), sin dependencias, que no importa `core`, `intelligence` ni `release-e`. Los contratos existentes **no cambian** y el golden queda intacto.
  1. **Catálogo declarativo** (`catalog`/`describe`): proveedor → operaciones, con `release` (C/E), `costModel` (`free`/`quota`/`paid`), `units` por petición, `sourceType` (vocabulario de Release E), `target` y `auth` descriptivo (siempre server-side).
     - Sin endpoints, claves ni tarifas.
     - Proveedores: `search-console` (`searchAnalytics` C, `urlInspection` E1), `bing-webmaster` (`urlInfo` E1), `indexnow` (`submit` E1), `dataforseo` (`keywords`/`serp`/`backlinks` C, de pago), `manual-import` (`presence`/`citation` E2/E4) y `openseo` (`siteAudit`, **diferido a CORE-7.1**).
  2. **Dependencias explícitas.** `runProviderRequest({provider,operation,input,transport,clock,budget,cache,confirmCost,maxRows})`:
     - `transport` es `{kind:'mock'|'live', request(op,input)}` y lo inyecta el host o la futura plataforma;
     - `clock` hace que las fechas sean deterministas; `cache` es un Map-like en memoria que aporta quien llama; `budget` es un valor, se devuelve actualizado y no se muta;
     - no usa `fetch`, `process.env` ni storage.
  3. **Sobre de resultado** (inmutable), con `status` ∈ `OK`, `PARTIAL`, `EMPTY`, `NOT_CONFIGURED`, `NOT_CONNECTED`, `NOT_MEASURED`, `COST_CONFIRMATION_REQUIRED`, `BUDGET_EXCEEDED`, `RATE_LIMITED`, `ERROR` o `STALE`. Además lleva `data`, `partial`, `errors[]`, `cost`, `budget`, `cached`, `connection` y `provenance`.
  4. **Provenance: fuente, fecha y evidencia.** Incluye `provider`, `sourceType`, `operation`, `requestedAt`, `capturedAt` y `method` (`api` solo con un transporte `live`; si no, `mock`).
     - La `evidence` está en lista blanca: `rowCount`, `httpStatus`, `requestId`, `externalId`, `sourceUrl` redactada, `providerVersion`, `expected` y `truncated`.
     - Nunca se copian cabeceras ni cuerpos crudos.
  5. **Estados honestos.**
     - Sin transporte → `NOT_CONNECTED`, sin llamar a nada.
     - `rows` ausente → `NOT_MEASURED`; `rows:[]` → `EMPTY`.
     - `connection:'VERIFIED'` solo con un transporte `live` que ha respondido. **Un mock nunca verifica una conexión.**
     - OpenSEO devuelve `NOT_CONFIGURED`/`BRIDGE_PENDING`.
  6. **Errores:**
     - `401` → `NOT_CONNECTED`/`AUTH`; `403` → `ERROR`/`FORBIDDEN`; `5xx` → `ERROR` reintentable; `429` → `RATE_LIMITED` con `retryAfterSeconds`;
     - una excepción → `TRANSPORT_ERROR`, o `TIMEOUT` si es un `AbortError`;
     - los mensajes se limitan a 200 caracteres y se redactan (credenciales en URL, parámetros `key`/`token`/`sig`, `Bearer`/`Basic`);
     - no hay reintentos automáticos.
  7. **Datos parciales:** `truncated`, filas esperadas que faltan, filas inválidas (o con campos secretos), errores por elemento o el recorte `maxRows` → `PARTIAL`, con `partial.{received,expected,rejected,capped,reason}`. Nunca se rellena con ceros: las métricas ausentes siguen siendo `null` al mapear.
  8. **Límites de uso y coste:**
     - una operación `paid` exige `confirmCost:true` (si falta → `COST_CONFIRMATION_REQUIRED`, sin llamada);
     - `budget.{maxUnits,maxRequests}` se comprueba **antes** de llamar (`BUDGET_EXCEEDED`);
     - `cost.estimatedUsd` es siempre `null`, porque el Core no conoce tarifas;
     - la caché inyectada deduplica peticiones idénticas (clave estable, independiente del orden) con coste 0 y no guarda errores;
     - `markStale` marca como `STALE` un resultado antiguo y conserva datos y provenance.
  9. **Secretos:** cualquier campo tipo `apiKey`, `token`, `password` o `authorization` en el input se rechaza (`SECRET_IN_INPUT`) antes de llamar. Los secretos viven en el transporte server-side.
  10. **Mapeo a los contratos existentes, con módulos inyectados:**
      - `toReleaseC(result,{intelligence})` reutiliza `SearchConsoleAdapter.normalize` y `DataForSEOAdapter.normalizeKeywords`/`normalizeSerps`, con `measuredAt` igual a la fecha de captura;
      - `toReleaseE(result,{releaseE,adapter})` reutiliza `normalizeIndexationRecord`, `indexNowResult` (un envío nunca es `INDEXED`) y `normalizePresenceRecord`/`normalizeCitationObservation` con el descriptor del adapter (D-13, vertical neutral);
      - la provenance de Release E es `MEASURED` solo si `method:'api'`; con un mock queda `UNKNOWN`;
      - los resultados de C no se mapean a E ni al revés.
- **Fuera de alcance:** transportes reales, backend, OAuth, secretos, trabajos programados e historial persistente (CORE-9); el puente OpenSEO/MCP (CORE-7.1). `crawl()` y `connectivity()` heredados siguen como estaban (D-09, D-14). D-16 sigue aplazada.
- **Evidencia:**
  - `tests/core-7-provider-contracts.test.cjs` (18 pruebas);
  - verificación por mutación: marcar un mock como verificado, quitar la confirmación de coste o convertir `NOT_MEASURED` en `OK` rompe al menos una prueba;
  - golden y fixtures sin cambios.

### Correcciones tras la revisión del PR #10

1. **Secretos.**
   - **Búsqueda de claves:** el recorrido del input es completo, sin límite de profundidad, cubre arrays y es seguro ante ciclos. Las claves se comparan sin separadores ni mayúsculas, así que `x-api-key`, `client_secret`, `refresh_token`, `accessToken`, `Passwd`, `password`, `authorization`, `cookie`, `private_key` o `key` se detectan a cualquier profundidad.
   - **Valores con credenciales en el input:** URL con usuario y contraseña, parámetros sensibles, esquemas `Bearer`/`Basic`/`Token` o pares `clave=valor`. También se rechazan (`SECRET_IN_INPUT`); el mensaje dice «credential-like value» sin repetir el valor.
   - **Input no serializable:** un input con ciclos devuelve `ERROR`/`INVALID_INPUT` sin llamar al transporte.
   - **Redacción:** cubre usuario y contraseña en URL; parámetros `key`, `api_key`, `x-api-key`, `token`, `access_token`, `refresh_token`, `id_token`, `client_secret`, `secret`, `password`, `sig`, `auth` y `code`; esquemas `Bearer`/`Basic`/`Token`; y pares `clave: valor`, `clave=valor` y `"clave":"valor"`. Se aplica a mensajes de error (200 caracteres como máximo), a todos los campos de `evidence` y, sin truncar, a todos los textos de las filas aceptadas.
   - **Filas del proveedor:** una fila con una clave secreta, a cualquier profundidad, se rechaza y el resultado queda `PARTIAL`.
2. **Presupuesto.**
   - Las operaciones `quota` y `paid` exigen un presupuesto con `maxUnits` **y** `maxRequests` finitos y no negativos. Si falta o es inválido → `BUDGET_REQUIRED` (nuevo estado), **antes** de llamar al transporte.
   - Orden de comprobación: la confirmación de coste de `paid` sigue primero (`COST_CONFIRMATION_REQUIRED`), después `BUDGET_REQUIRED` y después `BUDGET_EXCEEDED`.
   - Las operaciones `free` (IndexNow, importación manual) no lo exigen.
   - `estimatedUsd` sigue siendo `null`.
   - Un resultado ya en la caché inyectada no llama ni cuesta, así que no necesita presupuesto.
3. **Backlinks (Release C → `intelligence.backlinks`, entrada de CORE-8).** Nuevo `normalizeBacklinks(rows,{measuredAt,provider})`, pequeño y neutral, porque el Core no tenía normalizador de backlinks. `toReleaseC` lo usa para `dataforseo.backlinks` en lugar de copiar las filas.
   - **Esquema de salida:** `{sourceUrl, targetUrl, sourceDomain, anchor|null, rel ('follow'|'nofollow'|'ugc'|'sponsored'|null), firstSeen|null, lastSeen|null, lost|null, sourceRank|null, measuredAt, provider}` más `provenance`.
   - **Alias de entrada aceptados:** `url_from`/`url_to`, `anchor_text`, `dofollow`, `first_seen`/`last_seen`, `is_lost` y `domain_from_rank`/`rank`.
   - **Valores ausentes o inválidos:** quedan en `null`, nunca en `0`.
   - **Filas sin URL http(s) de origen y destino:** se rechazan y el mapeo pasa a `PARTIAL` con `partial.rejectedByNormalizer`.
   - Las URLs y los anchors pasan por la redacción.
- **Límite conocido (conservador):** la detección por nombre de clave rechaza también claves no secretas con esos sufijos (por ejemplo `nextPageToken` o `key`). Si un proveedor necesitara paginación por token, el transporte debe gestionarla server-side, o se hará una excepción explícita cuando se active en CORE-9.
- **Evidencia adicional:**
  - 9 pruebas más en `tests/core-7-provider-contracts.test.cjs` (27 en total). Con el módulo anterior (`dcdbf61`) fallan 7 de ellas;
  - mutaciones: reintroducir un límite de profundidad, quitar `BUDGET_REQUIRED` o volver a copiar los backlinks sin normalizar rompe pruebas;
  - golden, fixtures y paridad sin cambios.
