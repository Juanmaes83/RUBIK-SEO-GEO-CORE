# Release C — Intelligence & GEO contract

**Estado:** [Core·D-06] implementada y fusionada en el repositorio fuente mediante PR #46 (2026-09-16), con revisión visual humana aprobada.

## Architecture

Release C is one post-publish Intelligence Layer inside the existing SEO·GEO Studio. It consumes the public production output, Project State, Page Registry and canonical Publisher. It adds no store, dashboard application or credentials to public state.

## Provider states

`NOT_CONFIGURED`, `NOT_CONNECTED`, `CONNECTED`, `SYNCING`, `READY`, `ERROR`, `STALE` and `NOT_MEASURED` are the only integration states. Missing data remains `null`/unknown; it is never converted to zero.

## OpenSEO provider contract

The adapter performs GET connectivity against the configured endpoint, then POSTs `{action:"crawl",baseUrl,urls:[{pageId,url}]}`. A provider may return a result or `jobId` plus `resultUrl`; the adapter polls that provider result and normalizes findings. Direct page fetch is not called OpenSEO. Unreachable/timeout is `ERROR`.

## Search Console lifecycle

OAuth is server side. The adapter exposes `connectivity`, `fetchQueries`, `fetchPages`, `sync` and `normalize`, preserving property, 7d/28d/90d range, provider and fetch time. Without authorization the UI remains `NOT_CONNECTED` and shows no fake metrics.

## DataForSEO policy

DataForSEO is optional and manual. Refresh is explicit, cached and records `lastFetchedAt`, provider cost when supplied, and a visible cost warning. No render triggers paid calls. Missing volume/difficulty/position are `null`.

## Snapshots and diffs

Snapshots are immutable and include provider, timestamps, base URL, pages scanned, issues, metrics and provider version. Diffs produce `NEW`, `RESOLVED`, `UNCHANGED`, `IMPROVED` or `REGRESSED` using category-aware metric direction; incompatible providers are never compared.

## Insights and evidence

Insights require evidence and contain type, source, page/query relation, severity, confidence, recommendation, creation time and lifecycle status (`OPEN`, `REVIEWED`, `RESOLVED`). Equivalent insights are deduplicated. External data only recommends; it never auto-applies SEO changes.

## Crawler semantics

robots.txt is parsed per User-agent with wildcard fallback and specific-group precedence. Googlebot, Google-Extended, OAI-SearchBot and GPTBot are reported independently, alongside meta robots, HTTP status and canonical match/mismatch evidence. Allowing a crawler is not a visibility claim.

## GEO heuristic policy

Entity, content, technical and citability readiness are labelled `HEURISTIC` and use verifiable Project State/published output signals. Structured data and public HTML are `MEASURED`, `MISSING` or `NOT_MEASURED` only when output evidence is supplied. AI Search observations remain `NOT_MEASURED` without an external provider. `llms.txt` is experimental and never a blocker.

## Studio UX and persistence

The existing SEO·GEO Studio exposes provider status/actions, OpenSEO endpoint and crawl/snapshots, Search Console periods, DataForSEO manual refresh/cost warning, GEO signals and evidence-backed insights. Actions persist through RestaurantStudioConfig into `seo.integrations`, `seo.intelligence` and `seo.geo`; reload must preserve snapshots.

## Security, tests and DoD

Secrets are backend/serverless environment variables only. CI uses provider-shaped mocks, never paid APIs. Release C is review-ready when adapters, persistence, category-aware diffs, crawler audit, heuristic GEO, Studio E2E and Release A/B regression gates pass; real providers remain honestly disconnected until configured.
