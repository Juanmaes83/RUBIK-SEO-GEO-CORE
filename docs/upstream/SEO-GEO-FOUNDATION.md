# Rubik SEO/GEO Core · Fase 1

Contrato: [SEO-GEO-ENGINE-ARCHITECTURE.md](SEO-GEO-ENGINE-ARCHITECTURE.md).
BASE: `e799fb4e9ab127500617a33f5a44e8c70d071999`. Rama: `feat/seo-geo-foundation`.
Implementación propuesta, pendiente de revisión humana; no modifica la arquitectura canónica aprobada.

## Alcance

Studio → SEO · GEO incorpora HOME (`/`), title/description/H1 AUTO o CUSTOM, preview SERP,
Restaurant JSON-LD y comprobaciones locales. No crea URLs por anchor ni por plato.
El motor es puro y no escribe almacenamiento ni modifica el head público.
`app-v4.applyAll()` reconcilia `config.seo` antes de emitir el evento de configuración existente;
el mismo historial, autosave, export/import y RestaurantStore conservan los datos.
La sección se construye al abrirla y carga su CSS entonces. No altera Motion ni la Media Library.

## Fuentes y herencia

| Dato | Fuente canónica |
|---|---|
| Nombre comercial | `brand.name` |
| Descripción | `hero.body` |
| Dirección estructurada / ciudad / teléfono | `modules.location.address.*` / `modules.location.phone` |
| Contacto visible / reserva | `visit.contact` / `visit.bookingUrl` |
| Platos / origen / ingredientes | `dishes[]` (contexto, sin introducir platos en HOME) |
| Media | Referencias existentes de `media` y platos; sin uploads nuevos |
| Categoría, cocina, nombre legal, rango de precios | `seo.business` (no existían como datos estructurados) |
| Dominio e idioma de fórmulas | `seo.site` |

El texto libre de Visit sigue intacto. No se extraen ciudades, horarios, coordenadas ni cocina
de kickers o copy de demo. Falta de datos produce avisos, no valores inventados.
AUTO conserva `value`, `templateId`, `derivedFrom` y `updatedAt`; recalcula al cambiar sus fuentes.
CUSTOM conserva la decisión humana; Volver a automático usa las fuentes actuales.
No se traduce ni reescribe el texto fuente del negocio: se reutiliza tal como está introducido.

Dirección y teléfono sólo aparecen en schema si Ubicación está activa, hay permiso público
y los datos están confirmados. Email requiere permiso y confirmación. Los wrappers
`{value, visibility:'private|internal'}` se excluyen de la proyección publicable.
Una firma de las fuentes invalida la confirmación al cambiar datos, sin duplicar su ficha.
No se incorporan credenciales, ratings, reviews, claims de citación ni mediciones ficticias.

## Límite de publicación

Fase 1 muestra previews; NO publica los campos nuevos. H1 sugerido no sustituye el hero.
La metadata y schema históricos de Class6 siguen teniendo datos de demo; se informa como
BLOCKER del Publisher, nunca como SEO público corregido. Su reemplazo, HTML definitivo,
canonical, OG, sitemap, robots y política de indexación pertenecen a Fase 2.
El candidato canonical sólo utiliza el dominio introducido, nunca `location.href` del preview.
La política prevista distingue preview noindex de producción index/noindex, con `applied:false`.
No hay blog, integración de pago, OpenSEO automatizado, Search Console ni AI visibility en esta fase.

## Validación

- `node --test tests/seo-geo-core.test.cjs`: herencia, CUSTOM/reset, privacidad, confirmación,
  parseabilidad, datos ausentes, URLs, contexto compartido y medición desconectada.
- `node tests/seo-geo-studio-e2e.mjs`: Chromium/WebKit, edición nativa, undo/redo, export/import,
  reload, texto no confiable, capturas desktop/móvil y errores JS.
- `node tests/studio-real-preview-e2e.mjs`: renderer iframe y persistencia de parent.
- Class6 y matriz pública móvil existente como controles de regresión.
- Evidencia local/CI: `output/playwright/seo-geo/`; workflow `seo-geo-foundation.yml`.

Resultado local: 9/9 pruebas del Core; Studio SEO Chromium + WebKit PASS;
Studio real preview PASS; Class6 PASS; matriz pública 11/11 combinaciones PASS.
Class24 governance: 20/21 tanto en BASE inmutable como con esta fase. Único fallo:
recuento de motores en los tres grupos (`the three concepts contain 11 / 1 / 3 engines`).
Se conserva el test existente sin debilitarlo; este PR no cambia el catálogo Motion.
No se presenta este resultado como un gate global totalmente verde.

## Referencias aplicadas

Consultadas el 14-09-2026. Se adaptan reglas, no sus apps, stores, servicios ni instaladores.

| Fuente | Regla aplicada / límite |
|---|---|
| [seo-god](https://github.com/Juanmaes83/seo-god/blob/main/SKILL.md) | Datos ausentes ≠ cero; clasificación de problemas. Su loop/OpenSEO queda para Fase 6. |
| [geo-seo-claude](https://github.com/Juanmaes83/geo-seo-claude/tree/main/skills/geo-schema) | Entidad, JSON-LD e IDs absolutos. Se excluyen ratings de ejemplo, SearchAction sin buscador y scores de citabilidad. |
| [dataforseo-claude](https://github.com/Juanmaes83/dataforseo-claude) | Métricas externas sólo con origen real; aquí NOT MEASURED, sin API ni claves. |
| [seo-blog-writer-claude](https://github.com/Juanmaes83/seo-blog-writer-claude/blob/main/SKILL.md) | Distinguir H1/title/excerpt. Blog diferido; se rechazan experiencia inventada y técnicas anti-detectores. |
| [geo-checker](https://github.com/Juanmaes83/geo-checker) | Presentación por categorías y estados; no se copia SaaS, billing ni visibilidad simulada. |
| [marketingskills](https://github.com/Juanmaes83/marketingskills/tree/main/skills) · seo-audit/schema-markup | Source accuracy y schema representativo. Longitudes orientativas, no límites rígidos. |

Contraste normativo: [Google title links](https://developers.google.com/search/docs/appearance/title-link),
[snippets](https://developers.google.com/search/docs/appearance/snippet),
[LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business),
[AI features](https://developers.google.com/search/docs/appearance/ai-features) y
[Schema.org Restaurant](https://schema.org/Restaurant).
El contrato canónico prevalece sobre sugerencias antiguas o incompatibles de las referencias.
# Release A — Search-Ready Core

Esta entrega reúne Foundation + Publisher. El motor determinista transforma datos reales del Project State en decisiones AUTO/CUSTOM trazables (`value`, `templateId`, `derivedFrom`, `updatedAt`, `decisionReason`) y materializa metadata, políticas de rastreo, Open Graph/Twitter, grafo JSON-LD, sitemap y robots.

Release A es España-first (`es`, `es-ES`, `supportedLanguages: ['es']`). Preview usa `noindex`; producción requiere `seo.site.baseUrl` HTTPS válida y nunca usa una URL Vercel como canonical. Search Console, DataForSEO, OpenSEO, Blog, Media SEO, GEO externo y multidioma quedan DEFERRED para Releases posteriores.
