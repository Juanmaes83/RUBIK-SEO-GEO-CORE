# RELEASE E — GEO Authority, Citations & Indexation

**ESTADO:** IMPLEMENTADA · CI VERDE · PREVIEW READY · REVISIÓN HUMANA DESKTOP/MÓVIL APROBADA · FUSIONADA · PR #56  
**Conexiones externas:** pendientes de backend/autorización  
**Orden cumplido:** Hardening C — Mobile + Performance está fusionado en `main`. Release E fue validada y fusionada mediante PR #56.  
**Objetivo:** ampliar Rubik SEO/GEO Core desde la optimización onsite y la medición post-publicación hacia autoridad externa verificable, descubrimiento/indexación, presencia de entidad y monitorización de citas en motores de IA.

 > La investigación de fuentes oficiales se ha realizado y el contrato base está implementado. La ausencia de credenciales o de una fuente conectada conserva `NOT_CONNECTED`, `NOT_MEASURED` o `UNKNOWN`; no se inventan menciones, reseñas, perfiles, citas, rankings ni estados de indexación.

---

## 1. Principio de arquitectura

Release E debe respetar la arquitectura existente:

```text
HOST PROJECT STATE
→ VERTICAL ADAPTER
→ RUBIK SEO/GEO CORE
→ PAGE REGISTRY / PUBLISHER
→ AUTHORITY + DISCOVERY SIGNALS
→ PROVENANCE
→ AUDIT / MONITORING
```

Reglas:

- no crear un segundo SEO Core;
- no crear un segundo Project State;
- no duplicar Page Registry;
- no convertir señales externas no verificadas en hechos;
- toda señal externa debe conservar `source`, `capturedAt`, `url/id`, `status` y provenance;
- UNKNOWN / NOT_CONNECTED / NOT_MEASURED deben seguir siendo estados válidos;
- recomendaciones comerciales de Rubik deben estar separadas de evidencia SEO/GEO observada;
- cualquier automatización de alta/edición externa requerirá autorización explícita y respetará términos de cada plataforma.

---

# 2. Capacidad E1 — Indexation & Discovery

## Objetivo

Saber si las URLs publicadas pueden descubrirse, rastrearse e indexarse realmente, y distinguir configuración técnica de evidencia observada.

## Alcance a investigar

- Google Search Console;
- Bing Webmaster Tools;
- IndexNow cuando sea compatible;
- OAI-SearchBot / crawlers de IA cuando exista documentación pública verificable;
- robots, sitemap, HTTP y canonicals ya generados por Releases A/B;
- logs o crawl evidence cuando exista una fuente real disponible.

## Estados mínimos

```text
NOT_CONNECTED
PENDING
DISCOVERED
CRAWLED
INDEXED
EXCLUDED
BLOCKED
UNKNOWN
```

Los estados deben provenir de una fuente verificable. No inferir `INDEXED` sólo porque una URL exista en sitemap.

## Preguntas de investigación

- qué APIs oficiales ofrecen estado de indexación y con qué granularidad;
- qué señales pueden medirse sin credenciales;
- cuotas y limitaciones de Search Console/Bing/IndexNow;
- cómo representar OAI/AI crawler discovery sin prometer indexación inexistente;
- qué señales deben ser snapshot histórico y cuáles pueden refrescarse.

---

# 3. Capacidad E2 — Entity Presence Graph

## Objetivo

Representar la presencia externa de la entidad por vertical y comprobar consistencia, cobertura y provenance.

## Ejemplos de nodos por vertical

- perfiles oficiales;
- Google Business Profile / mapas;
- Bing Places u otros mapas/directorios verificables;
- directorios sectoriales;
- redes sociales;
- marketplaces/plataformas relevantes;
- prensa y medios;
- perfiles profesionales;
- asociaciones/cámaras/colegios cuando correspondan.

No debe existir una lista universal obligatoria. Cada vertical adapter debe definir qué tipos de presencia son relevantes.

## Contrato orientativo

```text
ENTITY
→ PRESENCE NODE
   → provider
   → profileUrl
   → status
   → entityMatch
   → lastVerifiedAt
   → provenance
```

## Riesgos a investigar

- duplicados de entidad;
- perfiles abandonados;
- NAP inconsistente cuando aplique;
- perfiles reclamados vs no reclamados;
- datos scrapeados sin permiso;
- directorios de baja calidad;
- diferencias por país/vertical.

---

# 4. Capacidad E3 — Reputation & Mentions

## Objetivo

Observar reputación y menciones externas con evidencia y contexto, sin fabricar autoridad.

## Fuentes candidatas a investigar

- reseñas verificables;
- prensa;
- directorios;
- foros;
- Reddit;
- YouTube;
- podcasts;
- blogs/editoriales;
- menciones de marca/entidad en fuentes públicas permitidas.

## Reglas no negociables

- provenance visible;
- distinguir `review`, `mention`, `citation`, `profile` y `press`;
- no agregar puntuaciones incompatibles como si fueran una sola métrica;
- no inventar sentiment o reputación sin método documentado;
- no presentar ausencia de datos como reputación negativa;
- no crear reseñas, testimonios o menciones sintéticas.

## Modelo de señal

```text
MENTION
→ source
→ sourceType
→ url/id
→ publishedAt
→ capturedAt
→ matchedEntity
→ excerpt/metadata permitido
→ verificationStatus
→ provenance
```

---

# 5. Capacidad E4 — AI Citation Monitoring

## Objetivo

Medir si consultas objetivo producen menciones/citas de la entidad, qué fuentes se citan, qué competidores aparecen y cómo evoluciona la visibilidad.

## Flujo deseado

```text
TARGET QUERY
→ RUN / OBSERVATION
→ ENTITY MENTION
→ CITATION PRESENT?
→ CITED SOURCE
→ COMPETITORS
→ POSITION / CONTEXT WHEN RELIABLE
→ TIMESTAMP
→ PROVENANCE
→ TREND
```

## Lo que debe diferenciarse

- mención sin cita;
- cita explícita;
- referencia indirecta;
- fuente primaria vs secundaria;
- entidad propia vs competidor;
- resultado medido vs heurística;
- proveedor/modelo consultado;
- fecha de observación.

## Riesgos a investigar

- volatilidad de respuestas;
- personalización/geografía;
- diferencias entre modelos;
- falta de APIs oficiales;
- términos de uso;
- repetibilidad;
- coste por consulta;
- qué constituye una “posición” válida en interfaces generativas.

No declarar “ranking en ChatGPT” como métrica universal si el proveedor no ofrece una posición estable y reproducible.

---

# 6. UI futura

Release E deberá integrarse en **SEO · GEO → Intelligence**, no crear una aplicación separada.

Vista conceptual:

```text
INTELLIGENCE
├── Indexation & Discovery
├── Entity Presence
├── Reputation & Mentions
└── AI Citation Monitoring
```

Cada bloque debe mostrar:

- estado;
- última medición;
- fuente/provenance;
- limitaciones;
- evidencia;
- siguiente acción;
- UNKNOWN / NOT_CONNECTED / NOT_MEASURED cuando corresponda.

---

# 7. Investigación obligatoria antes de implementar

Antes de ampliar la implementación de Release E:

1. inventariar qué datos ya existen en Release C Intelligence;
2. revisar APIs oficiales actuales de Google/Bing/IndexNow y sus permisos;
3. investigar posibilidades reales de monitorización de crawlers/AI Search;
4. definir proveedores opcionales, coste y límites;
5. definir qué señales pueden obtenerse de forma legal/estable;
6. decidir storage histórico y frecuencia de actualización;
7. diseñar provenance y normalización multi-proveedor;
8. definir contratos por vertical;
9. redactar threat/privacy model básico;
10. crear fixtures sólo para lógica unitaria, nunca como evidencia productiva.

---

# 8. Gates de implementación futuros

Release E no podrá cerrarse sólo con UI.

Gate mínimo:

```text
REAL SOURCE
→ VERIFIED INGESTION
→ NORMALIZATION
→ PROVENANCE
→ UI
→ DISCONNECTED / ERROR / EMPTY STATES
→ HISTORICAL SNAPSHOT
→ HUMAN REVIEW
```

Tests mínimos futuros:

- fuente desconectada no produce datos falsos;
- URL no indexada no se marca INDEXED;
- perfil externo ambiguo no se asigna automáticamente a la entidad;
- mención sin cita no se cuenta como citation;
- fuente citada conserva URL/provider/timestamp;
- competidor no se mezcla con entidad propia;
- señales de distintos proveedores conservan provenance independiente;
- ausencia de evidencia produce UNKNOWN / NOT_MEASURED;
- adapters multi-vertical no heredan directorios irrelevantes;
- UI conserva estados empty/error/loading/partial.

---

# 9. Definition of Done futura

El contrato base de Release E se considera cerrado cuando:

1. las cuatro capacidades estén implementadas o su exclusión esté documentada;
2. la evidencia externa sea real y trazable;
3. provenance sea visible;
4. no existan autoridad, menciones o citas inventadas;
5. haya estados honestos para desconexión/incertidumbre;
6. exista historial cuando la métrica sea temporal;
7. haya tests de contratos y errores;
8. CI esté verde;
9. exista preview;
10. haya revisión humana;
11. sólo después se mergee.

---

# 10. Orden operativo

```text
HARDENING C — MOBILE + PERFORMANCE
→ CI + VERCEL + HUMAN REVIEW + MERGE
→ RELEASE E — RESEARCH
→ RELEASE E — DESIGN / CONTRACT
→ RELEASE E — IMPLEMENTATION
→ HUMAN REVIEW + MERGE
→ PROJECT MODEL FINAL / FREEZE
```

Release E ya está fusionada en `main` mediante PR #56. No modifica datos externos con valores sintéticos; cualquier conexión real futura requerirá Platform/Backend, CI, preview y revisión humana.


---

# 11. Implementación actual de la rama Release E

La rama implementa el contrato mínimo dentro de la Intelligence existente:

- `rubik-seo-geo-release-e.js` normaliza estados, provenance y registros de E1–E4.
- `rubik-seo-geo-release-e-studio.js` añade en el panel existente cuatro superficies: Indexation & Discovery, Entity Presence, Reputation & Mentions y AI Citation Monitoring.
- Las evidencias manuales/importadas conservan proveedor, tipo de fuente, URL, fecha, método y estado de medición.
- IndexNow interpreta respuestas HTTP como recepción pendiente, bloqueo, error o stale; nunca como confirmación de indexación.
- Una observación de AI distingue mención, cita, fuente propia/competidor y proveedor/modelo; no declara ranking universal.
- No se guardan tokens ni credenciales en HTML, `localStorage` o Project State.
- Search Console, Bing Webmaster y IndexNow permanecen `NOT_CONNECTED` hasta disponer de un backend/autorización server-side.
- No se ejecuta scraping automático de perfiles, reseñas, Reddit, YouTube, podcasts ni respuestas de modelos.

Fuentes oficiales consultadas para el contrato:

- [Google Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query): requiere autorización y devuelve datos agregados con límites de filas y cobertura.
- [IndexNow](https://www.indexnow.org/documentation): una respuesta 200/202 confirma recepción/aceptación de envío, no indexación.
- [OpenAI Publishers and Developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq): `OAI-SearchBot` es una señal de rastreo/configuración; no garantiza citación.
- [OpenAI web crawler guidance](https://help.openai.com/en/articles/20001243-advertiser-guidance-for-allowing-openai-web-crawlers): robots, WAF/CDN y respuestas 403/429 deben auditarse.

## Estado de cierre de esta fase

La implementación base de Release E queda validada para merge:

- contrato E1–E4 implementado;
- integración en la Intelligence existente;
- estados desconectados honestos;
- provenance y formularios manuales;
- tests y workflow focalizado verdes;
- preview Vercel READY;
- revisión visual humana desktop y móvil aprobada.

La PR #56 está fusionada. La operación externa permanece deliberadamente pendiente de Platform/Backend.

## Estado posterior al merge

El contrato base queda cerrado. Las conexiones externas no forman parte de este cierre visual ni deben simularse desde el navegador.

## Alcance que permanece abierto

La rama no declara E1–E4 operacionalmente conectados. Falta, deliberadamente:

- integrar credenciales y endpoints server-side verificables;
- definir proveedores Bing concretos;
- implementar autorización segura y almacenamiento de secretos;
- ejecutar ingestión real con provenance;
- definir histórico, frecuencia de refresco y observabilidad;
- conectar fuentes reales para indexación, presencia, menciones y citas.

Estas integraciones pertenecen a una fase posterior de Platform/Backend. No deben simularse desde el navegador ni bloquear el merge del contrato base ya validado.
