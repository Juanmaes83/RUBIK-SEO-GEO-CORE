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
| Release E | ✅ contratos base E1–E4 (#56) · ⏳ conexiones reales pendientes; su activación se planifica al final en CORE-9 |
| Independencia | ✅ 153/153 en CI Node 20.20.2 y 22.23.2 (run 36111618492, CORE-3.2); en Windows local, 2 pruebas de symlink de fichero se omiten por permisos |
| Compatibilidad Restaurant | ✅ Golden de `publish()`/`preview()` sin cambios y materialización con 0 diferencias. CORE-3.2 eliminó rutas específicas de vertical en Intelligence (D-18). CORE-6 (PR #9, merge `304f655`) añadió multidioma explícito sin cambiar salida monolingüe; golden y fixtures sin cambios |
| Extracción CORE-1 | ✅ PR #1 mergeado en `main` (merge `995207f38080cf319d4246a531895c85bc10759e`); CI Node 20/22 verde, 86/86 (run 36103571133) |
| Siguiente fase | ✅ CORE-7.1 cerrada en [PR #11](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/11), merge `bc271fe`. Sigue CORE-8 (SEO off-page Core-only) y finalmente CORE-9 (Platform Layer e integraciones reales). CORE-2/4/5 siguen sujetos a validación de host. |
| Multidioma (CORE-6) | ✅ Cerrado por D-19 en [PR #9](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/9), merge `304f655`. CI verde en Node 20 y 22: 174/174 pruebas en cada versión, 0 omitidas, syntax/docs y smoke CLI ([run 36115604817](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36115604817)). La salida monolingüe sigue idéntica |
| Contratos de proveedor (CORE-7) | ✅ Cerrado en [PR #10](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/10), merge `6ef8c4e`. D-21: contratos C/E, protección de secretos, presupuesto finito obligatorio para cuota/pago y normalización de backlinks. CI Node 20/22 verde: 205/205 por versión, 0 omitidas; syntax/docs y smoke CLI (run [36121912236](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36121912236)). Solo mocks; sin proveedores reales ni deploy |
| Puente OpenSEO/MCP (CORE-7.1) | ✅ Cerrado en [PR #11](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/11), merge `bc271fe`. Contrato Core-only con cliente MCP inyectado y mocks (D-22); autenticación comprobada por `whoamiAuthenticated`, Lighthouse desactivado y auditoría manual. CI Node 20/22 verde: 233/233 por versión, 0 omitidas (run [36126029028](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36126029028)). Conexión real y backend siguen en CORE-9 |
| SEO off-page (CORE-8) | 🟡 PR #12 abierto, no fusionado. Los seis hallazgos de la auditoría están corregidos con regresiones (D-23). CI: run [36133453921](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36133453921) del HEAD `d65dcf1` verde en Node 20.20.2/22, 274/274 por job, 0 omitidas. Pendiente de revisión humana |
| CORE-8.1 | ✅ Alcance aprobado y documentado: operación continua asistida por IA, contenidos y borradores con evidencia, medición GEO y aprobación humana. Implementación tras cerrar CORE-8 |
| Plataforma (CORE-9) | 📋 Última fase. Se permite preparar arquitectura, contratos y mocks en este repo; aplicación, integraciones reales y despliegue requieren autorización y destino explícitos. Los Project States permanecen en sus hosts |
| Seguridad del materializer | ✅ path traversal, enlaces/junctions dentro de `outputDir` y nombres válidos con `..` cubiertos por regresiones (D-11/D-11b) |
| OpenSEO | 📝 integración documentada y bloqueada ([`docs/integrations/OPENSEO.md`](docs/integrations/OPENSEO.md)). En CORE-3 `connectivity()` usa `/api/health` y nunca devuelve `CONNECTED` (D-14). `crawl()` sigue con el contrato heredado incompatible |

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
  rubik-seo-geo-providers.js     contratos de proveedor C/E: provenance, estados, coste (D-21)
  rubik-seo-geo-offpage.js       servicio off-page & Authority: snapshots, GEO, acciones, informe (D-23)
  rubik-seo-geo-materialize.cjs  rutas físicas + gates (CLI rubik-seo-geo-materialize)
hosts/restaurant/          integración de referencia (pintado del HOME premium)
tests/                     node:test · fixtures · golden del fuente
docs/README.md             mapa de autoridad documental: empieza aquí
docs/                      arquitectura · contrato de host · roadmap · decisiones · procedencia · handoff
docs/integrations/         integraciones con proveedores (OpenSEO) y servicio off-page
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

1. Leer `CLAUDE.md`, [`docs/AUTONOMOUS-CONTINUATION.md`](docs/AUTONOMOUS-CONTINUATION.md), [`docs/README.md`](docs/README.md), [`docs/ROADMAP.md`](docs/ROADMAP.md) §3–§6 y [`docs/HANDOFF.md`](docs/HANDOFF.md).
2. Ejecutar `npm run verify` antes de cambiar nada.
3. El único repositorio de trabajo es `RUBIK-SEO-GEO-CORE`: no acceder, clonar, leer ni modificar otros repositorios.
4. El estado se actualiza solo en `ROADMAP.md` y las decisiones con evidencia, en `DECISIONS.md`.

## Reglas

- No crear un segundo Studio, Project State, Media Library ni Page Registry: el Core se conecta a los del host.
- Honestidad: no se inventan métricas, reseñas, indexación ni citas. `NOT_MEASURED`, `NOT_CONNECTED` y `UNKNOWN` son estados válidos.
- Cualquier cambio de salida cubierto por fixtures/golden exige actualizar el golden **y** registrar una decisión en [`docs/DECISIONS.md`](docs/DECISIONS.md).
- Todo cambio de código y documentación se realiza en este repositorio; no se accede ni se escribe en otros repositorios.
- España-first (`es` por defecto). Otros idiomas solo con páginas traducidas reales declaradas por el host, según D-19 (CORE-6 cerrado). El Core no genera traducciones.
