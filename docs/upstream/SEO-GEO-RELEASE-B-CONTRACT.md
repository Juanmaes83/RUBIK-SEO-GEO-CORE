# Rubik SEO/GEO Core — Release B · Content & Media

**Status:** [Core·D-06] canonical execution contract for Release B. Implemented and merged in the source repository via PR #45 (2026-09-14).

**Base main:** `06b0fe234577cf28a649275b1eb40b57b7911301`

**Branch:** `feat/seo-geo-content-media`

Release B extends the existing Rubik SEO/GEO Core. It must not create a parallel SEO app, second Store, second Media Library, second Publisher or duplicated business data.

Canonical product rule:

```text
ONE STUDIO
→ ONE PROJECT STATE
→ ONE MEDIA LIBRARY
→ ONE PAGE REGISTRY
→ ONE SEO/GEO CORE
→ ONE PUBLISHER
```

Canonical data rule:

```text
EDIT ONCE → PROPAGATE EVERYWHERE
SOURCE DATA → DERIVED DATA → GENERATED SEO
```

Every derivable field must preserve `AUTO/CUSTOM` state and provenance.

Release B remains Spain-first: `es` / `es-ES`. Multilingual SEO remains technical debt and is not part of this release.

---

## 1. Release B scope

Release B combines four tightly related capabilities:

1. **B1 — Media SEO Engine**
2. **B2 — Multi-page Page Registry**
3. **B3 — Blog Engine**
4. **Internal Linking Engine**

These capabilities must use the Senior SEO Decision Engine and Publisher already delivered in Release A.

Release C capabilities remain explicitly deferred.

---

## 2. B1 — Media SEO Engine

Extend the existing Media Library. Do not create another library or SEO asset database.

### Image model

Support at minimum:

- `originalName`
- `seoFilename` with `AUTO/CUSTOM`
- `alt` with `AUTO/CUSTOM`
- `caption` with `AUTO/CUSTOM`
- `title` with `AUTO/CUSTOM`
- `width`
- `height`
- `format`
- `subjectEntityRefs`
- `pageRefs`
- `decorative`

### Image rules

- `seoFilename` must be descriptive, short and based only on real source data.
- Never destructively rename the original asset or break its identity/reference.
- Use `seoFilename` only as the publish/export filename when appropriate.
- ALT must describe the real image.
- If Project State does not prove what the image contains, do not invent a specific ALT; request or recommend context instead.
- `decorative=true` → `alt=""`.
- Informative image without ALT → `WARNING`.
- Captions only when they add useful context.
- No keyword stuffing.
- Preserve width and height.
- Warn about unsuitable format, dimensions or weight.
- Hero/LCP media must not be incorrectly lazy-loaded.
- OG/schema media must resolve to a stable publishable URL.

Use real context when available from the existing project model, such as:

- `dish.name`
- `dish.origin`
- `business.name`
- `location.city`
- real chef/team entities
- page/slot context
- entity references

### Video model

Support at minimum:

- `seoFilename`
- `title`
- `description`
- `thumbnailRef`
- `transcript`
- `captionsRef`
- `duration`
- `uploadDate`
- `contentUrl`
- `embedUrl`
- `isSeoContent`

Do not classify every loop/background animation as SEO content.

Generate `VideoObject` only when the video is real editorial content and metadata is sufficient.

---

## 3. B2 — Multi-page Page Registry

Extend the HOME-only registry from Release A.

Keep the immersive HOME and its anchors, but allow real crawlable URLs when a distinct intent and sufficient factual content exist.

Supported examples:

```text
/
/carta/
/chef/
/reservas/
/ubicacion/
/blog/
/blog/<slug>/
```

No route type is mandatory merely because the system supports it.

### Page Registry model

Every entry must support at minimum:

- `id`
- `path` / `slug`
- `pageType`
- `status: draft | published`
- `indexable`
- `canonical`
- `title`
- `description`
- `h1`
- `og`
- `primaryQuery`
- `topics`
- `entities`
- `schemaSet`
- `socialImageRef`
- `internalLinks`
- `auditStatus`

Metadata/schema logic must reuse Release A. Do not duplicate decision logic.

### Thin Page Guard

A URL cannot become indexable simply because a page type exists.

A publishable/indexable route requires:

```text
DISTINCT INTENT
+ SUFFICIENT FACTUAL CONTENT
+ USER / BUSINESS VALUE
```

Examples:

- unknown chef → no `/chef/` page;
- no reservation capability → no page promising reservation;
- one thin dish record → no automatic SEO landing page;
- insufficient page content → draft/noindex + warning.

Do not use an arbitrary word count as the only quality rule.

### Route safety

- Slugs must be unique and stable.
- If a published slug/path changes, preserve history.
- Generate/configure a permanent redirect when appropriate.
- Never silently produce a broken URL.
- Update internal links, canonical and sitemap after route migration.

### Sitemap

Evolve automatically from HOME-only to all routes that are:

- published;
- indexable;
- canonical;
- production routes.

Exclude drafts, noindex pages, Studio routes and previews.

Add breadcrumbs only where a real hierarchy exists. Emit `BreadcrumbList` only when it matches the visible published structure.

---

## 4. B3 — Blog Engine

Blog belongs inside the same Studio, Project State, Page Registry, SEO/GEO Core and Publisher.

Do not build a separate blog application or CMS.

Canonical article workflow:

```text
IDEA / TOPIC
→ INTENT
→ PRIMARY QUERY
→ ENTITIES / TOPICS
→ SLUG
→ SEO TITLE
→ H1
→ H2 / H3
→ CONTENT
→ INTERNAL LINKS
→ MEDIA
→ AUTHOR
→ ARTICLE / BLOGPOSTING
→ OG
→ PREVIEW
→ PUBLISH
```

### Minimum article model

- `id`
- `status`
- `title`
- `slug`
- `excerpt`
- `authorId`
- `datePublished`
- `dateModified`
- `category`
- `topics`
- `primaryQuery`
- `headings`
- `body`
- `coverMediaRef`
- `internalLinks`
- `externalSources`
- `seo`

### Article rules

Every published article must have:

- one principal H1;
- H2s for real sections;
- H3s only for real subsections;
- natural heading structure;
- unique metadata;
- unique stable slug;
- contextual media;
- useful internal links;
- coherent `Article` or `BlogPosting` schema;
- real publication/modification dates;
- a real valid author entity.

Never invent a Person or chef as author.

If no real person author exists, use a real organization only when semantically appropriate, or require author completion.

Draft article → noindex and absent from sitemap.

Published article → same Publisher contract as Release A.

### First-party expertise priority

Prefer content grounded in the restaurant's actual knowledge and assets:

- dishes;
- ingredients;
- suppliers;
- provenance;
- territory;
- processes;
- techniques;
- chef/team;
- real customer questions;
- product decisions;
- original photography;
- original video.

Do not generate generic filler interchangeable with any restaurant.

Do not implement anti-AI-detector techniques.

FAQ schema is valid only when matching FAQ content is real and visible.

---

## 5. Internal Linking Engine

Suggest links using relevant relations such as:

- entity;
- topic;
- category;
- dish/product;
- origin;
- intent;
- related pages;
- blog relationships.

Every suggestion must:

- point to a real existing URL;
- respect indexability;
- explain why the link is recommended;
- avoid forced/repetitive anchor text;
- require review before automatic insertion.

Detect broken internal links after route or slug changes.

---

## 6. SEO/GEO Studio requirements

Extend the existing SEO · GEO panel. Do not create another panel/app.

Release B must make these sections actually usable:

- **Páginas**
- **Media SEO**
- **Blog**
- **Contenido**

Keep **Overview** and **Auditoría** integrated.

UI must expose, where relevant:

- AUTO/CUSTOM state;
- provenance/source;
- warnings;
- preview;
- draft/published/indexable state;
- asset ↔ page ↔ entity relationships.

---

## 7. Release B pre-publish audit

Extend the audit system with at least:

### Media

- informative image without ALT;
- generic/incoherent ALT;
- decorative image with unnecessary ALT;
- poor filename;
- missing dimensions;
- hero/LCP misconfiguration;
- editorial video without thumbnail;
- incomplete `VideoObject`.

### Pages

- thin page;
- missing H1;
- duplicate metadata;
- duplicate slug;
- conflicting canonical;
- draft inside sitemap;
- orphan page;
- broken internal link.

### Blog

- invalid/missing author;
- incoherent Article schema;
- bad heading hierarchy;
- weak generic article with insufficient first-party signal.

Use the canonical severities:

```text
BLOCKER
ERROR
WARNING
OPPORTUNITY
PASS
DEFERRED
```

Release C remains `DEFERRED`, never a Release B blocker.

---

## 8. Explicitly out of scope for Release B

Do not connect or implement yet:

- OpenSEO;
- Search Console;
- DataForSEO;
- rank tracking;
- real SERP metrics;
- real competitor gaps;
- AI Citability Heuristic;
- advanced OAI crawler controls;
- `llms.txt`;
- multilingual SEO;
- other vertical adapters.

Do not invent synthetic values to stand in for those integrations.

---

## 9. Minimum automated tests

### B1 Media SEO

- AUTO filename generation;
- CUSTOM persistence;
- reset to AUTO;
- factual ALT;
- decorative `alt=""`;
- informative media without context does not hallucinate description;
- performance warnings;
- `VideoObject` only when justified.

### B2 Page Registry

- create valid route;
- duplicate slug rejected;
- draft is noindex;
- draft excluded from sitemap;
- thin page guard;
- no chef page without a real chef entity;
- canonical per page;
- multipage sitemap;
- redirect/path migration;
- preview URLs excluded;
- Publisher materializes raw HTML for each page.

### B3 Blog

- draft/publish lifecycle;
- unique slug;
- valid H1/H2/H3 hierarchy;
- unique metadata;
- real author enforcement;
- valid Article/BlogPosting;
- cover media;
- valid internal links;
- real `datePublished` / `dateModified`;
- drafts excluded from sitemap.

### Regression

Release A must remain green, including:

- Store / Project State;
- autosave;
- undo/redo;
- export/import;
- Media Library;
- Motion;
- Product Engines;
- desktop/mobile;
- basic accessibility;
- UTF-8 gate;
- Spain-first contract;
- Publisher contract.

Historical Motion governance count mismatches remain a separate baseline and must not be opportunistically changed inside Release B.

---

## 10. Execution order

Work sequentially in the same Release B PR:

```text
B1 Media SEO
→ tests
→ checkpoint + push

B2 Page Registry
→ tests
→ checkpoint + push

B3 Blog + Internal Linking
→ tests
→ checkpoint + push
```

Push progress after each checkpoint so no meaningful work remains local-only.

Do not create extra branches for B1/B2/B3.

---

## 11. Definition of Done

Release B is complete only when:

1. existing Media Library is SEO-enriched without duplication;
2. image/video automation is factual and safe;
3. Page Registry publishes valid real URLs;
4. thin pages are blocked or remain draft/noindex;
5. canonical/schema/OG/sitemap work per page;
6. Blog Engine creates and publishes real articles;
7. Article/BlogPosting schema is coherent;
8. internal linking works without spam;
9. raw HTML SEO is materialized for every published page;
10. Release A does not regress;
11. new automated tests pass;
12. Vercel is READY;
13. an exact preview URL exists;
14. human visual review remains pending until explicitly approved;
15. PR remains DRAFT/UNMERGED until that approval.

---

## 12. Final delivery evidence

At Release B completion report:

- final HEAD SHA;
- PR URL;
- exact Vercel URL;
- B1/B2/B3 status;
- tests/gates;
- historical baseline separately;
- concise human review checklist.

**DO NOT MERGE without human visual approval.**

**DO NOT START RELEASE C inside Release B.**
