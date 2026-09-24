# RUBIK SEO/GEO CORE — Production Hardening Contract

**Estado:** [Core·D-06] CANÓNICO · Hardening A (PR #53), B (PR #54) y C (PR #55) implementados y fusionados en el repositorio fuente  
**Baseline documental:** posterior a Release D / PR #50  
**Objetivo:** cerrar la diferencia entre “el Core sabe qué SEO debe tener una página” y “un crawler recibe ese SEO y ese contenido correctamente en producción desde el primer HTML”.

---

## 0. Alcance aprobado

Esta fase incorpora tres mejoras obligatorias:

1. **Bloque A — Base técnica indexable ✅ CERRADO + MERGED · PR #53**
2. **Bloque B — SEO explícito por página ✅ CERRADO + APROBADO · PR #54**
3. **Bloque C — Mobile + Performance desde el principio · CERRADO + MERGED · PR #55**

Queda **descartado** como requisito transversal el bloque de restricciones visuales del hilo de referencia. Las decisiones visuales pertenecen a cada producto/marca y no forman parte de RUBIK SEO/GEO Core.

No se reescribe el producto en Next.js/Astro por defecto. El Core debe aprovechar la arquitectura ya existente y convertir el Publisher en una salida de producción realmente indexable.

---

# 1. Principio nuevo no negociable

    PROJECT STATE
    → VERTICAL ADAPTER
    → PAGE REGISTRY
    → RUBIK SEO/GEO CORE
    → CANONICAL PUBLISHER
    → MATERIALIZED PUBLIC ROUTES
    → RAW HTML + CORRECT HTTP
    → JS/MOTION ENHANCEMENT

La interactividad, Motion y el Studio pueden depender de JavaScript. El **contenido SEO crítico y el contenido principal indexable no**.

Definition of Done transversal:

> Una URL publicada debe poder solicitarse sin ejecutar JavaScript y seguir entregando el contenido principal, title, meta description, H1, canonical, OG/Twitter y structured data correctos, con el código HTTP correcto y sin depender de una mutación posterior del DOM para ser entendida.

---

# 2. Bloque A — Base técnica indexable

## Objetivo

Convertir el Publisher actual en una salida de publicación materializada, no sólo en un generador de strings o una capa de preview.

## Contrato

Cada URL publicable debe generar HTML completo en build/publish.

Ejemplos:

    /
    /carta/
    /chef/
    /reservas/
    /ubicacion/
    /blog/
    /blog/<slug>/

Sólo se materializan rutas que superen los gates del Page Registry.

## Requisitos obligatorios

- HTML inicial con contenido principal real.
- title presente antes de ejecutar JS.
- meta description presente antes de ejecutar JS.
- canonical explícito en producción.
- robots correcto según entorno/estado.
- H1 real y visible en el HTML inicial.
- OG y Twitter Cards en el HTML inicial.
- JSON-LD en el HTML inicial.
- sitemap.xml físico/generado desde rutas publicables.
- robots.txt físico/generado y enlazando el sitemap.
- previews/drafts: noindex,nofollow.
- producción indexable sólo si el Page Registry la considera publicable.
- ningún canonical puede usar una URL de preview.
- assets CSS/JS necesarios no deben bloquearse a crawlers.
- redirects publicados con HTTP 301/308 cuando corresponda.
- ruta inexistente: HTTP 404 real, no soft-404 con 200.

## Regla de implementación

No introducir:

- segundo Publisher;
- segundo Page Registry;
- segundo router SEO;
- SPA paralela;
- clon SEO de la web;
- reescritura completa de framework sin necesidad demostrada.

El Publisher canónico debe seguir siendo la autoridad.

## Raw HTML Gate

Para una muestra representativa de rutas:

    HTTP GET sin ejecutar JavaScript
    → status correcto
    → title
    → description
    → canonical
    → robots
    → H1
    → contenido principal
    → OG
    → Twitter
    → JSON-LD
    → enlaces internos básicos

Debe fallar CI si una URL publicable sólo se vuelve válida después de ejecutar JavaScript.

## Gate de cierre A

    RAW REQUEST
    → CORRECT HTTP
    → COMPLETE INITIAL HTML
    → JS DISABLED STILL UNDERSTANDABLE
    → JS ENABLED PRESERVES MOTION/UX

Más:

- SEO/GEO A-D verdes;
- Studio/Project State sin duplicación;
- Motion y módulos sin regresión;
- mobile público sin regresión;
- Vercel review;
- revisión visual humana;
- merge sólo tras aprobación explícita.

---

# 3. Bloque B — SEO explícito por página

## Objetivo

Endurecer Page Registry + Auditor + Publisher para que toda página actual y futura herede un contrato SEO verificable.

## Contrato mínimo por URL publicable

    UNIQUE URL
    + UNIQUE TITLE
    + UNIQUE META DESCRIPTION
    + EXACTLY ONE H1
    + VALID H1/H2/H3 HIERARCHY
    + EXPLICIT CANONICAL
    + OG
    + TWITTER CARD
    + VALID STRUCTURED DATA
    + INTERNAL LINK INTEGRITY

## Gates obligatorios

- title ausente;
- title duplicado;
- description ausente;
- description duplicada;
- cero H1;
- más de un H1;
- jerarquía H1/H2/H3 inválida;
- canonical ausente en producción;
- canonical contradictorio;
- ruta/slug duplicado;
- página indexable sin intención/contenido factual suficiente;
- internal link roto;
- página publicable huérfana;
- redirect inválido;
- social image referenciada pero inexistente/no publicable;
- schema no soportado por contenido real visible.

## Structured data

La entidad principal depende del adapter vertical:

- Restaurant
- RealEstateAgent
- ProfessionalService
- SportsActivityLocation
- Hotel
- Store
- LocalBusiness

Schemas contextuales como BlogPosting, BreadcrumbList, FAQPage o VideoObject sólo se publican cuando existe contenido real y suficiente que los justifique.

Nunca crear reviews, ratings, autores, FAQs, servicios o claims ficticios para completar schema.

## Gate de cierre B

    CREATE / EDIT PAGE
    → PAGE REGISTRY
    → AUDIT
    → PREVIEW
    → RAW HTML
    → ZERO BLOCKERS
    → PUBLISHABLE

**Cierre real:** aprobado visualmente por el propietario el 18/09/2026 y validado con Hardening A/B, Foundation, Intelligence, Release D, Studio Real Preview C1, Mobile First, Motion y Class 04/05/06 en verde. El PR #54 queda autorizado para merge.

Remediaciones consolidadas en B:

- Page Registry con contrato SEO visible y coherente por URL;
- title/description únicos, H1/headings, canonical, OG/Twitter, schema e internal links validados;
- JSON-LD raíz limpio;
- social image accionable;
- auditoría Media SEO agrupada;
- filenames SEO AUTO semánticos sin contaminarse por UUID físicos;
- dimensiones de imágenes capturadas/persistidas automáticamente cuando están disponibles;
- preview C1 con hidratación atómica del Project State;
- Intelligence sin ejemplos hardcodeados de otro vertical.

Toda página futura debe heredar estas reglas sin depender de memoria humana o instrucciones manuales ad hoc.

---

# 4. Bloque C — Mobile + Performance desde el principio

## Objetivo

Convertir Mobile First + Media SEO en un contrato de rendimiento medible desde el modelo, evitando que la optimización sea una reparación posterior.

**Baseline before canónico de C:** `docs/hardening-c-baseline-2026-09-18.json`, capturado sobre `main@9a42c66359ea480d148ba5b3b04969a09153732a` antes de modificar la carga. La evidencia mide Chromium 390×844, Chromium 1440×900 y WebKit 390×844.

## Contrato de media

Cada asset publicable debe poder conservar cuando corresponda:

- width
- height
- format
- weight
- loadingStrategy
- critical
- publicUrl
- relación con página/slot/entidad

## Reglas obligatorias

- Hero/LCP: no lazy-load incorrecto.
- Media below-the-fold: lazy/progressive cuando sea seguro.
- width + height publicados para reducir CLS.
- vídeo below-the-fold no debe descargar agresivamente.
- módulo OFF no debe penalizar initial load.
- engine inactivo no debe cargarse sólo por existir en catálogo.
- Studio no debe formar parte del coste inicial público salvo necesidad.
- fonts con estrategia no bloqueante: font-display: swap o equivalente.
- prefers-reduced-motion respetado.
- save-data/conexión limitada: fallback cuando sea razonable.
- no degradar la experiencia premium con pop-in visible.

## Matriz mínima

- 390×844
- 1440×900
- Chromium
- WebKit cuando aplique

## Métricas mínimas before/after

- request count;
- JS bytes;
- CSS bytes;
- image bytes;
- video bytes;
- DOMContentLoaded;
- load;
- LCP cuando sea fiable;
- CLS cuando sea fiable;
- failed resources;
- fatal JS errors;
- runtimes/engines/modules cargados inicialmente.

## Relación con C2 histórico

Este bloque adelanta y convierte en contrato las reglas estructurales de performance que no deben esperar a una optimización tardía. El trabajo profundo adicional de C2 podrá continuar después de Platform/Publish si las mediciones demuestran que sigue siendo necesario.

## Gate de cierre C

    BASELINE
    → IMPLEMENT
    → SAME VISUAL PRODUCT
    → LESS AVOIDABLE INITIAL COST
    → MOBILE + DESKTOP PASS
    → SEO/GEO PASS
    → HUMAN REVIEW

---

# 5. Forma de trabajo obligatoria por bloque

Los tres bloques se ejecutan secuencialmente y con el mismo proceso.

    DOCUMENT CONTRACT
    → OWNER APPROVES STRATEGY
    → FEATURE BRANCH
    → IMPLEMENT ONLY THAT BLOCK
    → TEST / CI
    → VERCEL REVIEW DEPLOYMENT
    → HUMAN VISUAL REVIEW
    → OWNER APPROVES
    → MERGE
    → VERIFY MAIN
    → NEXT BLOCK

Reglas:

- no merge sin aprobación humana explícita;
- no ejecutar Bloque B hasta cerrar/mergear A;
- no ejecutar Bloque C hasta cerrar/mergear B;
- cambios visibles siempre con URL de revisión;
- un fallo humano visible invalida un falso verde automático;
- no force-push;
- no debilitar tests para obtener verde;
- preservar un Studio, un Project State, una Media Library, un Page Registry y un Publisher.

---

# 6. Orden operativo actualizado

    RELEASES SEO/GEO A-D ✅
            ↓
    PRODUCTION HARDENING A — INDEXABLE BASE
            ↓ human review + merge
    PRODUCTION HARDENING B — PAGE SEO CONTRACT
            ↓ human review + merge
    PRODUCTION HARDENING C — MOBILE + PERFORMANCE · PR #55 CERRADO + MERGED
            ↓ human review + merge
    RELEASE E — GEO AUTHORITY, CITATIONS & INDEXATION
            ↓ research → contract → implementation → human review + merge
    PROJECT MODEL FINAL / FREEZE
            ↓
    PLATFORM / CROSS-COMPUTER
            ↓
    PREVIEW / PUBLISH COMMERCIAL
            ↓
    PERFORMANCE C2 ADDITIONAL IF MEASURED NEED
            ↓
    PRODUCT PROOF V1

El Core no debe desplegarse masivamente en Sarah Katerina, Rubik Sota u otros productos hasta cerrar este hardening y consolidar su extracción canónica independiente.

---

# 7. Definition of Done de Production Hardening

La fase completa está cerrada cuando:

1. una URL productiva es comprensible e indexable sin ejecutar JS;
2. HTTP, canonical, robots, sitemap y redirects reflejan la realidad;
3. todas las páginas publicables cumplen un contrato SEO por página;
4. schema sólo representa contenido real;
5. media publica dimensiones/estrategia de carga adecuadas;
6. mobile sigue aprobado;
7. initial load evita coste evitable de módulos/engines/media inactivos;
8. existe evidencia automática + revisión humana;
9. el mismo Core sigue siendo multi-vertical y reusable.
