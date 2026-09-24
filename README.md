# Rubik SEO/GEO Core

Motor SEO/GEO independiente y reutilizable de Rubik Sota. Es un único Core vertical-agnóstico, con adapters por sector y un Publisher que materializa HTML indexable, para cualquier producto Rubik.

```text
EDIT ONCE → PROPAGATE EVERYWHERE

UN STUDIO → UN PROJECT STATE → UNA MEDIA LIBRARY → UN PAGE REGISTRY
          → UN SEO/GEO CORE → UN PUBLISHER → UNA WEB PUBLICADA
```

Se extrajo de Restaurantes Premium (`WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a`), donde se construyeron y fusionaron Releases A–E y Production Hardening A–C. El detalle está en [`docs/PROVENANCE.md`](docs/PROVENANCE.md).

## Estado

| | |
|---|---|
| Releases A–D | ✅ implementadas (fuente: PRs #44, #45, #46, #50) |
| Hardening A–B | ✅ implementados en el Core (#53, #54) · Hardening C pertenece al host (#55) |
| Release E | ✅ contrato base E1–E4 (#56) · ⏳ conexiones externas pendientes de backend |
| Independencia | ✅ 73/73 tests desde este repositorio, sin el repo de Restaurantes (Node 20 y 24) |
| Compatibilidad Restaurant | ✅ módulos Core con blob idéntico al fuente · golden de `publish()` · materialización con 0 diferencias |

Estado operativo y siguientes pasos: [`docs/ROADMAP.md`](docs/ROADMAP.md) · Handoff: [`docs/HANDOFF.md`](docs/HANDOFF.md)

## Estructura

```text
src/                       Core (UMD sin dependencias; materializer solo Node)
  rubik-seo-geo-core.js          reconcile AUTO/CUSTOM · preview · schema graph
  rubik-seo-geo-adapters.js      registry + 7 adapters verticales
  rubik-seo-geo-release-b.js     Page Registry · contrato por página · blog · links · redirects
  rubik-seo-geo-media.js         Media SEO (imagen/vídeo)
  rubik-seo-geo-publisher.js     head/meta/JSON-LD · páginas · sitemap · robots · raw gate
  rubik-seo-geo-intelligence.js  OpenSEO · Search Console · DataForSEO · GEO
  rubik-seo-geo-release-e.js     Authority, Citations & Indexation (E1–E4)
  rubik-seo-geo-materialize.cjs  rutas físicas + gates (CLI rubik-seo-geo-materialize)
hosts/restaurant/          integración de referencia (pintado del HOME premium)
tests/                     node:test · fixtures · golden del fuente
docs/                      arquitectura · contrato de host · roadmap · decisiones · procedencia
docs/upstream/             contratos canónicos heredados (A–E, Hardening, arquitectura)
```

## Adapters verticales

`restaurant` (Restaurant) · `real-estate` (RealEstateAgent) · `professional-service` (ProfessionalService) · `fitness-wellness` (SportsActivityLocation) · `hospitality` (Hotel) · `retail` (Store) · `generic-local-business` (LocalBusiness).

## Uso rápido

```js
const core = require('@rubik/seo-geo-core');
const publisher = require('@rubik/seo-geo-core/publisher');

const state = { brand: { name: 'Casa Norte' }, hero: { body: 'Asesoría de compra.' },
  business: { address: { city: 'Alicante' } }, seo: core.defaults() };
state.seo.adapterId = 'real-estate';
state.seo.site.baseUrl = 'https://casa-norte.example/';
state.seo = core.reconcile(state);          // el host persiste config.seo

const { publisher: out } = publisher.publish(state, 'production');
out.head; out.schema; out.sitemap; out.robotsTxt; out.pages;
```

Materializar un sitio:

```bash
npx rubik-seo-geo-materialize --project-state=state.json --template=home.html \
  --environment=production --base-url=https://dominio.es/ --output=dist \
  [--home-body=./host-home-body.cjs]
```

Qué debe aportar cada producto (Project State, `config.seo`, plantilla HOME, Studio y secretos): [`docs/HOST-INTEGRATION-CONTRACT.md`](docs/HOST-INTEGRATION-CONTRACT.md).

## Desarrollo

```bash
npm run check    # node --check sobre todos los .js/.cjs
npm test         # node:test (Releases A–E, Hardening A/B, independencia, paridad)
npm run verify   # ambos
```

Requiere Node ≥ 20 y no tiene dependencias. La CI está en `.github/workflows/core-ci.yml` (Node 20 y 22).

## Reglas

- No crear un segundo Studio, Project State, Media Library ni Page Registry: el Core se conecta a los del host.
- Honestidad: no se inventan métricas, reseñas, indexación ni citas. `NOT_MEASURED`, `NOT_CONNECTED` y `UNKNOWN` son estados válidos.
- Cualquier cambio en la salida de Restaurant exige actualizar el golden **y** registrar una decisión en [`docs/DECISIONS.md`](docs/DECISIONS.md).
- España-first (`es`). El multidioma es deuda explícita.
