# RUBIK SEO/GEO CORE — Release D · Multi-vertical

**Estado:** [Core·D-06] IMPLEMENTADA Y FUSIONADA en el repositorio fuente mediante PR #50 (2026-09-16)  
**Baseline:** `main@92afaad6898a659053fd02679ab014cb5661410d`  
**Objetivo:** extraer la lógica vertical del Core y demostrar que A+B+C pueden reutilizarse sin crear otra aplicación, Store, Project State, Media Library, Page Registry ni Publisher.

## Contrato no negociable

```text
HOST PROJECT STATE
      ↓
VERTICAL ADAPTER
      ↓
RUBIK SEO/GEO CORE A+B+C
      ↓
ONE PAGE REGISTRY + ONE PUBLISHER
      ↓
PUBLIC WEB + INTELLIGENCE
```

El adapter **sólo proyecta datos ya existentes** del producto anfitrión a un Source Model común. No persiste nada por su cuenta y no posee UI independiente.

## Lo que se extrae

Hasta Release C, `rubik-seo-geo-core.js` contenía directamente conocimiento de restaurante: `dishes[]`, `servesCuisine`, `Restaurant`, textos de reserva y reglas HOME gastronómicas.

Release D mueve esa responsabilidad al registro `rubik-seo-geo-adapters.js`:

- `source(config)` — Project State del host → fuente normalizada;
- `home(source)` — decisiones AUTO de title/meta/H1;
- `entity(source, context)` — entidad principal Schema.org;
- metadata del adapter: `id`, `label`, `schemaType`, `entityId`.

El Core conserva las responsabilidades transversales:

- AUTO/CUSTOM y provenance;
- canonical / indexability;
- privacidad y confirmación;
- Page Registry;
- Media SEO;
- Blog / Internal Linking;
- Publisher;
- OpenSEO / Search Console / DataForSEO;
- GEO / crawler / snapshots / insights;
- honestidad de datos y medición.

## Adapters de referencia incluidos

| Adapter | Schema principal | Propósito |
|---|---|---|
| `restaurant` | `Restaurant` | Compatibilidad 1:1 con Restaurantes Premium |
| `real-estate` | `RealEstateAgent` | Inmobiliaria / Buyer Agent |
| `professional-service` | `ProfessionalService` | Consultoría y servicios profesionales |
| `fitness-wellness` | `SportsActivityLocation` | Fitness / bienestar |
| `hospitality` | `Hotel` | Alojamiento |
| `retail` | `Store` | Comercio |
| `generic-local-business` | `LocalBusiness` | Fallback para negocio local |

Estos adapters son una **capa de proyección**, no siete productos ni siete copias del Core.

## Compatibilidad de Restaurantes

`restaurant` debe mantener sin regresión:

- fórmulas HOME existentes;
- `Restaurant` schema;
- `servesCuisine`;
- `dishes[]` como contexto de producto;
- privacidad de address/phone/email;
- firma de confirmación compatible con el contrato anterior;
- Publisher, BlogPosting y páginas Release B;
- Release C Intelligence.

El catálogo Motion, Kinetic, Chromatic y Anatomy quedan fuera de esta extracción y no deben alterarse.

## Studio

Release D **no crea un nuevo Studio**. Añade una tarjeta dentro de `SEO · GEO` que muestra:

- adapter activo;
- schema principal;
- proyección Source → title/meta;
- adapters registrados.

En este repositorio el adapter por defecto continúa siendo `restaurant`. El selector visible en la rama de revisión sirve para probar portabilidad. Cada producto Rubik deberá fijar su adapter canónico al integrarlo.

### Revisión visual

Abrir:

```text
/?review=seo-geo-d
```

Debe abrir el Studio actual, entrar en `SEO · GEO` y mostrar `Release D · Core + adaptadores Rubik` sin crear otro panel.

Comprobar:

1. adapter inicial `Restauración`;
2. cambiar a `Inmobiliaria / Buyer Agent` → schema `RealEstateAgent`;
3. title/meta se recalculan sólo si están en AUTO;
4. volver a `Restauración` recupera el contrato gastronómico;
5. un único Studio y un único panel SEO/GEO;
6. desktop y mobile sin overflow.

## Gates

Release D no puede mergearse si falla cualquiera de estos contratos:

- todos los tests A+B+C siguen verdes;
- compatibilidad exacta de valores HOME Restaurant;
- Schema Restaurant sigue sin reviews/ratings inventados;
- al menos un adapter no-restaurante genera su schema correcto;
- Publisher usa la entidad del adapter activo también en páginas internas/blog;
- CUSTOM sobrevive al cambio de adapter;
- adapter registry no usa `localStorage`, `indexedDB`, `caches` ni `createObjectURL`;
- E2E Studio demuestra un único panel/Project State;
- Mobile First, Motion y Studio Real Preview permanecen verdes.

## Fuera de Release D

- migrar automáticamente todos los repos Rubik en este mismo PR;
- multidioma/hreflang (sigue TECH DEBT explícita);
- conectar credenciales reales de proveedores;
- crear un CMS central nuevo;
- compartir datos privados entre proyectos.

Tras aprobar este PR, el siguiente paso operativo es extraer/copiar **Core + contrato de adapter**, no clonar la web de Restaurantes, hacia cada producto Rubik objetivo.
