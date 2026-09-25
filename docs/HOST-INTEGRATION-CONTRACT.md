# Contrato de integración para productos anfitriones

Qué debe aportar un producto Rubik (host) para usar Rubik SEO/GEO Core y qué le devuelve el Core. El contrato se deriva del código de `src/` y de la integración de referencia de Restaurantes Premium (`WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a`).

```text
HOST STUDIO ──edita──▶ HOST PROJECT STATE (runtime) ──lee──▶ VERTICAL ADAPTER ──▶ CORE
                              ▲                                                  │
                              └────────────── config.seo (reconcile) ◀───────────┤
HOST TEMPLATE + renderHomeBody ──▶ MATERIALIZER ◀── PUBLISHER ◀── PAGE REGISTRY ◀┘
                                        │
                                        ▼
                      HTML por ruta · sitemap.xml · robots.txt · 404 · seo-geo-routes.json
```

---

## 1. Obligaciones del host

| # | El host aporta | Detalle |
|---|---|---|
| H1 | **Un único Project State** | Un objeto runtime plano. El Core no guarda nada: ni storage propio, ni blobs, ni caches (lo verifican `core-independence` y `release-d`). |
| H2 | **`config.seo`** | Namespace SEO/GEO dentro de ese mismo estado. Se inicializa con `core.defaults()` y se persiste con lo que devuelve `core.reconcile(config)`. En Project Model v5 es `seoGeo`, proyectado a `config.seo` mediante `toRuntime()`. |
| H3 | **`config.seo.adapterId`** | Uno de los adapters registrados (§3). Si falta, el Core usa `restaurant` cuando `seo.business.businessType` está vacío o vale `restaurant`, y `generic-local-business` en cualquier otro caso. |
| H4 | **Datos fuente en las rutas que lee el adapter** | Ver §2. El Core **nunca** duplica un dato editable: title, description y H1 AUTO se derivan de esas rutas y registran `derivedFrom`. |
| H5 | **Visibilidad explícita de datos personales** | `seo.visibility.{address,phone,email}` vale `'public'` o `'private'`, y además hace falta `seo.business.publicDataConfirmed` con `confirmationSignature === core.signature(config)`. Si falta cualquiera de las dos cosas, NAP no entra en el schema. |
| H6 | **URL productiva HTTPS** | `seo.site.baseUrl`: HTTPS, sin credenciales, query ni fragment, y nunca localhost ni IP privada. Sin ella no hay canonical, el robots es `noindex` y el materializer de producción se niega a ejecutarse. |
| H7 | **Plantilla HOME + `renderHomeBody`** | Para materializar, el host entrega su HTML de HOME y, opcionalmente, `renderHomeBody(template,state)`, que pinta su contenido en esa plantilla. El Core retira el `<head>` SEO marcado con `data-rubik-seo` e inyecta el del Publisher. La plantilla final debe tener **exactamente un `<h1>`** y una jerarquía de headings sin saltos dentro de `<main>`/`<article>`. |
| H8 | **Secretos fuera del navegador** | Credenciales de OpenSEO, Search Console, DataForSEO, Bing o IndexNow: solo server-side. El Core rechaza endpoints con credenciales embebidas y no guarda tokens en el Project State. |
| H9 | **Idioma** | `es` es el idioma por defecto (fórmulas AUTO y HOME en español). Para otros idiomas (D-19, CORE-6 en progreso), el host: (1) declara `seo.site.supportedLanguages` (locales BCP 47 idioma[-REGIÓN]); (2) crea **una página por idioma** en `seo.pages` con `locale`, `path` propio, contenido y metadata reales; (3) enlaza las traducciones con el mismo `translationKey`; y (4) revisa las traducciones. El Core no genera traducciones ni infiere equivalencias por URL; la portada traducida es una página propia (no `pageType:'home'`). |

## 2. Rutas del Project State que leen los adapters

| Dato | Adapter `restaurant` | Adapters genéricos (`real-estate`, `professional-service`, `fitness-wellness`, `hospitality`, `retail`, `generic-local-business`) |
|---|---|---|
| Nombre | `brand.name` | `brand.name` \| `business.name` |
| Descripción | `hero.body` | `hero.body` \| `business.description` |
| Categoría | `seo.business.category` | `seo.business.category` \| `business.category` |
| Especialidad | `seo.business.cuisine[]` | — |
| Dirección | `modules.location.address.{street,city,region,postalCode,country}` → `visit.address` (legacy) | `modules.location.address` \| `business.address` → `visit.address` |
| Teléfono | `modules.location.phone` | `modules.location.phone` \| `business.phone` |
| Email | `visit.contact` | `visit.contact` \| `business.email` |
| Acción principal | `visit.bookingUrl` (HTTPS) | `visit.bookingUrl` \| `business.primaryUrl` (HTTPS) |
| Horario | `modules.location.hours` \| `visit.service` | `… \| business.hours` |
| Oferta | `dishes[]` | primera lista presente entre `services[]`, `products[]` y `offerings[]` |
| Media | `media.<ref>` (`type`, `url`/`publicUrl`, `width`, `height`, `alt`…) | igual |

Cada valor puede ser un string o `{value, visibility}`. En el segundo caso solo se usa si `visibility==='public'`.

## 3. Adapters verticales registrados

| `adapterId` | schema.org | Fallback de categoría |
|---|---|---|
| `restaurant` (por defecto) | `Restaurant` (+ `servesCuisine`) | Restaurante |
| `real-estate` | `RealEstateAgent` | Servicios inmobiliarios |
| `professional-service` | `ProfessionalService` | Servicios profesionales |
| `fitness-wellness` | `SportsActivityLocation` | Fitness y bienestar |
| `hospitality` | `Hotel` | Alojamiento |
| `retail` | `Store` | Comercio |
| `generic-local-business` | `LocalBusiness` | Negocio local |

Un adapter nuevo se registra con `adapters.register({id,label,schemaType,entityId,categoryFallback,source(config),home(source),entity(source,ctx)})`. Solo proyecta: no puede tener storage, media, páginas ni publicación propios.

## 4. Contrato del Studio anfitrión

El Core no incluye UI. Un Studio anfitrión (el de Restaurantes sirve de referencia, aunque no se copia) debe:

1. **Leer y escribir** en el mismo Project State con una API de rutas. En Restaurantes es `window.RestaurantStudioConfig` con `get(path)`, `set(path,value)`, `patch(obj)` y `snapshot()`, las cuatro operaciones que usan los Studio SEO del fuente. No hay un segundo formulario de nombre o ciudad: la UI SEO apunta a la ruta fuente.
2. **Reconciliar tras cada cambio** con `core.reconcile(config)` y mostrar `core.preview(config).checks` (PASS/WARNING/ERROR/BLOCKER/OPPORTUNITY/DEFERRED). Debe respetar el modo AUTO/CUSTOM: un campo CUSTOM nunca se sobrescribe. **Dependencias explícitas (D-13):** al usar Intelligence y Release E, el Studio pasa `{releaseB}` a `intelligence.pages`/`entityGraph`, `{core}` a `entityGraph`/`products`/`geoReadiness` para negocio, ubicación y productos del adapter activo (D-17, D-18) y `{adapter: core.adapter(config)}` a los registros de presencia y cita de Release E. El Core no lee globales del host para eso.
3. **Notificar cambios aplicados** para que el panel se vuelva a renderizar. En Restaurantes, el evento `document` es `restaurant:config-applied`. Un host nuevo debe emitir un evento equivalente, o llamar al render del panel.
4. **Cargar bajo demanda.** El host emite `rubik:seo-geo-request` cuando el usuario abre SEO·GEO y entonces carga los módulos, en este orden de dependencias: `adapters → core → media → release-b → publisher → intelligence → release-e`. Las capacidades SEO no pueden ser dependencias del arranque en frío de la web pública (Hardening C).
5. **Media Library única.** El Studio lista la media del host (en Restaurantes, `RestaurantStore.listMedia()`) y escribe los metadatos SEO en `seo.media.<ref>`. No se crea otra librería.
6. **Mostrar la medición con honestidad:** `NOT_CONFIGURED`, `NOT_CONNECTED`, `NOT_MEASURED`, `UNKNOWN`, `STALE` y `ERROR` son estados válidos. Nunca se muestran métricas simuladas.

## 5. API que ofrece el Core

| Módulo (`package.json` export) | Global en navegador | Funciones principales |
|---|---|---|
| `src/rubik-seo-geo-core.js` (`.`) | `RubikSEOGeoCore` | `defaults`, `reconcile`, `preview`, `source`, `schemaGraph`, `primaryEntity`, `signature`, `baseUrl`, `adapter`, `adapters`, `normalizeLocale`, `languageSettings` (D-19) |
| `src/rubik-seo-geo-adapters.js` (`./adapters`) | `RubikSEOGeoAdapters` | `register`, `get`, `resolve`, `list`, `describe` |
| `src/rubik-seo-geo-release-b.js` (`./content`) | `RubikSEOGeoReleaseB` | Page Registry (`registry`, `page`, `createPage`, `pageContract`, `canPublish`, `migratePath`, `unsafePathReason`, `alternates(config,page)`: grupo hreflang recíproco de la página, D-19), blog (`blogArticles`, `validateArticle`, `saveArticle`), enlazado interno (`links`, `brokenLinks`, `orphanPages`), `redirects`, `sitemapEntries`, `audit`. `createPage`/`migratePath` lanzan `unsafe page path` ante rutas con `.`/`..`, separadores codificados, barra invertida, `:` o NUL. Una ruta así ya guardada queda bloqueada con `unsafe-path` (D-15) |
| `src/rubik-seo-geo-media.js` (`./media`) | `RubikSEOGeoMedia` | `project`, `projectVideo`, `videoObject`, `audit`, `mediaRefs`, `stablePublicUrl` |
| `src/rubik-seo-geo-publisher.js` (`./publisher`) | `RubikSEOGeoPublisher` | `publish(config,env)`, `renderPage`, `rawHtmlContract`, `renderPagesSitemap`, `renderRobots`, `renderRedirects`, `apply(config,env,doc)` (solo navegador) |
| `src/rubik-seo-geo-intelligence.js` (`./intelligence`) | `RubikSEOGeoIntelligence` | `SearchConsoleAdapter`, `DataForSEOAdapter` (clientes inyectados), `OpenSEOAdapter` (`connectivity()` por `/api/health`, nunca `CONNECTED` sin puente; `crawl()` con el contrato HTTP heredado, **no** compatible con el OpenSEO real; ver [`integrations/OPENSEO.md`](integrations/OPENSEO.md)), `makeSnapshot`, `diff`, `triage`, `crawlerAudit`, `geoReadiness`, `entityGraph(config,{releaseB,core})`: `business`/`location`/`products` desde `source(config)` del adapter activo (`location` en claves de schema.org, solo valores públicos); sin `core`, `''`/`{}`/`[]` (D-18). `products(config,{core})` (D-17). `geoReadiness(config,{schemaGraph,publicHtml,core})`: señales HEURISTIC desde el adapter; sin `core`, `adapterSource:'NOT_PROVIDED'` y señales `null` (D-18), `pages(config,{releaseB})` (Release B **inyectado**; sin él devuelve `[]`, D-13), `insight` |
| `src/rubik-seo-geo-release-e.js` (`./authority`) | `RubikSEOGeoReleaseE` | E1–E4: `provenance`, `normalizeIndexationRecord`, `normalizePresenceRecord(input,{adapter})`, `normalizeMentionRecord`, `normalizeCitationObservation(input,{adapter})`, `indexNowResult`, `record(state,kind,value,{adapter})`, `summarize`. `adapter` = descriptor del adapter activo (`core.adapter(config)`): `vertical`/`entityType` se derivan de él y, sin él, quedan `UNKNOWN` (D-13) |
| `src/rubik-seo-geo-materialize.cjs` (`./materialize`, bin) | — (Node) | `materializeSite({state,template,outputDir,environment,baseUrl,renderHomeBody})` |
| `hosts/restaurant/restaurant-host.cjs` (`./hosts/restaurant`) | — (Node) | `renderHomeBody`, `materializeSite`, `loadDefaultProjectState(pathToClass4Config)` |

## 6. Publicación

```bash
rubik-seo-geo-materialize --project-state=state.json --template=home.html \
  --environment=production --base-url=https://dominio.es/ \
  --home-body=./mi-host-home-body.cjs --output=dist
```

- `preview`: `noindex,nofollow`, sin canonical ni hreflang, `robots.txt` con `Disallow: /`.
- Multidioma (D-19): en `production`, cada página publicable de un grupo `translationKey` con al menos dos locales publicables emite `<link rel="alternate" hreflang>` hacia todos los miembros, incluida ella misma, y `<html lang>` con su locale. Sin `x-default`. El sitemap lista cada URL publicable de cualquier locale, sin alternates.
- Las rutas del Page Registry son entrada no confiable. Si alguna ruta publicable contiene segmentos `..` o `.`, `\`, `:`, NUL o separadores codificados, la build falla antes de escribir nada. Los nombres que solo empiezan por puntos, como `/..foo/` o `/.../`, son válidos. Tampoco se escribe a través de enlaces simbólicos o junctions que ya existan **dentro** de `--output`: la build falla antes de la primera escritura. `--output` en sí puede ser un enlace (D-11).
- `production`: solo se materializan las rutas que pasan `canPublish` y el gate raw-HTML. Si el gate falla, la build se detiene. Salida: `index.html` por ruta, `sitemap.xml`, `robots.txt`, `404.html` y `seo-geo-routes.json` (manifiesto con redirects 301/308 que el hosting debe aplicar).
- Si `--environment` no se indica, el CLI usa production solo cuando `VERCEL_ENV=production` y hay una base URL válida (`--base-url` o `SEO_GEO_PRODUCTION_BASE_URL`).

## 7. Integración de referencia: Restaurantes Premium

| Pieza del host | Dónde vive |
|---|---|
| Project State v5 + `toRuntime()` | `project-model.js` (repositorio fuente) |
| Studio SEO·GEO (Releases A–E) | `rubik-seo-geo-studio.js`, `rubik-seo-geo-release-{c,d,e}-studio.js`, `styles-seo-geo*.css` (repositorio fuente) |
| Lazy loading `rubik:seo-geo-request` | `class4-runtime-guard.js` (repositorio fuente) |
| Pintado de la plantilla HOME premium | `hosts/restaurant/restaurant-host.cjs` (este repositorio, extraído tal cual) |
| Defaults LÚMINA | `class4-config.js` (fuente); fixture en `tests/fixtures/restaurant-lumina-state.json` |
