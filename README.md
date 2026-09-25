# Rubik SEO/GEO Core

Motor SEO/GEO independiente y reutilizable de Rubik Sota. Es un único Core vertical-agnóstico, con adapters por sector y un Publisher que materializa HTML indexable, para cualquier producto Rubik.

```text
EDIT ONCE → PROPAGATE EVERYWHERE

UN STUDIO → UN PROJECT STATE → UNA MEDIA LIBRARY → UN PAGE REGISTRY
          → UN SEO/GEO CORE → UN PUBLISHER → UNA WEB PUBLICADA
```

Se extrajo de Restaurantes Premium (`WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a`), donde se construyeron y fusionaron Releases A–E y Production Hardening A–C. El detalle está en [`docs/PROVENANCE.md`](docs/PROVENANCE.md).

## Propósito y límites

**Qué es:** la lógica SEO/GEO compartida:
- herencia AUTO/CUSTOM de title, description y H1 desde el Project State del host;
- schema.org por vertical;
- Page Registry con contrato por página;
- Media SEO;
- Publisher (head, JSON-LD, sitemap, robots, HTML inicial);
- materialización de rutas con gates;
- contratos de medición honesta (Intelligence y Release E).

**Qué no es:**
- no es una aplicación ni un Studio: no tiene UI;
- no guarda datos: no tiene Project State, base de datos, Media Library ni storage propios;
- no incluye auth, backend ni secretos;
- no hace hosting ni despliegues;
- no es un cliente de proveedores con credenciales.

Todo eso lo aporta cada producto anfitrión ([`docs/HOST-INTEGRATION-CONTRACT.md`](docs/HOST-INTEGRATION-CONTRACT.md)).

## Estado

| | |
|---|---|
| Releases A–D | ✅ implementadas (fuente: PRs #44, #45, #46, #50) |
| Hardening A–B | ✅ implementados en el Core (#53, #54) · Hardening C pertenece al host (#55) |
| Release E | ✅ contrato base E1–E4 (#56) · ⏳ conexiones externas pendientes de backend |
| Independencia | ✅ 73/73 tests desde este repositorio, sin el repo de Restaurantes (Node 20 y 24) |
| Compatibilidad Restaurant | ✅ módulos Core con blob idéntico al fuente · golden de `publish()` · materialización con 0 diferencias |
| Extracción | ⏳ en la rama `feat/seo-geo-core-extraction`: sin publicar, sin PR y **CI todavía no ejecutada en GitHub** (validada solo en local) |
| Acoplamientos al host pendientes | ⏳ bootstrap navegador de `core.js`, `intelligence.pages()` vía global, vertical por defecto de Release E ([`docs/DECISIONS.md`](docs/DECISIONS.md) D-07) |
| OpenSEO | 📝 integración documentada y bloqueada: el contrato heredado **no es compatible** con el OpenSEO real ([`docs/integrations/OPENSEO.md`](docs/integrations/OPENSEO.md)) |

Estado operativo y siguientes pasos: [`docs/ROADMAP.md`](docs/ROADMAP.md) · Handoff: [`docs/HANDOFF.md`](docs/HANDOFF.md)

## Estructura

```text
src/                       Core (UMD sin dependencias; materializer solo Node)
  rubik-seo-geo-core.js          reconcile AUTO/CUSTOM · preview · schema graph
  rubik-seo-geo-adapters.js      registry + 7 adapters verticales
  rubik-seo-geo-release-b.js     Page Registry · contrato por página · blog · links · redirects
  rubik-seo-geo-media.js         Media SEO (imagen/vídeo)
  rubik-seo-geo-publisher.js     head/meta/JSON-LD · páginas · sitemap · robots · raw gate
  rubik-seo-geo-intelligence.js  contratos OpenSEO* · Search Console · DataForSEO · GEO
                                 (*contrato heredado, aún no compatible con OpenSEO real)
  rubik-seo-geo-release-e.js     Authority, Citations & Indexation (E1–E4)
  rubik-seo-geo-materialize.cjs  rutas físicas + gates (CLI rubik-seo-geo-materialize)
hosts/restaurant/          integración de referencia (pintado del HOME premium)
tests/                     node:test · fixtures · golden del fuente
docs/README.md             mapa de autoridad documental: empieza aquí
docs/                      arquitectura · contrato de host · roadmap · decisiones · procedencia · handoff
docs/integrations/         integraciones con proveedores (OpenSEO)
docs/upstream/             contratos canónicos heredados (A–E, Hardening, arquitectura)
scripts/                   runner de tests · check de sintaxis y docs · generador del golden
```

## Adapters verticales

`restaurant` (Restaurant) · `real-estate` (RealEstateAgent) · `professional-service` (ProfessionalService) · `fitness-wellness` (SportsActivityLocation) · `hospitality` (Hotel) · `retail` (Store) · `generic-local-business` (LocalBusiness).

## Instalación

```bash
git clone https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE.git
cd RUBIK-SEO-GEO-CORE
npm run verify        # no hay dependencias que instalar
```

Requiere Node ≥ 20. El paquete (`@rubik/seo-geo-core`, `private`) **no está publicado** en ningún registro. Hasta cerrar CORE-4, un host lo consume desde una ruta local o una referencia git. Los ejemplos `require('@rubik/seo-geo-core')` funcionan dentro de este repositorio gracias a la autorreferencia de `exports`.

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
node src/rubik-seo-geo-materialize.cjs --project-state=state.json --template=home.html \
  --environment=production --base-url=https://dominio.es/ --output=dist \
  [--home-body=./host-home-body.cjs]
```

Qué debe aportar cada producto (Project State, `config.seo`, plantilla HOME, Studio y secretos): [`docs/HOST-INTEGRATION-CONTRACT.md`](docs/HOST-INTEGRATION-CONTRACT.md).

## Desarrollo

```bash
npm run check        # node --check sobre todos los .js/.cjs/.mjs
npm run check:docs   # enlaces relativos, documentos obligatorios, UTF-8 sin mojibake
npm test             # node:test (Releases A–E, Hardening A/B, independencia, paridad con el fuente)
npm run verify       # los tres
```

La CI está en `.github/workflows/core-ci.yml` (Node 20 y 22): verify + smoke del CLI (preview fail-closed; producción sin base URL rechazada).

## Retomar el trabajo

1. Leer [`docs/README.md`](docs/README.md) (qué documento manda en cada tema), después [`docs/ROADMAP.md`](docs/ROADMAP.md) §3–§4 (siguiente tarea y bloqueos) y [`docs/HANDOFF.md`](docs/HANDOFF.md).
2. Ejecutar `npm run verify` antes de cambiar nada.
3. El repositorio de Restaurantes Premium es **solo fuente de lectura**. El desarrollo SEO/GEO se hace aquí.
4. El estado se actualiza solo en `ROADMAP.md` y las decisiones con evidencia, en `DECISIONS.md`.

## Reglas

- No crear un segundo Studio, Project State, Media Library ni Page Registry: el Core se conecta a los del host.
- Honestidad: no se inventan métricas, reseñas, indexación ni citas. `NOT_MEASURED`, `NOT_CONNECTED` y `UNKNOWN` son estados válidos.
- Cualquier cambio en la salida de Restaurant exige actualizar el golden **y** registrar una decisión en [`docs/DECISIONS.md`](docs/DECISIONS.md).
- España-first (`es`). El multidioma es deuda explícita.
