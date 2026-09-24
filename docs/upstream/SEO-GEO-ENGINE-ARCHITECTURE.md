# RUBIK SEO/GEO CORE — Arquitectura canónica

## Plan operativo oficial por Releases

- **Release A — Search-Ready Core:** Foundation + Publisher (SEO operativo español, metadata, schema, canonical, robots, OG/Twitter, sitemap y HTML inicial).
- **Release B — Content & Media:** Media SEO + Page Registry + Blog.
- **Release C — Intelligence & GEO:** OpenSEO + Search Console + DataForSEO + GEO/AI Search.
- **Release D — Multi-vertical:** extracción del Core + adapters Rubik.
- **Release E — GEO Authority, Citations & Indexation:** [Core·D-06] contrato base E1–E4 implementado y fusionado (PR #56, 2026-09-21); conexiones externas (Search Console, Bing Webmaster, IndexNow, ingestión real) pendientes de Platform/Backend.

Documento de Release E: [SEO-GEO-RELEASE-E-AUTHORITY-CITATIONS-INDEXATION.md](SEO-GEO-RELEASE-E-AUTHORITY-CITATIONS-INDEXATION.md).

El roadmap técnico histórico inferior se conserva sólo como trazabilidad. [Core·D-06] Releases A-E (contrato base) y Hardening A-C están implementados y fusionados; el estado operativo vive en `docs/ROADMAP.md` del Core.


## Production Hardening posterior a Release D

Tras cerrar Releases A-D, el siguiente contrato obligatorio antes de desplegar masivamente el Core en otros productos Rubik es:

    A — BASE TÉCNICA INDEXABLE ✅ PR #53
    → B — SEO EXPLÍCITO POR PÁGINA ✅ PR #54
    → C — MOBILE + PERFORMANCE BASELINE ✅ PR #55   [Core·D-06]

Documento canónico: [SEO-GEO-PRODUCTION-HARDENING-CONTRACT.md](SEO-GEO-PRODUCTION-HARDENING-CONTRACT.md).

Principios añadidos:

- el Publisher debe materializar rutas públicas con HTML inicial completo;
- SEO crítico + contenido principal no pueden depender exclusivamente de JavaScript posterior;
- HTTP real forma parte del contrato: 200 / 301 / 308 / 404 según corresponda;
- cada URL publicable debe superar gates explícitos de metadata, H1/headings, canonical, schema e internal linking;
- Media SEO debe incorporar dimensiones y estrategia de carga suficientes para evitar deuda de rendimiento;
- mobile/performance se miden con baseline before/after y no se tratan sólo como polish final;
- el bloque de restricciones visuales no forma parte del Core: la dirección visual pertenece a cada producto.

La ejecución es secuencial. Cada bloque exige estrategia aprobada → implementación en branch/PR → CI → Vercel → revisión humana → aprobación explícita → merge antes de abrir el siguiente.

### España-first (Release A)

Release A soporta únicamente `es`/`es-ES` (`supportedLanguages: ['es']`). Studio no ofrece selector English ni genera hreflang bilingüe. Queda registrado **TECH DEBT · MULTILINGUAL SEO**: traducciones reales, metadata por locale, Page Registry localizado, hreflang y canonical AUTO/CUSTOM por idioma.

**Estado:** CANÓNICO · APROBADO PARA IMPLEMENTACIÓN POR FASES  
**Fecha:** 2026-09-14  
**Producto de referencia inicial:** Restaurant Experience Engine + Restaurant Studio  
**Objetivo transversal:** reutilizable en Restaurantes Premium, Immersphere/Inmobiliarias, Sarah Katerina, Entrenadores, Escaparates Pro, Kit Digital, hoteles, clínicas, comercios y futuros productos Rubik.

---

## 0. Regla de autoridad de este documento

Este documento define el contrato de producto, datos, UX, publicación, SEO, GEO, auditoría y medición de **Rubik SEO/GEO Core**.

Si una implementación futura contradice este documento, la implementación debe corregirse o este documento debe modificarse explícitamente mediante una decisión canónica posterior. No se permiten reinterpretaciones silenciosas.

Rubik SEO/GEO Core **no es un plugin SEO aislado**, no es una segunda aplicación y no debe convertirse en un configurador externo al producto. Es una capacidad transversal integrada en el mismo Studio, el mismo Project State y la misma Media Library del producto anfitrión.

---

# 1. North Star

Construir un motor SEO/GEO transversal y reutilizable que haga que cualquier web generada por las plataformas Rubik:

1. nazca con una base SEO y GEO correcta por defecto;
2. reutilice automáticamente los datos reales del cliente;
3. permita revisión y personalización humana sencilla;
4. genere metadata, structured data, arquitectura semántica, SEO de media, blog y SEO local sin obligar al usuario a conocer SEO;
5. publique HTML y recursos técnicamente preparados para indexación y descubrimiento;
6. mida la realidad una vez online mediante OpenSEO, Google Search Console y, opcionalmente, DataForSEO;
7. se mantenga honesto: no inventa datos, no inventa rankings, no inventa visibilidad en IA y no confunde heurísticas con resultados medidos.

La cadena canónica es:

```text
DATOS DEL NEGOCIO
        ↓
PROJECT STATE CANÓNICO
        ↓
RUBIK SEO/GEO CORE
        ↓
METADATA + SCHEMA + CONTENIDO + MEDIA + BLOG + LOCAL SEO
        ↓
PUBLISHER
        ↓
WEB PUBLICADA
        ↓
AUDITORÍA + SEARCH CONSOLE + DATAFORSEO
        ↓
MEJORA CONTINUA
```

Regla operativa principal:

> **EDIT ONCE → PROPAGATE EVERYWHERE.**

El usuario no debe volver a escribir el nombre comercial, ciudad, teléfono, platos, chef, servicios, redes o dirección en cada pantalla SEO. Los datos estructurados del proyecto son la fuente de verdad.

---

# 2. Principios no negociables

## 2.1 Un único producto

Rubik SEO/GEO Core debe integrarse en:

```text
UN STUDIO
→ UN PROJECT STATE
→ UNA MEDIA LIBRARY
→ UN PAGE REGISTRY
→ UN SEO/GEO CORE
→ UN PUBLISHER
→ UNA WEB PUBLICADA
```

No crear:

- otro Store;
- otro Project State;
- otro CMS paralelo;
- otra Media Library;
- otra aplicación para SEO;
- un segundo panel desconectado;
- una copia de la web sólo para SEO.

## 2.2 Data-driven by default

> **SEO/GEO MUST BE DATA-DRIVEN BY DEFAULT.**

Los datos estructurados del negocio, productos, ubicación, contacto, contenido y Media Library constituyen la fuente de verdad del SEO/GEO.

El sistema puede derivar y generar información, pero nunca debe confundir:

1. dato introducido por el cliente;
2. dato calculado;
3. copy generado.

## 2.3 AUTO primero, CUSTOM cuando sea necesario

Todo campo SEO derivable debe tener dos estados:

- `AUTO`: se calcula desde Project State usando reglas/templates;
- `CUSTOM`: el usuario lo ha sobrescrito y el motor no debe reemplazarlo automáticamente.

Cambiar Alicante por Altea debe actualizar los campos AUTO dependientes, pero **nunca sobrescribir un campo CUSTOM**.

## 2.4 Publicación real, no maquillaje JavaScript

El preview de Studio puede modificar metadatos en vivo para visualización, pero el Publisher debe generar el HTML definitivo con metadata, canonical y JSON-LD presentes en el documento publicado.

SEO crítico no debe depender exclusivamente de JavaScript ejecutado después de cargar la página.

## 2.5 Honestidad SEO/GEO

Rubik SEO/GEO Core no debe:

- prometer rankings;
- afirmar una probabilidad de ser citado por ChatGPT/Google AI sin datos verificables;
- llamar “citation rate” a una heurística;
- inventar reviews, awards, ratings, autores, experiencia, estadísticas o direcciones;
- considerar “0” un dato que en realidad no se ha medido;
- fabricar páginas long-tail de bajo valor sólo para cubrir variantes de keywords;
- usar keyword stuffing;
- generar `<meta name="keywords">` para Google.

---

# 3. Fuentes de inteligencia que reutilizaremos

No reinventar capacidades ya presentes en nuestros repos. Rubik SEO/GEO Core debe absorber patrones, código reutilizable, reglas o workflows útiles, adaptándolos al producto canónico.

## 3.1 `Juanmaes83/seo-god`

**Rol:** auditoría, corrección, medición y loop post-publicación.

Reutilizar conceptos:

- OpenSEO local/self-hosted;
- crawl real de la web publicada;
- triage por impacto;
- títulos/metas;
- links rotos;
- noindex/canonical;
- thin/duplicate content;
- H1/heading hierarchy;
- ALT;
- performance;
- integración con Search Console;
- snapshots y diffs;
- regresiones;
- quick wins;
- mejora basada en datos reales;
- regla “missing data = missing, nunca zero”.

No copiar el producto como aplicación paralela: incorporar su inteligencia al flujo del Core.

## 3.2 `Juanmaes83/geo-seo-claude`

**Rol:** GEO, citabilidad, schemas, entidad y auditoría orientada a motores generativos.

Reutilizar:

- citability analysis como **heurística**, no como promesa;
- structured data templates;
- LocalBusiness/Restaurant baseline;
- Article + Person/Author;
- análisis de AI crawler access;
- entidad y `sameAs`;
- GEO technical/content concepts;
- reporting patterns;
- `llms.txt` sólo como función experimental.

## 3.3 `Juanmaes83/dataforseo-claude`

**Rol:** capa premium de inteligencia SEO con datos externos reales.

Reutilizar como power-up opcional:

- keyword research;
- search volume;
- keyword difficulty;
- SERPs;
- competitor mapping;
- content gaps;
- backlinks;
- rank checks;
- domain analytics.

Nunca convertir esta dependencia de pago en requisito para que la base SEO funcione.

## 3.4 `Juanmaes83/seo-blog-writer-claude`

**Rol:** workflow de contenido editorial.

Reutilizar:

- H1;
- SEO title;
- meta description;
- excerpt;
- focus query/topics;
- H2/H3 outline;
- image ALT;
- internal links;
- BlogPosting/Article fields;
- FAQ sólo cuando el contenido real lo justifique.

No reutilizar como requisito de producto ninguna técnica orientada a “engañar detectores de IA”. El criterio canónico es utilidad, experiencia real, autoridad, originalidad, legibilidad y datos verificables.

## 3.5 `Juanmaes83/geo-checker`

**Rol:** referencia UX de auditoría/score/reporting.

Reutilizar:

- visualización de readiness;
- auditoría por categorías;
- persistencia de reportes;
- comparación de resultados;
- interfaz orientada a usuario no técnico.

No reutilizar créditos/billing ni dependencias de terceros salvo decisión explícita posterior.

## 3.6 `Juanmaes83/marketingskills`

Skills especialmente útiles:

- `seo-audit`;
- `schema-markup`;
- `programmatic-seo`;
- `analytics-tracking`;
- `copywriting` y `copy-editing` como soporte editorial;
- `page-cro` sólo cuando no altere el contrato SEO.

## 3.7 Repos/técnicas excluidas por defecto

Cualquier repo de “black SEO”, spam, cloaking, manipulación, fake reviews, auto-link spam o tácticas incompatibles con Search Essentials queda fuera del Core salvo revisión explícita y documentada.

---

# 4. Fuentes externas normativas

La implementación debe contrastarse contra documentación oficial actual antes de cerrar cada fase relevante.

Fuentes prioritarias:

- Google Search Essentials
- Google SEO Starter Guide
- Google Search: AI features and your website
- Google title links
- Google snippets/meta descriptions
- Google robots/meta robots/canonical
- Google image SEO
- Google video structured data
- Google Local Business structured data
- Google Core Web Vitals
- Google Search Console
- Schema.org
- OpenAI OAI-SearchBot / GPTBot documentation
- DataForSEO documentation cuando se active ese power-up
- OpenSEO documentation/API cuando se active auditoría post-deploy

Reglas actuales que deben respetarse:

- no usar `meta keywords` como factor SEO;
- no considerar 60/160 caracteres límites rígidos de Google; Studio puede mostrarlos como recomendaciones de UX, no como leyes;
- structured data debe representar contenido real de la página;
- no inventar `aggregateRating` o reviews;
- no existe un schema especial obligatorio para “GEO Google”;
- `llms.txt` se trata como experimental, no como requisito de Google Search;
- no crear una página por cada variante long-tail sin intención/contenido diferencial real;
- metadata y contenido deben ser descriptivos, únicos y útiles;
- filenames, ALT, captions y contexto ayudan a describir media;
- performance/UX siguen siendo parte de la calidad técnica.

---

# 5. Modelo conceptual de datos

Rubik SEO/GEO Core debe distinguir tres capas.

## 5.1 SOURCE DATA — fuente de verdad

Datos introducidos o confirmados por el cliente:

- nombre comercial;
- nombre legal si procede;
- tipo de negocio;
- descripción;
- dirección;
- ciudad;
- región;
- país;
- código postal;
- coordenadas;
- teléfono;
- email;
- horarios;
- URLs sociales;
- URL Google Business Profile/Maps;
- categoría;
- cocina/servicios;
- chef/equipo;
- productos/platos;
- ingredientes;
- procedencia;
- técnica;
- precios;
- imágenes;
- vídeos;
- artículos;
- autores;
- idiomas;
- URLs de reserva/menu/servicios.

Nunca generar silenciosamente un SOURCE DATA que el cliente no haya aportado o confirmado.

## 5.2 DERIVED DATA — datos calculados

Ejemplos:

- slug normalizado;
- primary location;
- primary category;
- primary cuisine/service;
- entidades principales;
- topics;
- relación plato ↔ origen ↔ ciudad;
- Page Type;
- schema type;
- canonical candidate;
- filename sugerido;
- keyword opportunities;
- internal link opportunities.

Debe ser recalculable desde SOURCE DATA.

## 5.3 GENERATED SEO — salida generada

Ejemplos:

- SEO title;
- meta description;
- H1 sugerido;
- OG title/description;
- ALT;
- captions;
- JSON-LD;
- outline de blog;
- H2/H3 sugeridos;
- snippets;
- internal-link anchors;
- video metadata.

Cada salida generada debe conservar:

```js
{
  mode: 'auto' | 'custom',
  value: '...',
  templateId: '...',
  derivedFrom: ['business.name', 'location.city'],
  updatedAt: '...'
}
```

---

# 6. Project State — contrato mínimo

El Core debe ampliar el Project State existente, no sustituirlo.

Esquema conceptual:

```js
seo: {
  schemaVersion: 1,

  site: {
    baseUrl: '',
    siteName: '',
    locale: 'es-ES',
    defaultLanguage: 'es',
    supportedLanguages: ['es'],
    defaultTitleTemplate: '',
    defaultSocialImageRef: '',
    faviconRef: ''
  },

  business: {
    name: '',
    legalName: '',
    businessType: 'restaurant',
    schemaType: 'Restaurant',
    description: '',
    category: '',
    priceRange: '',
    primaryService: '',
    secondaryServices: [],
    cuisine: [],
    publicDataConfirmed: false
  },

  location: {
    street: '',
    locality: '',
    region: '',
    postalCode: '',
    country: '',
    latitude: null,
    longitude: null,
    areaServed: []
  },

  contact: {
    phone: '',
    email: '',
    reservationUrl: '',
    menuUrl: '',
    mapsUrl: ''
  },

  hours: [],
  sameAs: [],
  people: [],

  pages: {},
  keywords: {},
  media: {},
  blog: {},
  local: {},
  crawlers: {},
  audit: {},
  integrations: {}
}
```

En Restaurant Studio, el Core debe heredar primero del estado ya existente (`brand`, `visit`, `dishes`, `media`, etc.) y sólo añadir campos SEO cuando no exista una fuente canónica previa.

No duplicar `brand.name` como un segundo nombre editable independiente. La UI SEO puede mostrarlo, pero debe apuntar a la fuente original o a una proyección derivada.

---

# 7. SEO Data Inheritance Engine

Esta es la pieza central.

## 7.1 Variables canónicas

Mínimo:

```text
{{business.name}}
{{business.legalName}}
{{business.category}}
{{business.description}}
{{business.primaryService}}
{{business.cuisinePrimary}}

{{location.city}}
{{location.region}}
{{location.country}}
{{location.address}}

{{contact.phone}}
{{contact.email}}
{{contact.reservationUrl}}
{{contact.menuUrl}}

{{chef.name}}
{{author.name}}

{{dish.name}}
{{dish.ingredients}}
{{dish.origin}}
{{dish.technique}}
{{dish.price}}

{{page.name}}
{{page.topic}}
{{page.primaryQuery}}
{{article.title}}
{{article.category}}
```

## 7.2 Mapa de herencia contextual

### `business.name`

Usos por defecto:

- title;
- H1 cuando corresponda;
- meta description;
- OG;
- schema;
- footer/brand context;
- media naming/ALT cuando sea útil;
- blog publisher;
- local entity.

### `location.city`

Usos por defecto cuando exista intención local:

- title;
- description;
- H1;
- local pages;
- schema;
- ALT contextual;
- blog cuando sea relevante;
- internal links.

No forzar la ciudad en cada heading o cada párrafo.

### `contact.phone`

Usos:

- Restaurant/LocalBusiness schema;
- Contact/Visit;
- reservation/contact UI;
- datos locales.

No usar por defecto en title, H1 o textos editoriales.

### `dish.name`

Usos:

- ficha de producto;
- ALT;
- filenames;
- schema cuando proceda;
- blog/topic suggestions;
- internal linking.

No introducir platos arbitrariamente en el title de HOME.

### `dish.origin`

Usos:

- entidad/contexto semántico;
- ALT/caption cuando sea factual;
- oportunidades editoriales;
- story/product content.

### `chef.name`

Usos:

- página Chef;
- Person schema;
- author/entity relationships cuando sea correcto;
- contenidos propios del chef.

No atribuir artículos al chef si no es realmente autor o responsable editorial.

---

# 8. Fórmulas canónicas aprobadas

Son **defaults**, no strings obligatorios. Deben adaptarse al idioma, tipo de negocio y longitud real.

## 8.1 HOME

### SEO Title

```text
{{business.name}} | {{business.category}} en {{location.city}}
```

Ejemplo:

```text
LÚMINA | Restaurante gastronómico en Alicante
```

Fallback si no existe ciudad:

```text
{{business.name}} | {{business.category}}
```

### H1

```text
{{business.name}} · {{business.cuisinePrimary}} en {{location.city}}
```

Alternativa según tipo:

```text
{{business.name}} · {{business.primaryService}} en {{location.city}}
```

### Meta description base

```text
{{business.name}} es {{business.categoryWithArticle}} de {{business.cuisinePrimaryOrPrimaryService}} en {{location.city}}. Descubre {{business.mainOffer}} y {{business.primaryCTA}}.
```

Debe sonar natural; si la fórmula produce copy torpe, el generador debe reescribir manteniendo datos reales.

## 8.2 CARTA / MENÚ

### Title

```text
Carta de {{business.name}} | {{business.cuisinePrimary}} en {{location.city}}
```

### H1

```text
Carta de {{business.name}}
```

### Description

Generada usando cuisine + platos destacados + localidad, sin enumeración artificial de keywords.

## 8.3 CHEF

### Title

```text
{{chef.name}}, chef de {{business.name}} en {{location.city}}
```

### H1

```text
{{chef.name}}
```

Si chef no está informado, no publicar una página/metadata basada en placeholder.

## 8.4 RESERVAS

### Title

```text
Reservar mesa en {{business.name}} | {{location.city}}
```

### H1

```text
Reserva tu mesa en {{business.name}}
```

## 8.5 UBICACIÓN / VISITA

### Title

```text
Dónde estamos | {{business.name}} · {{location.city}}
```

### H1

```text
Visita {{business.name}} en {{location.city}}
```

## 8.6 PLATO / PRODUCTO

### Title

```text
{{dish.name}} en {{business.name}} | {{location.city}}
```

Sólo si existe una URL indexable real para ese plato/producto.

### H1

```text
{{dish.name}}
```

No crear automáticamente una URL indexable por plato si la página no aporta contenido diferencial suficiente.

## 8.7 BLOG

### SEO Title

```text
{{article.title}} | {{business.name}}
```

### H1

```text
{{article.title}}
```

### Slug

Derivado del tema principal, no de una lista de keywords.

### Meta description

Resumen único, útil y fiel al artículo.

## 8.8 IMAGEN

Con:

```text
Dish: Gamba roja salvaje
Origin: Santa Pola
Business: LÚMINA
City: Alicante
```

Filename sugerido:

```text
gamba-roja-santa-pola-lumina-alicante.webp
```

ALT sugerido:

```text
Gamba roja de Santa Pola a la brasa servida en LÚMINA, Alicante
```

Caption sugerido:

```text
Gamba roja de la lonja de Santa Pola
```

Regla: describir la imagen real. Si la imagen no muestra lo que el Project State sugiere, no inventarlo.

## 8.9 VÍDEO

Filename sugerido:

```text
chef-lumina-cocina-fuego-alicante.mp4
```

Title sugerido:

```text
La cocina de fuego de LÚMINA
```

Description sugerida:

```text
El chef de LÚMINA muestra cómo trabaja la cocina de fuego y el producto mediterráneo en Alicante.
```

Sólo enriquecer con VideoObject cuando el vídeo tenga valor de contenido y metadatos suficientes; no convertir automáticamente cada micro-loop decorativo en contenido SEO.

---

# 9. Keywords, topics e intención

El Core debe tener **Keywords & Search Intent**, pero no debe generar `meta keywords`.

Modelo:

```js
keywords: {
  primaryQuery: '',
  secondaryTopics: [],
  entities: [],
  longTailOpportunities: [],
  source: 'manual|derived|gsc|dataforseo',
  lastUpdatedAt: ''
}
```

Reglas:

- `primaryQuery` orienta una página, no se repite mecánicamente;
- `secondaryTopics` ayudan a cobertura semántica;
- `longTailOpportunities` son oportunidades, no páginas automáticas;
- generar nueva URL sólo si existe intención distinta + contenido diferencial + valor comercial/editorial;
- no keyword stuffing;
- no crear decenas de páginas casi idénticas para localidades o combinaciones de keywords.

Con DataForSEO activo, las sugerencias pueden enriquecerse con volumen, dificultad, SERP y competidores. Sin DataForSEO, el sistema debe marcar esos campos como **not measured**.

---

# 10. Page Registry

El SEO necesita URLs reales, no sólo anchors visuales.

Restaurant Studio puede mantener una HOME inmersiva con:

```text
#story
#signature
#experience
#visit
```

pero el Core debe permitir Page Registry con URLs independientes cuando exista intención real.

Modelo conceptual:

```js
pages: {
  home: {
    id: 'home',
    path: '/',
    type: 'home',
    indexable: true,
    canonicalMode: 'auto',
    seo: {...}
  }
}
```

Páginas posibles para restauración:

```text
/
/carta/
/chef/
/reservas/
/ubicacion/
/blog/
/blog/<slug>/
```

No todas son obligatorias.

Cada página indexable debe poder tener:

- path/slug;
- page type;
- index/noindex;
- canonical;
- title;
- description;
- H1;
- OG;
- target query/topics;
- schema set;
- social image;
- language/hreflang cuando proceda;
- internal links;
- audit status.

---

# 11. Blog Engine

El Blog Engine debe formar parte de Rubik SEO/GEO Core y utilizar la información del negocio para no escribir contenido genérico desconectado del cliente.

## 11.1 Flujo

```text
IDEA / TEMA
→ INTENCIÓN
→ PRIMARY QUERY
→ ENTIDADES/TOPICS
→ SLUG
→ SEO TITLE
→ H1
→ OUTLINE H2/H3
→ CONTENIDO
→ INTERNAL LINKS
→ MEDIA
→ AUTHOR
→ ARTICLE SCHEMA
→ OG
→ PREVIEW SEO/GEO
→ PUBLICACIÓN
```

## 11.2 Estructura mínima de post

```js
{
  id: '',
  status: 'draft|published',
  title: '',
  slug: '',
  excerpt: '',
  authorId: '',
  datePublished: '',
  dateModified: '',
  category: '',
  topics: [],
  primaryQuery: '',
  headings: [],
  body: '',
  coverMediaRef: '',
  internalLinks: [],
  externalSources: [],
  seo: {...}
}
```

## 11.3 Headings

- un H1 principal por artículo como regla editorial del producto;
- H2 para secciones principales;
- H3 para subsecciones;
- no saltos arbitrarios de jerarquía;
- headings descriptivos, no rellenos de keywords;
- la estructura debe surgir del contenido y la intención.

## 11.4 Experiencia y originalidad

Para GEO y SEO, priorizar contenido propio del negocio:

- proveedores;
- ingredientes;
- procesos;
- chef/equipo;
- datos propios;
- territorio;
- preguntas reales de clientes;
- casos/experiencias;
- fotografías originales;
- vídeos propios;
- técnicas;
- decisiones de producto.

Evitar artículos genéricos que podrían pertenecer a cualquier competidor.

---

# 12. Media SEO

La Media Library debe ampliarse, no duplicarse.

## 12.1 Imagen

Campos SEO/GEO por asset:

```js
{
  originalName: '',
  seoFilename: {mode:'auto', value:''},
  alt: {mode:'auto', value:''},
  caption: {mode:'auto', value:''},
  title: {mode:'auto', value:''},
  width: null,
  height: null,
  format: '',
  subjectEntityRefs: [],
  pageRefs: [],
  decorative: false
}
```

Reglas:

- nombres cortos, descriptivos y legibles;
- ALT describe función/contenido real;
- imagen decorativa puede usar `alt=""`;
- no repetir keywords;
- captions sólo cuando aporten contexto;
- optimizar peso/formato;
- conservar width/height para estabilidad de layout;
- imagen LCP no debe lazy-loadearse de forma que perjudique rendimiento;
- social image y schema image deben usar URLs publicables/estables.

## 12.2 Vídeo

Campos:

```js
{
  seoFilename: {},
  title: {},
  description: {},
  thumbnailRef: '',
  transcript: '',
  captionsRef: '',
  duration: '',
  uploadDate: '',
  contentUrl: '',
  embedUrl: '',
  isSeoContent: false
}
```

Generar VideoObject sólo cuando corresponda.

---

# 13. Structured Data Engine

## 13.1 Principio

Schema deriva del Page Type + Business Type + datos reales.

No pedir al usuario que escriba JSON-LD manualmente salvo modo avanzado futuro.

## 13.2 Restaurante

Business Type inicial:

```text
Restaurant
```

HOME puede emitir un `@graph` coherente con entidades enlazadas por `@id`:

```text
WebSite
WebPage
Restaurant
PostalAddress
GeoCoordinates
OpeningHoursSpecification
Person (chef, si existe y procede)
```

Restaurant puede incluir cuando existan datos reales:

- name;
- url;
- image;
- description;
- telephone;
- email;
- address;
- geo;
- openingHoursSpecification;
- priceRange;
- servesCuisine;
- menu;
- acceptsReservations/reservation URL cuando corresponda;
- sameAs.

No generar `aggregateRating` si no hay ratings reales, visibles y válidos para el contexto.

## 13.3 Blog

Generar `BlogPosting`/`Article` con:

- headline;
- description;
- image;
- author;
- publisher;
- datePublished;
- dateModified;
- mainEntityOfPage;
- articleSection;
- inLanguage.

No atribuir `Person`/author ficticio.

## 13.4 Otros tipos futuros

Adapters previstos:

- `RealEstateAgent`;
- `ProfessionalService`;
- `Hotel` / lodging types adecuados;
- `SportsActivityLocation` o tipos compatibles;
- `LocalBusiness` fallback;
- `Organization` cuando el negocio no sea local.

El adapter cambia reglas/defaults, pero no crea otro Core.

---

# 14. Local SEO

Para negocios locales, la capa Entity/Local debe ser de primer nivel.

Studio debe poder mantener:

- nombre oficial;
- categoría;
- dirección;
- ciudad/región/país;
- teléfono;
- email;
- horarios;
- coordenadas;
- servicios/cocina;
- precio/rango cuando proceda;
- mapas;
- Google Business Profile URL/ref;
- redes/sameAs;
- reserva;
- menú;
- area served cuando proceda.

La UI debe detectar datos locales incompletos.

Ejemplos de warnings:

```text
⚠ Falta teléfono público
⚠ Horarios no configurados
⚠ Coordenadas no confirmadas
⚠ Google Business Profile pendiente
✓ Dirección completa
✓ Restaurant schema generado
```

No inventar coordenadas ni horarios.

---

# 15. GEO / AI Search

Rubik SEO/GEO Core debe tratar GEO como una extensión de calidad, estructura, entidad, citabilidad y accesibilidad, no como magia independiente del SEO.

## 15.1 AI Search Readiness

Evaluar:

- crawlability;
- indexability;
- entidad consistente;
- contenido claro y factual;
- headings;
- datos estructurados;
- autoría;
- fuentes/citas cuando proceda;
- originalidad;
- media contextual;
- internal linking;
- freshness/dateModified cuando sea real;
- contenido autosuficiente y citable.

## 15.2 Citability Heuristic

Se puede reutilizar/adaptar `citability_scorer.py` de `geo-seo-claude`.

Nombre en producto:

```text
AI Citability Heuristic
```

Nunca:

```text
92% de probabilidad de aparecer en ChatGPT
```

Una heurística puede medir estructura y facilidad de extracción, pero no demostrar citación real.

## 15.3 AI crawlers

Config conceptual:

```js
crawlers: {
  googleSearch: true,
  openaiSearch: true,
  openaiTraining: 'inherit|allow|disallow',
  experimental: {}
}
```

Diferenciar búsqueda/descubrimiento de entrenamiento cuando el proveedor lo permita.

## 15.4 `llms.txt`

Estado:

```text
EXPERIMENTAL AI INTEROPERABILITY
```

No sumar puntos al SEO Google sólo por existir.

No presentarlo como requisito para Google AI Overviews/AI Mode.

---

# 16. Metadata Engine

Cada página indexable debe poder emitir:

```html
<title>...</title>
<meta name="description" content="...">
<link rel="canonical" href="...">
<meta name="robots" content="...">

<meta property="og:type" content="...">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:url" content="...">
<meta property="og:image" content="...">

<meta name="twitter:card" content="summary_large_image">
```

Más JSON-LD correspondiente.

## 16.1 Preview y producción

- previews/staging no destinados a indexar → `noindex` y/o protección correspondiente;
- producción → indexability según Page Registry;
- nunca arrastrar `noindex` de preview a producción;
- canonicals de producción deben apuntar a URLs productivas, no Vercel previews.

## 16.2 Unicidad

Auditar:

- titles duplicados;
- descriptions duplicadas;
- H1 ausente/duplicación problemática;
- canonical conflicts;
- pages indexables sin contenido suficiente.

---

# 17. Sitemap, robots, canonical y hreflang

Publisher debe poder generar/actualizar:

```text
sitemap.xml
robots.txt
```

## Sitemap

Incluir URLs canónicas, indexables y publicadas.

No incluir:

- drafts;
- Studio;
- rutas técnicas;
- previews;
- URLs noindex;
- duplicados.

## Robots

Debe estar gobernado por configuración, no hardcodeado accidentalmente.

## Canonical

Por defecto auto desde Page Registry + `baseUrl`.

Override manual sólo en modo avanzado.

## Hreflang

Sólo si existen versiones lingüísticas reales y equivalentes.

No crear hreflang a páginas inexistentes.

---

# 18. Internal Linking Engine

Debe sugerir enlaces internos basados en:

- entidad;
- topic;
- categoría;
- plato/producto;
- origen;
- intención;
- páginas relacionadas;
- blog.

Ejemplo:

Un artículo sobre gamba roja de Santa Pola puede sugerir:

```text
→ Carta / plato Gamba roja
→ Página Origen/Productores
→ Reserva
→ Artículo relacionado sobre producto mediterráneo
```

No insertar enlaces automáticamente sin revisión si el anchor queda forzado o no aporta valor.

---

# 19. UX del panel `SEO · GEO`

Debe integrarse como tab/sección normal del mismo Studio.

## 19.1 Overview

Mostrar únicamente scores defendibles:

- SEO Readiness;
- Technical Readiness;
- Entity/Local Completeness;
- Media Discoverability;
- Structured Data Readiness;
- AI Search Readiness;
- Post-Publish Measurement status.

No mostrar “Google Rank Score” inventado.

## 19.2 Secciones

```text
SEO · GEO
├── Overview
├── Negocio / Entidad
├── Páginas
├── Keywords & Intent
├── Contenido
├── Media SEO
├── Blog
├── Schema
├── Local SEO
├── Crawlers / AI Search
├── Auditoría
└── Integraciones
```

## 19.3 AUTO/CUSTOM UX

Ejemplo:

```text
SEO Title
[LÚMINA | Restaurante gastronómico en Alicante]

AUTO
LÚMINA ← Marca
Restaurante gastronómico ← Tipo de negocio
Alicante ← Ubicación

[Personalizar]
```

Si se pulsa Personalizar:

```text
mode = custom
```

Debe existir:

```text
[Volver a automático]
```

que recalcula con datos actuales.

## 19.4 Preview SERP/social

Mostrar preview orientativo, dejando claro que Google puede reescribir title/snippet.

No mostrar límites rígidos como errores absolutos.

---

# 20. SEO/GEO pre-publicación

El Core debe auditar instantáneamente el proyecto antes del deploy.

Ejemplos:

```text
✓ Title presente
✓ Canonical válido
⚠ Description demasiado genérica
✓ 1 H1 principal
⚠ 2 imágenes informativas sin ALT
✓ Restaurant schema generado
⚠ Google Business Profile pendiente
✓ OG image configurada
⚠ Vídeo editorial sin thumbnail
✓ Sitemap preparado
✓ Preview noindex
```

Clasificación:

- `BLOCKER` — puede romper indexación/publicación;
- `ERROR` — problema SEO serio;
- `WARNING` — mejora importante;
- `OPPORTUNITY` — optimización no obligatoria;
- `PASS`.

---

# 21. Auditoría post-publicación

Una web publicada deja de ser teoría.

Flujo:

```text
PUBLISH
→ public URL
→ OpenSEO crawl
→ issue triage
→ Search Console
→ snapshots
→ regression detection
→ quick wins
→ content opportunities
```

## 21.1 OpenSEO / `seo-god`

Prioridad canónica adaptada:

1. roturas/4xx/5xx en páginas comerciales;
2. titles/metas;
3. noindex/canonical/crawlability;
4. thin/duplicate/headings/ALT;
5. performance.

Una página que el crawler no ha podido leer no se considera limpia.

## 21.2 Search Console

Medir cuando exista conexión autorizada:

- queries;
- impressions;
- clicks;
- CTR;
- average position;
- pages;
- evolución temporal.

No inventar Search Console data si no existe conexión.

## 21.3 DataForSEO Power-Up

Opcional para:

- volumen;
- dificultad;
- SERPs;
- competidores;
- gaps;
- backlinks;
- rank tracking.

La UI debe etiquetar claramente el origen de cada dato.

---

# 22. Performance Budget

Las webs premium Rubik usan vídeo, imágenes y motion. SEO/GEO Core debe evitar que el diseño destruya rendimiento.

Objetivos recomendados para experiencia real:

```text
LCP ≤ 2.5 s
INP < 200 ms
CLS < 0.1
```

Studio debe alertar, por ejemplo:

```text
BLOCKER · Hero video 28 MB
WARNING · Imagen LCP sin formato optimizado
WARNING · Imagen sin width/height
OPPORTUNITY · Video puede usar poster más ligero
```

El Core no debe desactivar por defecto la estética premium; debe ayudar a publicarla de forma técnicamente responsable.

---

# 23. Seguridad, privacidad y publicación de datos

No todo dato almacenado debe publicarse.

Cada dato sensible/publicable debe poder distinguir:

```js
{
  value: '...',
  visibility: 'public|private|internal'
}
```

Ejemplos:

- teléfono público → puede ir a schema/site;
- email administrativo interno → NO publicar;
- notas internas → nunca SEO;
- API credentials → nunca Project State público;
- claves DataForSEO/GSC → sólo backend/secrets storage.

---

# 24. Adaptadores por vertical

El Core es transversal; cada vertical aporta defaults y mappings.

## Restaurant Adapter

Entradas específicas:

- cuisine;
- dishes;
- chef;
- menu;
- reservation;
- priceRange;
- openingHours;
- product origins.

Schema principal:

```text
Restaurant
```

## Real Estate Adapter

Entradas futuras:

- agent/company;
- areas served;
- buyer/seller services;
- property categories;
- locations;
- multilingual markets.

## Personal Trainer Adapter

Entradas futuras:

- coach;
- services;
- specialities;
- service area;
- plans/programs;
- credentials reales.

## Generic Local Business Adapter

Fallback para Kit Digital/comercios/servicios.

Todos comparten el mismo engine base.

---

# 25. Arquitectura técnica propuesta

Nombre lógico:

```text
RubikSEOGeoCore
```

Componentes conceptuales:

```text
RubikSEOGeoCore
├── SourceDataAdapter
├── DataInheritanceEngine
├── RulesEngine
├── TemplateEngine
├── PageRegistry
├── MetadataEngine
├── SchemaEngine
├── MediaSEOEngine
├── BlogEngine
├── LocalSEOEngine
├── InternalLinkEngine
├── CrawlPolicyEngine
├── PrePublishAuditor
├── PublisherAdapter
├── MeasurementAdapter
│   ├── OpenSEO
│   ├── SearchConsole
│   └── DataForSEO
└── VerticalAdapters
    └── Restaurant
```

Regla: los engines trabajan sobre el Project State existente mediante APIs/métodos definidos; no manipulan almacenamiento paralelo.

---

# 26. Dependencias y degradación elegante

Base gratuita/self-contained:

- Project State;
- formulas/rules;
- metadata;
- schema;
- media SEO;
- blog structure;
- sitemap/robots;
- local SEO data model;
- prepublish audit.

Con web pública:

- OpenSEO audit.

Con autorización Google:

- Search Console.

Power-up opcional:

- DataForSEO.

Si una integración no está disponible:

```text
NOT CONNECTED / NOT MEASURED
```

Nunca:

```text
0
```

como sustituto de dato ausente.

---

# 27. Roadmap de implementación

## FASE 0 — CANONICAL ARCHITECTURE

Este documento.

Gate:

- arquitectura aprobada;
- fuentes definidas;
- fórmulas definidas;
- reglas AUTO/CUSTOM definidas;
- sin código de producto aún.

## FASE 1 — SEO FOUNDATION

Objetivo:

- añadir `SEO · GEO` al Studio;
- ampliar Project State;
- implementar inheritance engine inicial;
- Business/Entity model;
- Page Registry mínimo HOME;
- AUTO/CUSTOM;
- title/meta/H1 preview;
- Restaurant schema preview;
- prepublish checks básicos.

No incluir todavía:

- blog completo;
- DataForSEO;
- Search Console;
- OpenSEO automatizado;
- AI visibility externa.

Entrega obligatoria:

- branch independiente;
- tests;
- preview desplegado;
- revisión visual humana;
- no merge sin aprobación.

## FASE 2 — SEO PUBLISHER

- metadata baked en output;
- canonical;
- robots;
- OG/Twitter;
- JSON-LD productivo;
- sitemap;
- preview noindex / production policy;
- validation gate.

## FASE 3 — MEDIA SEO

- image fields;
- auto filename;
- ALT/caption;
- media audit;
- video metadata;
- VideoObject cuando proceda;
- performance warnings.

## FASE 4 — PAGE REGISTRY MULTI-PAGE

- URLs reales;
- carta;
- chef;
- reservas;
- ubicación;
- canonicals independientes;
- breadcrumbs cuando proceda;
- internal linking.

## FASE 5 — BLOG ENGINE

- editor;
- topic/intent;
- H1/H2/H3;
- metadata;
- author;
- BlogPosting;
- media;
- internal links;
- publishing.

## FASE 6 — AUDIT & MEASUREMENT

- OpenSEO;
- seo-god workflow adaptation;
- post-publish reports;
- Search Console;
- snapshots;
- regressions;
- quick wins.

## FASE 7 — KEYWORD INTELLIGENCE

- DataForSEO opcional;
- real keyword metrics;
- SERP;
- competitors;
- content gap;
- rank checks.

## FASE 8 — GEO / AI SEARCH

- AI Search readiness;
- crawler policy controls;
- citability heuristic;
- entity consistency;
- AI-specific reporting honesto;
- `llms.txt` experimental.

## FASE 9 — CORE EXTRACTION / MULTI-VERTICAL

- consolidar API estable;
- Restaurant Adapter completo;
- Real Estate Adapter;
- Personal Trainer Adapter;
- Generic Local Business Adapter;
- reutilización en productos Rubik.

---

# 28. Gates de aceptación globales

Rubik SEO/GEO Core no se considera listo si incumple cualquiera de estos contratos.

## Data inheritance gate

- cambiar `business.name` actualiza campos AUTO dependientes;
- cambiar `location.city` elimina referencias AUTO obsoletas;
- teléfono alimenta schema/local pero no title por defecto;
- platos alimentan media/topics sin invadir HOME arbitrariamente;
- campos CUSTOM sobreviven a cambios de Source Data;
- “Volver a automático” recalcula correctamente.

## Metadata gate

- cada página indexable tiene title válido;
- description cuando corresponde;
- canonical productivo;
- robots correcto;
- no `meta keywords`;
- no preview canonical en producción;
- no production `noindex` accidental.

## Heading/content gate

- H1 principal controlado;
- jerarquía heading sin saltos estructurales evitables;
- no keyword stuffing;
- no contenido auto-generado vacío/placeholder publicado.

## Schema gate

- JSON-LD parseable;
- datos coinciden con contenido/Project State;
- Restaurant usa Restaurant;
- no fake reviews/ratings;
- Article/BlogPosting tiene autor real si se publica autor;
- @id y URLs productivas consistentes.

## Media gate

- imágenes informativas sin ALT → warning/error según contexto;
- imágenes decorativas pueden marcarse como tales;
- filenames sugeridos desde datos reales;
- VideoObject sólo con metadatos suficientes;
- OG image estable/publicable;
- performance budget auditado.

## Page Registry gate

- no URLs duplicadas;
- no canonicals cruzados accidentales;
- sitemap sólo con URLs publicables;
- drafts no salen en sitemap;
- anchors de HOME no se fingen como páginas indexables.

## Blog gate

- slug único;
- H1 único/editorial;
- H2/H3 coherentes;
- metadata propia;
- BlogPosting válido;
- internal links sugeridos con contexto;
- no publicación de placeholders.

## Post-publish gate

- si OpenSEO no puede leer una página, no se marca PASS;
- Search Console ausente = NOT CONNECTED;
- DataForSEO ausente = NOT MEASURED;
- no falsear métricas.

## Regression gate

Ninguna fase SEO/GEO puede romper:

- Studio existente;
- Motion;
- Project State;
- Media Library;
- Product Engines;
- publicación;
- mobile/desktop;
- accesibilidad básica;
- performance de forma significativa sin warning/gate.

---

# 29. Test matrix mínima

Automatizar como mínimo:

```text
01 Source Data → AUTO title
02 Source Data city change → regenerated title/meta/schema
03 CUSTOM title survives city/name changes
04 Reset to AUTO recalculates
05 phone never injected into title formula
06 dish data drives dish/media context
07 HOME emits Restaurant JSON-LD
08 fake aggregateRating never generated
09 preview = noindex policy
10 production = canonical production URL
11 sitemap excludes drafts/noindex
12 meta keywords absent
13 image informative requires ALT or warning
14 decorative image accepts empty ALT
15 blog H1/H2/H3 validation
16 duplicate slug blocked
17 DataForSEO disconnected = NOT MEASURED
18 Search Console disconnected = NOT CONNECTED
19 OpenSEO unreachable does not produce false PASS
20 existing Studio/Motion regression PASS
```

---

# 30. Definition of Done por fase

Una fase sólo se cierra si:

1. código y documentación coinciden;
2. tests automáticos relevantes pasan;
3. no se introduce segundo Store/Project State/Media Library;
4. no quedan datos hardcodeados específicos de LÚMINA salvo fixtures/demos explícitos;
5. se usa Source Data real del proyecto;
6. se entrega URL de preview cuando exista UI;
7. se realiza revisión visual humana cuando la fase modifica Studio/web;
8. sólo después se mergea;
9. la documentación canónica se actualiza tras merge;
10. el siguiente trabajo parte de `main` actualizado.

---

# 31. Restricciones para la implementación con Astra GPT

Astra deberá tratar este documento como contrato, no como inspiración.

Antes de modificar código deberá:

- entender el repositorio canónico;
- leer README y documentación relevante;
- identificar Project State, Store, Media Library, Studio y Publisher actuales;
- localizar campos existentes reutilizables;
- evitar duplicación de datos;
- identificar tests y gates actuales;
- proponer el delta mínimo para Fase 1.

Astra no deberá:

- implementar todas las fases a la vez;
- crear una segunda app SEO;
- reescribir el producto completo;
- introducir dependencias de pago en Fase 1;
- inventar API keys;
- conectar servicios externos sin necesidad;
- mergear sin revisión humana;
- alterar motores Motion aprobados salvo dependencia técnica demostrada;
- solucionar otros bugs no relacionados dentro de la misma fase salvo bloqueo real.

La primera misión de implementación será exclusivamente:

> **FASE 1 — SEO FOUNDATION**

Todo lo demás queda documentado pero fuera del primer PR.

---

# 32. Valor comercial que debe preservar el producto

Rubik SEO/GEO Core existe para que la propuesta comercial pueda ser cierta:

> La plataforma genera una web premium preparada por defecto para Google Search, búsqueda local y motores de búsqueda con IA; reutiliza los datos reales del negocio para generar metadata, arquitectura semántica, structured data, SEO de imágenes y vídeo, y permite auditar y medir después el rendimiento real.

La diferencia competitiva no es tener un formulario de SEO.

La diferencia es:

```text
DISEÑO PREMIUM
+ DATA DEL CLIENTE
+ SEO/GEO AUTOMÁTICO
+ PUBLICACIÓN CORRECTA
+ AUDITORÍA REAL
+ MEJORA CONTINUA
```

---

# 33. Decisiones canónicas resumidas

1. **Nombre:** Rubik SEO/GEO Core.
2. **Naturaleza:** motor transversal reutilizable, no plugin aislado.
3. **Fuente de verdad:** Project State existente.
4. **Principio:** EDIT ONCE → PROPAGATE EVERYWHERE.
5. **Modelo:** SOURCE DATA → DERIVED DATA → GENERATED SEO.
6. **Estado de campos:** AUTO / CUSTOM.
7. **Fórmulas:** usan variables reales del cliente y adaptadores por vertical.
8. **HOME inmersiva:** se conserva; Page Registry añade URLs reales cuando existe intención independiente.
9. **Blog:** parte nativa del Core.
10. **Media:** misma Media Library enriquecida con SEO.
11. **Schema:** generado por Page Type + Business Type + datos reales.
12. **Local SEO:** capacidad de primer nivel para negocios locales.
13. **GEO:** calidad, entidad, citabilidad, crawlability y medición honesta; no humo.
14. **`llms.txt`:** experimental.
15. **`meta keywords`:** no usar.
16. **OpenSEO + Search Console:** medición post-publicación.
17. **DataForSEO:** power-up opcional.
18. **Primera implementación:** únicamente Fase 1 — SEO Foundation.
19. **Merge:** sólo tras revisión humana del PR correspondiente.
20. **Arquitectura:** un Studio, un Project State, una Media Library, un Core.

---

# 34. Resultado esperado al terminar el roadmap

El usuario crea un nuevo proyecto y rellena una sola vez:

```text
Nombre
Tipo de negocio
Descripción
Ubicación
Contacto
Horario
Servicios / cocina
Productos / platos
Equipo / chef
Redes
Media
```

Rubik SEO/GEO Core convierte esos datos en:

```text
HOME SEO
PAGE SEO
TITLES
META DESCRIPTIONS
H1/H2/H3 GUIDANCE
CANONICALS
ROBOTS
SITEMAP
OPEN GRAPH
SCHEMA
LOCAL ENTITY
IMAGE SEO
VIDEO SEO
BLOG SEO
INTERNAL LINKING
KEYWORD/INTENT WORKSPACE
AI SEARCH READINESS
PRE-PUBLISH AUDIT
POST-PUBLISH AUDIT
SEARCH CONSOLE INSIGHTS
DATAFORSEO INTELLIGENCE (OPTIONAL)
```

Todo dentro de la misma plataforma, con defaults útiles, revisión humana, trazabilidad del origen del dato y capacidad de mejora continua.

**Éste es el contrato canónico de Rubik SEO/GEO Core.**

## Plan operativo Release A-D (vigente)

Release A — Search-Ready Core = Foundation + Publisher. Release B — Content & Media = Media SEO + Page Registry + Blog. Release C — Intelligence & GEO = OpenSEO + Search Console + DataForSEO + GEO/AI Search. Release D — Multi-vertical = extracción Core + adapters Rubik. El roadmap anterior queda como trazabilidad.

Release A es España-first: sólo `es`/`es-ES`, `supportedLanguages: ['es']`; English está deshabilitado en Studio y no se emite hreflang bilingüe. **TECH DEBT · MULTILINGUAL SEO:** traducciones reales, metadata por locale, Page Registry localizado, hreflang y canonical AUTO/CUSTOM por idioma.
