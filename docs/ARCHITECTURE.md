# Arquitectura de Rubik SEO/GEO Core

> Resumen operativo del Core independiente. El contrato de producto completo (fórmulas, herencia AUTO/CUSTOM, schema, GEO, UX) sigue siendo [`upstream/SEO-GEO-ENGINE-ARCHITECTURE.md`](upstream/SEO-GEO-ENGINE-ARCHITECTURE.md). Si ambos documentos chocan en algo de contrato, manda ese; en estado, manda [`ROADMAP.md`](ROADMAP.md).

## North Star

```text
EDIT ONCE → PROPAGATE EVERYWHERE

UN STUDIO → UN PROJECT STATE → UNA MEDIA LIBRARY → UN PAGE REGISTRY
          → UN SEO/GEO CORE → UN PUBLISHER → UNA WEB PUBLICADA
```

El Core es una **capacidad transversal**. No es un plugin, ni una segunda aplicación, ni un CMS. Cada producto Rubik conserva su propio Studio, Project State y Media Library, y conecta el Core mediante un adapter vertical.

## Capas y fronteras

```text
┌───────────────────────────── HOST (cada producto Rubik) ─────────────────────────────┐
│ Studio UI · Project State (+ persistencia) · Media Library · plantilla HOME · hosting │
│ renderHomeBody(template,state) · secretos/backends de proveedores                    │
└───────────────┬──────────────────────────────────────────────────────▲───────────────┘
                │ config (runtime)                                     │ config.seo
┌───────────────▼──────────── ADAPTERS (src/rubik-seo-geo-adapters.js) ─┴──────────────┐
│ restaurant · real-estate · professional-service · fitness-wellness · hospitality ·   │
│ retail · generic-local-business  →  source(config) · home(source) · entity(source)   │
└───────────────┬──────────────────────────────────────────────────────────────────────┘
┌───────────────▼──────────────────────── CORE (src/) ─────────────────────────────────┐
│ core          reconcile AUTO/CUSTOM · preview/checks · schema graph · signature      │
│ release-b     Page Registry · page contract · blog · internal links · redirects      │
│ media         Media SEO (imagen/vídeo, VideoObject, auditoría, URLs públicas)         │
│ publisher     head/meta/OG/Twitter/JSON-LD · páginas · sitemap · robots · raw gate    │
│ intelligence  OpenSEO · Search Console · DataForSEO (clientes inyectados) · GEO       │
│ release-e     E1 indexación · E2 presencia · E3 menciones · E4 citas IA + provenance  │
│ materialize   rutas físicas · gates raw-HTML · 404 · manifiesto (Node)                │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

| Responsabilidad | Core | Adapter | Host |
|---|:-:|:-:|:-:|
| Fórmulas title, description y H1, AUTO/CUSTOM | ✅ | proyección `home()` | — |
| Leer datos del Project State | — | ✅ `source()` | provee el estado |
| Entidad schema.org | grafo WebSite → WebPage | ✅ `entity()` | — |
| Page Registry, contrato por página, redirects | ✅ | — | persiste `config.seo` |
| HTML, sitemap y robots | ✅ Publisher | — | hosting y aplicación de redirects |
| Pintar el HOME visual | — | — | ✅ `renderHomeBody` |
| UI de edición | — | — | ✅ Studio |
| Storage, media binaria, auth | — | — | ✅ |
| Credenciales de proveedores | rechaza persistirlas | — | ✅ server-side |

## Principios que el código ya aplica

1. **Una sola fuente de verdad.** Title, description y H1 AUTO se derivan de las rutas del host y registran `derivedFrom`, `templateId` y `decisionReason`. Un campo CUSTOM nunca se sobrescribe (`reconcile`).
2. **Honestidad.** Nada de ratings, reviews, métricas, indexación o citas inventadas. Lo que falta aparece como `NOT_MEASURED`, `NOT_CONNECTED` o `UNKNOWN`, y GEO lleva la etiqueta `HEURISTIC`.
3. **Publicación real.** El SEO crítico y el contenido principal van en el HTML inicial (Hardening A). Preview falla cerrado. En producción, las rutas que no pasan el contrato no se publican (Hardening B).
4. **Privacidad NAP.** Dirección, teléfono y email solo entran en el schema con `visibility:'public'` y la firma `publicDataConfirmed` vigente. Si cambia el dato fuente, la confirmación se invalida.
5. **España-first.** `supportedLanguages:['es']`, sin hreflang.
6. **Sin storage en el Core ni en los adapters** (verificado por tests).

## Formato de módulos

UMD sin dependencias. En Node se exporta con `module.exports`; en navegador cuelga un global `RubikSEOGeo*` de `globalThis`. En navegador el orden de dependencias es: `adapters → core → media → release-b → publisher → intelligence → release-e`. El materializer es solo para Node (`.cjs`).

## Acoplamientos pendientes

Ver [`DECISIONS.md`](DECISIONS.md) D-07: el bootstrap navegador de `core.js` sigue conociendo el Studio D de Restaurantes, `intelligence.pages()` depende de un global y Release E usa `vertical:'restaurant'` por defecto. Se resuelven en ROADMAP CORE-2 y CORE-3 sin romper al host de referencia.
