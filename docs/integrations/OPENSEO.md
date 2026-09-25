# Integración prevista: OpenSEO

**Estado:** 📝 DOCUMENTADA · ⛔ PUENTE NO IMPLEMENTADO · bloqueada por CORE-2 (bloqueado por alcance), por la validación con mocks MCP y por la Platform Layer (ROADMAP CORE-7.1). La conectividad honesta por `/api/health` está implementada en CORE-3 (D-14), pendiente de merge.
**Verificado el:** 24/09/2026, contra el código de `Juanmaes83/open-seo@0ffff93101043aad7600a3b6a499a0cd2887ef49`. Es un fork idéntico a `every-app/open-seo` en esa fecha (`compare`: ahead 0 / behind 0).
**Método:** lectura del código fuente en un clon de solo lectura. **No** se ha llamado a ninguna instancia de OpenSEO ni a DataForSEO, ni se ha desplegado nada.

> Este documento es la autoridad del Core sobre OpenSEO. `upstream/SEO-GEO-INTEGRATIONS.md` describe el contrato **heredado** (`OPENSEO_ENDPOINT` + acción `crawl`), que no coincide con el OpenSEO real (§3). Donde choquen, manda este documento.

---

## 1. Qué es OpenSEO (verificado en el código)

- Una aplicación completa: TanStack Start sobre Cloudflare Workers, o Docker para self-host, con base de datos propia, proyectos, auth, billing (Autumn) y UI. Es una **alternativa a Semrush/Ahrefs** con BYOK de DataForSEO.
- **Servidor MCP en `/mcp`** (`src/server/mcp/context.ts: MCP_ROUTE = "/mcp"`). Usa el transporte *Streamable HTTP* de `@modelcontextprotocol/server` (`src/server/mcp/transport.ts`).
  - En hosted es `https://app.openseo.so/mcp` (`plugins/openseo/mcp.json`).
- **Health check en `GET /api/health`** (`src/routes/api/health.ts`), sin autenticación:
  - self-host: `{status:"ok"|"issues", checks:{…}}`, con el estado de configuración por funcionalidad y nunca con secretos;
  - hosted: solo `{status:"ok"}`.
- **Autenticación del MCP** (`src/server.ts`, `src/server/mcp/api-key-auth.ts`):
  - `AUTH_MODE=hosted`: OAuth 2.1 (proveedor propio) o API key con prefijo `oseo_` (`x-api-key` o `Authorization: Bearer`);
  - `AUTH_MODE=cloudflare_access`: la sesión la da Cloudflare Access;
  - `AUTH_MODE=local_noauth`: sin auth y limitado a hostnames locales.
- **No hay API REST pública de datos.** Las rutas `src/routes/api/*` son solo `health`, `auth`, `autumn` (billing) y los callbacks OAuth de GA4/GSC. La UI usa server functions internas.

### Herramientas MCP relevantes (`src/server/mcp/tools/*`)

| Grupo | Herramientas | ¿Consume DataForSEO? |
|---|---|---|
| Proyecto | `list_projects`, `create_project`, `get_project_context`, `update_project_context`, `whoami` | No |
| **Site audit** | `run_site_audit` (`projectId`, `url`, `maxPages` 10–10 000, 50 por defecto, `runLighthouse` false por defecto) → `auditId`; `get_audit_status`; `get_audit_issues` (`severity` critical/warning/info, `issueType`, `limit` ≤1000); `get_audit_pages`; `list_site_audits`; `delete_site_audit` | El crawl, no (crawler propio). **Lighthouse sí:** hasta 20 llamadas facturadas por audit (§6.1) |
| Search Console / GA4 | `get_search_console_performance`, `get_search_opportunities`, `inspect_urls`, `get_google_analytics_*` | No (OAuth de Google en OpenSEO) |
| Keywords / SERP | `research_keywords`, `get_keyword_metrics`, `get_serp_results`, `find_serp_competitors`, `get_ranked_keywords`, `get_domain_overview`, `get_domain_keyword_suggestions` | **Sí** (§6.2); `search_serp_locations`: no confirmado |
| Backlinks | `get_backlinks_overview`, `get_backlinks_profile` | **Sí** |
| Rank tracking | `create_rank_tracker`, `run_rank_tracker`, `estimate_rank_tracker_cost`, `get_rank_tracker`, `add/remove_rank_tracking_keywords` | **Sí** (recurrente) |
| Local SEO | `get_local_serp_results`, `get_local_rank_grid`, `search_local_businesses`, `get_business_profile`, `get_business_reviews`, … | **Sí** |
| Informes | `save_report`, `get_report`, `list_reports`, plantillas | No |

## 2. Qué capacidades interesan al Core y cuáles ya cubre

| Capacidad | ¿Ya en el Core? | Interés de OpenSEO |
|---|---|---|
| Generar metadata, schema, canonical, sitemap y robots | ✅ `core`, `publisher` | Ninguno: OpenSEO audita, no publica |
| Gate raw-HTML antes de publicar (H1, headings, canonical, OG, JSON-LD) | ✅ `publisher.rawHtmlContract`, `materialize` | Bajo: el Core ya lo impide antes de publicar |
| Contrato por página, enlaces rotos internos, huérfanas, redirects (datos del Project State) | ✅ `release-b` | Complementario: OpenSEO lo mide **sobre la web publicada** |
| **Crawl post-publicación** (enlaces rotos reales, cadenas de redirect, canonical, thin content, bloqueos 403/429 de WAF) | Solo el contrato (`OpenSEOAdapter.crawl`, snapshots, `diff`, `triage`) | **Alto:** es la fuente real que falta (Release C) |
| Crawler/robots para bots de IA | ✅ heurístico (`crawlerAudit`, `parseRobots`) | Medio: `blocked-page`/`rate-limited-page` aportan evidencia |
| Search Console | Contrato `SearchConsoleAdapter` con cliente inyectado | Medio: OpenSEO ya resuelve OAuth y consultas. Alternativa a construir un backend GSC propio |
| Keywords, SERP y competidores | Contrato `DataForSEOAdapter` (manual, con caché) | Medio: con coste por consulta (§6) |
| Lighthouse / CWV | No (Hardening C lo mide el host) | Bajo: con coste; el host ya tiene su baseline |
| Presencia, reseñas y citas IA (Release E) | Contrato E1–E4 con provenance | Futuro: las herramientas locales tienen coste y exigen provenance E2/E3 |

## 3. Desajuste entre el contrato actual del Core y el OpenSEO real

El contrato heredado (`src/rubik-seo-geo-intelligence.js` `OpenSEOAdapter` + `upstream/SEO-GEO-INTEGRATIONS.md`) **no coincide con ninguna interfaz de OpenSEO**:

| Aspecto | Lo que espera el Core | Lo que ofrece OpenSEO | Consecuencia |
|---|---|---|---|
| Configuración | `OPENSEO_ENDPOINT`: una URL HTTPS base | Una URL de app, con MCP en `/mcp` y health en `/api/health` | `OPENSEO_ENDPOINT` no existe en OpenSEO: es un nombre del Core |
| Conectividad | Heredado: `GET <endpoint>` y `r.ok` → `CONNECTED`. **CORE-3 (D-14):** `GET <endpoint>/api/health` | La raíz devuelve la app web (HTML) | El heredado daba un falso positivo (cualquier web HTTPS con 200 daba `CONNECTED`). **Corregido en CORE-3:** solo cuenta `/api/health`, validando el JSON, y nunca devuelve `CONNECTED` sin autorización MCP verificada |
| Lanzar crawl | `POST <endpoint>` con JSON `{action:'crawl', baseUrl, urls:[{pageId,url}]}` | MCP `tools/call run_site_audit {projectId,url,maxPages,runLighthouse}` | No hay endpoint HTTP `crawl`. Hace falta un `projectId` de OpenSEO. No acepta una lista de URLs: parte de una URL inicial y rastrea el mismo origen |
| Job y polling | `{jobId, resultUrl?}` → `GET <endpoint>/crawl/<jobId>` con `status` pending/running/completed/failed | `auditId` → `get_audit_status` (status + phase + pagesCrawled/Total) | Otro protocolo y otros nombres de estado |
| Resultado | `{issues:[{pageId,url,category,severity,message,evidence}], pagesScanned}` | `get_audit_issues` → `{summary[], issues[]}` con `issueType` (p. ej. `blocked-page`, `rate-limited-page`) y `severity` critical/warning/info; `get_audit_pages` | Hace falta un mapeo explícito. `pageId` del Core ↔ URL canónica |
| Auth | Ninguna (se prohíben credenciales en la URL) | OAuth, API key `oseo_` o Cloudflare Access | El navegador no puede autenticarse sin exponer secretos |
| Límites | `maxPolls`, `timeout` | `AUDIT_CAPACITY_REACHED`, `AUDIT_ALREADY_RUNNING`, `RATE_LIMITED`/`USAGE_EXCEEDED` (con `Retry-After`) | Deben mapearse a `ERROR`/`STALE` con mensaje, nunca a `READY` |

Conclusión: **hoy el Core no puede conectarse a un OpenSEO real.** Los tests de Release C (`tests/seo-geo-release-c.test.cjs`) validan el contrato contra un `fetch` simulado sobre `https://openseo.test`, no contra OpenSEO. El E2E del host usa otro mock (`mock-openseo.test`). Esto no se considera un bug que haya que corregir ahora: es un contrato previo a conocer la interfaz real, y queda registrado como `DECISIONS.md` D-09.

## 4. Opción de integración recomendada

**Puente de proveedor server-side (host backend / Platform Layer) que actúa como cliente MCP de OpenSEO.** El Core no habla MCP.

```text
Studio (navegador) ──acción explícita──▶ Backend del host: «OpenSEO bridge»
                                          │  secreto: API key oseo_ / service token de Cloudflare Access
                                          │  cliente MCP → https://<openseo>/mcp
                                          │    run_site_audit → get_audit_status → get_audit_issues/pages
                                          ▼
                              Contrato de proveedor del Core (JSON normalizado, sin secretos)
                                          ▼
              intelligence.makeSnapshot / diff / triage → config.seo.intelligence (un único Project State)
```

Pasos (todos pendientes; ver ROADMAP CORE-7.1):

1. **Definir la interfaz de proveedor del Core** (CORE-3): `connectivity()`, `startCrawl({baseUrl})`, `crawlStatus(jobId)` y `crawlResult(jobId)`, inyectada como en `SearchConsoleAdapter` y `DataForSEOAdapter` (cliente inyectado). El `OpenSEOAdapter` HTTP actual queda como una implementación del puente, no como conexión directa del navegador.
2. **Validar con mocks** que reproduzcan las respuestas MCP reales: `run_site_audit` con y sin `auditId` (rechazos de capacidad), estados de `get_audit_status`, `get_audit_issues` con `blocked-page` y `rate-limited-page`, 401/429 con `Retry-After`. Sin red.
3. **Conectividad honesta** (implementada en CORE-3, D-14): `GET /api/health`. `status:"ok"` ⇒ `NOT_CONNECTED` (instancia sana, `authorization:"NOT_VERIFIED"`); `CONNECTED` solo cuando el puente verifique la autenticación MCP (§7). `"issues"` ⇒ `ERROR` con los nombres de los checks que fallan. Sin JSON, HTTP de error o red caída ⇒ `ERROR`. La raíz de la app nunca cuenta.
4. **Mapeo propuesto, a validar:** `auditId`→`jobId`; `critical`→`ERROR`, `warning`→`WARNING`, `info`→`OPPORTUNITY`; `issueType`→`category`; `source:'openseo'`; `evidence` con `auditId`, `issueType` y URL.
5. **Proyecto OpenSEO ↔ Project State:** el puente guarda el `projectId` de OpenSEO por proyecto del host en su backend, no en el Project State público. Si hace falta, se referencia en `seo.integrations.openseo` como un id opaco sin valor de credencial.

**Límites de esta opción:**
- Necesita la Platform Layer del host (backend, auth, secretos), que todavía no existe.
- El crawl es asíncrono y dura minutos: exige estado `SYNCING` y reintento, nunca bloquear el render.
- Hay límites de capacidad y concurrencia por cuenta.
- El crawl parte de una URL inicial y el mismo origen, así que no audita solo las rutas del Page Registry. La correlación se hace por URL canónica.
- Las respuestas MCP incluyen texto para agentes. El puente solo consume `structuredContent`.

**Opciones descartadas:**
- **MCP directo desde el navegador:** expondría API keys y tokens OAuth y rompería la regla de secretos (H8).
- **Añadir a OpenSEO un endpoint REST `crawl` propio:** crearía un fork mantenido de OpenSEO, con deuda sobre un proyecto externo.
- **Copiar el crawler o el código de OpenSEO al Core:** duplicaría un producto entero (§8).

## 5. Seguridad de credenciales y manejo de datos

- Las credenciales (`oseo_…`, tokens OAuth, service tokens de Cloudflare Access, `DATAFORSEO_API_KEY` de la instancia self-host) **solo existen en el backend** del host o en la instancia OpenSEO. Nunca van en HTML, `localStorage`, Project State, export JSON ni logs.
- El Core sigue rechazando endpoints con usuario, contraseña, query o fragment (`providerEndpoint`). Esa regla se mantiene.
- Al proveedor se envían solo URLs públicas de producción (`seo.site.baseUrl`). Nunca URLs de preview ni datos privados NAP.
- Los resultados se guardan normalizados y acotados (issues + evidencia mínima), con `source`, `snapshotId`, `detectedAt` y el id del audit como provenance. No se copian HTML completo ni volcados del proveedor.
- En self-host, `/api/health` es público y solo publica estados de configuración. Aun así, conviene no exponer la instancia sin Cloudflare Access o un equivalente.
- La telemetría anónima de OpenSEO self-host se puede desactivar con `OPENSEO_TELEMETRY_DISABLED=1` (`.env.selfhost.example`). Es decisión del operador.

## 6. Costes de DataForSEO y prevención de consultas duplicadas

- OpenSEO usa DataForSEO en modo BYOK y pago por uso: 1 $ de crédito inicial, recarga mínima de 50 $ (`docs/DATAFORSEO_API_KEY.md`). En hosted, OpenSEO cobra un 28 % sobre el coste DataForSEO (README).
### 6.1 Site audit y Lighthouse (verificado en el código, `@0ffff93`)

- **El crawl del site audit no llama a DataForSEO.** `src/server/workflows/siteAuditWorkflowCrawl.ts` no importa ningún módulo `lib/dataforseo`, y la propia investigación del proyecto describe el audit como «our own crawler … no vendor spend» (`docs/site-audit-pm-research.md`, §«one-sentence version»).
- **Lighthouse sí genera cargos de DataForSEO:**
  - `run_site_audit` con `runLighthouse:true` fija `lighthouseStrategy:"auto"` (`src/server/mcp/tools/site-audit-tools.ts`, handler de `runSiteAuditTool`). Por defecto es `false` → `"none"`.
  - `src/server/workflows/siteAuditWorkflowPhases.ts` sale sin coste cuando `lighthouseStrategy === "none"`. En otro caso, por cada página de la muestra llama **dos veces** a `fetchLighthouseResult`: `"mobile"` y `"desktop"`.
  - `src/server/lib/audit/lighthouse.ts` → `src/server/lib/dataforseo/lighthouse.ts`, `POST /v3/on_page/lighthouse/live/json`. El código lo describe como «Billed, non-idempotent POST» y nunca reintenta un 5xx.
  - La muestra `auto` es «homepage + 1 per URL pattern, capped at 10» (`selectLighthouseSample`, `src/server/lib/audit/lighthouse.ts`). **Tope: hasta 20 llamadas facturadas por audit.**
  - La documentación de self-host lo confirma: sin clave DataForSEO en el worker de audit, «every Lighthouse check in an audit fails» (`docs/SELF_HOSTING_CLOUDFLARE_LEGACY.md`).
- Regla para el puente: `runLighthouse` siempre `false`, salvo acción explícita del usuario con aviso del tope de 20 llamadas.

### 6.2 Herramientas MCP que generan cargos de DataForSEO

| Herramientas MCP | Cadena en el código | Endpoints DataForSEO (`src/server/lib/dataforseo/*`) |
|---|---|---|
| `research_keywords` | `features/keywords/services/research/research-data.ts` (`createDataforseoClient`), `refresh-metrics.ts` | `labs.ts` (keyword ideas, suggestions, overview, related), `google-ads.ts` |
| `get_keyword_metrics`, `get_ranked_keywords`, `find_serp_competitors`, `search_local_businesses`, `get_google_business_questions` | `mcp/tools/dataforseo-research-tools.ts` (`client.labs.serpCompetitors`, `client.domain.rankedKeywords`, `client.business.*`, `client.serp.local`) | `labs.ts`, `google-ads.ts`, `business.ts`, `serp.ts` |
| `get_domain_overview`, `get_domain_keyword_suggestions` | `features/domain/services/DomainService.ts` (`dataforseo/research`) | `labs.ts` (domain rank overview, ranked keywords, relevant pages) |
| `get_serp_results` | `mcp/tools/get-serp-results.ts` (`client.serp.live`) | `serp.ts` (`/v3/serp/google/organic/live/advanced`) |
| `get_backlinks_overview`, `get_backlinks_profile` | `mcp/tools/get-backlinks-*.ts` | `backlinks.ts` (`/v3/backlinks/...`) |
| `create_rank_tracker`, `run_rank_tracker`, `add_rank_tracking_keywords` | `features/rank-tracking/services/RankTrackingService.ts` → `workflows/RankCheckWorkflow.ts` (`createDataforseoClient`) | `serp.ts`. **Recurrente:** `scheduleInterval` vale `"weekly"` por defecto |
| `get_local_serp_results`, `get_local_rank_grid`, `get_business_profile`, `get_business_reviews`, `get_business_updates`, `list_business_categories` | `mcp/tools/local-seo-tools.ts` (`client.business.*`, `client.serp.local`) | `business.ts` (`/v3/business_data/...`), `serp.ts` (maps, local finder) |
| `run_site_audit` con `runLighthouse:true` | ver §6.1 | `lighthouse.ts` |

No incluidas en la tabla por falta de verificación: `search_serp_locations` (`lib/dataforseo/serp-locations.ts` no muestra llamada HTTP en su cabecera) y los informes o herramientas de proyecto. Deben tratarse como «coste no confirmado» hasta revisarlas.

El importe concreto por llamada no se documenta aquí: depende de la tarifa vigente de DataForSEO y del recargo del hosted. El coste real lo registra OpenSEO por llamada (`trackDataforseoCost`, `src/server/lib/dataforseo/client.ts`). `estimate_rank_tracker_cost` da una estimación previa para rank tracking.

### 6.3 Prevención
- Prevención, coherente con el contrato actual del Core:
  - solo refresh manual, con confirmación explícita y aviso de coste (`costWarning`, regla de `upstream/SEO-GEO-INTEGRATIONS.md`);
  - caché por clave `[requestType, payload]` (ya existe en `DataForSEOAdapter`). El puente añade TTL y persistencia server-side;
  - como mucho una ejecución en curso por proyecto (`SYNCING`): un segundo clic reutiliza el job en curso;
  - nunca lanzar consultas desde el render, al cargar o al importar un proyecto;
  - usar `estimate_rank_tracker_cost` antes de cualquier rank tracking;
  - un presupuesto por proyecto en el backend (fuera del Core).

## 7. Estados honestos

| Estado | Cuándo |
|---|---|
| `NOT_CONFIGURED` | No hay instancia OpenSEO configurada en el backend del host |
| `NOT_CONNECTED` | Hay instancia pero no autorización o proyecto enlazado (OAuth/API key pendiente) |
| `CONNECTED` | `/api/health` responde con `status:"ok"` y la autenticación MCP (`whoami`) funciona |
| `SYNCING` | Hay un audit en curso (`get_audit_status` todavía no ha terminado) |
| `READY` | El último audit terminó y está normalizado en un snapshot |
| `STALE` | Hay un snapshot previo, pero el último intento falló, o el snapshot es anterior a la última publicación |
| `ERROR` | Endpoint inválido, health `issues` o no-JSON, 401/403, 429 o `USAGE_EXCEEDED`, `AUDIT_CAPACITY_REACHED`, timeout de polling. Siempre con mensaje acotado |
| `NOT_MEASURED` | Métricas que requieren DataForSEO sin cliente autorizado: volumen y dificultad = `null` |

Una ausencia de datos nunca es `READY` ni PASS.

## 8. Lo que no se debe hacer

- No copiar OpenSEO ni partes de él (crawler, UI, DB, billing, skills) al Core.
- No crear un segundo Studio, Store, Media Library, Project State ni Page Registry. La UI vive en el Studio del host (panel Intelligence existente) y los datos, en `config.seo.intelligence`.
- No hablar MCP desde el navegador ni guardar tokens en el cliente.
- No ejecutar consultas de pago, auditorías reales ni despliegues como parte de la integración inicial. **Primero se documenta el contrato (este documento) y se valida con mocks.**
- No declarar OpenSEO como conectado sin un health check y una autenticación reales.
