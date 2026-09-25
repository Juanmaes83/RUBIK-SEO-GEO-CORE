# Roadmap operativo — Rubik SEO/GEO Core

**Única fuente de estado del Core.** Última verificación: 25/09/2026, contra `main@b382253` de este repositorio. Todo cambio de código y documentación se hace solo en RUBIK-SEO-GEO-CORE. No se modifica ningún repositorio externo ni se accede a WEB-RESTAURACI-N-PREMIUM-DIN-MICA. Las lecturas externas requieren autorización expresa y concreta.

## 1. Estado heredado (verificado)

Se implementó y fusionó en el repositorio de Restaurantes Premium. Evidencia: PRs en estado MERGED y `docs/PROJECT-STATE-CLOSEOUT-2026-09-21.md` del fuente.

| Bloque | PR fuente | Merge | Estado | En este repo |
|---|---|---|---|---|
| Release A · Search-Ready Core | #44 | 14/09 | ✅ cerrado | `core`, `publisher` + tests |
| Release B · Content & Media | #45 | 14/09 | ✅ cerrado | `release-b`, `media` + tests |
| Release C · Intelligence & GEO | #46 | 16/09 | ✅ cerrado | `intelligence` + tests |
| Release D · Multi-vertical | #50 | 16/09 | ✅ cerrado | `adapters` (7 verticales) + tests |
| Hardening A · Base técnica indexable | #53 | 18/09 | ✅ cerrado | `materialize` + test raw-HTML/HTTP |
| Hardening B · SEO explícito por página | #54 | 18/09 | ✅ cerrado | contrato por página + test (sin sus asserts de UI host) |
| Hardening C · Mobile + Performance | #55 | 21/09 | ✅ cerrado **en el host** | No aplica al Core: mide la web pública de Restaurantes |
| Release E · Authority, Citations & Indexation | #56 | 21/09 | ✅ **contrato base E1–E4 cerrado** · ⏳ **conexiones externas abiertas** | `release-e` + tests |
| Project Model Final · Schema Freeze v5 | #57 | 21/09 | ✅ cerrado **en el host** | No aplica: el Core consume la proyección runtime |

Sobre Release E: la arquitectura fuente todavía la llama «FUTURO», pero es un texto anterior al merge. El criterio aplicado está en `DECISIONS.md` D-06.

Lo que sigue abierto de Release E, sin simulación: Google Search Console, Bing Webmaster, IndexNow, ingestión real de crawlers y citas IA, backend con autorización y secretos, histórico y observabilidad.

## 2. CORE-1 · Extracción (cerrada en main)

| ID | Tarea | Estado |
|---|---|---|
| EX-1 | Copiar los 7 módulos Core sin modificar | ✅ |
| EX-2 | Separar el materializer en Core + hook de host Restaurant | ✅ paridad 0 diferencias |
| EX-3 | Tests A–E + Hardening A/B, independencia, paridad y seguridad del materializer | ✅ 86/86 en CI Linux Node 20/22, 0 omitidos (run 36103571133); Windows local: 84 pasan y 2 symlink tests se omiten por EPERM |
| EX-4 | CI propio (`core-ci.yml`, Node 20 y 22) | ✅ run 36103571133 en `44b1f5c`: ambos jobs (Node 20.20.2 y 22.23.2), syntax, docs, 86 tests y CLI smoke verdes |
| EX-5 | Contratos canónicos copiados con estados reconciliados | ✅ `docs/upstream/` |
| EX-6 | README, arquitectura, contrato de host, decisiones, procedencia, handoff | ✅ |
| EX-8 | Materializer: path traversal, enlaces dentro de `outputDir` y nombres con puntos (D-11/D-11b) | ✅ regresiones y CI verde; paridad 0 diferencias, golden sin cambios |
| EX-7 | Auditoría documental: índice de autoridad (`docs/README.md`), `check:docs`, OpenSEO documentado | ✅ |

## 3. Siguiente trabajo del Core (en orden)

| ID | Tarea | Criterio de cierre |
|---|---|---|
| **CORE-1** | **Extracción independiente del Core** ([PR #1](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/1)) | ✅ Cerrada: merge a `main` `995207f38080cf319d4246a531895c85bc10759e`; CI Node 20/22 verde (86/86) |
| CORE-2 | Sacar el bootstrap navegador de `core.js` y llevar la carga al host | ⛔ Fuera de alcance: su criterio requiere migrar y validar un host externo. No se accede ni modifica otro repositorio. No iniciado (D-12) |
| **CORE-3** | **Inyección explícita y validación de contratos Core-only** | ✅ Cerrada en [PR #3](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/3), merge `b38225320f4b3dde3f2820f2935603adea33c8dc`; D-12…D-15. CI Node 20/22 verde: 113/113, 0 omitidos (run 36106021399). `entityGraph().products` mantiene una dependencia residual de `config.dishes`, anotada para trabajo posterior |
| CORE-4 | Adopción del Core por un host externo | ⛔ Fuera de alcance mientras el trabajo se limite a este repositorio |
| CORE-5 | Validación externa del adapter `real-estate` con Sarah Katerina | Estado real del host → golden y HTML materializado revisados. Ni datos inventados ni NAP sin confirmar |
| CORE-6 | Deuda multidioma (TECH DEBT · MULTILINGUAL SEO) | Solo con decisión canónica: locales, hreflang y canonical por idioma |
| CORE-7 | Conexiones server-side de Release E y Release C | Depende de la Platform Layer del host (auth, secretos, backend). Siempre con provenance real |
| CORE-7.1 | **Integración OpenSEO (Release C · Intelligence) mediante un puente de proveedor server-side** que actúa como cliente MCP. Diseño en [`integrations/OPENSEO.md`](integrations/OPENSEO.md) | 📝 documentado · ⛔ **bloqueado** por CORE-2 (fuera de alcance) y la Platform Layer. La conectividad `/api/health` está implementada y fusionada en CORE-3 (D-14); faltan el contrato MCP validado con mocks, el puente en el backend del host y revisión humana. No es una Release nueva: completa la fuente real que le falta a Release C |

**Evaluación del ecosistema:** referencias y decisiones en [`ECOSYSTEM-REFERENCES.md`](ECOSYSTEM-REFERENCES.md). No añade dependencias ni altera el alcance del Core.\n\n## 4. Bloqueos y riesgos abiertos

| Bloqueo | Afecta a | Salida |
|---|---|---|
| CORE-1 | Cerrado en `main@995207f`; sin deploy | Ninguno |
| CORE-3 | Cerrado en `main@b382253`; D-12…D-15, CI Node 20/22 verde | Ninguno |
| Microcopy OpenSEO | Mensaje de éxito de conectividad puede dar a entender que la autorización MCP ya está verificada | Corregir en una fase posterior según D-16; el estado devuelto sigue siendo `NOT_CONNECTED` / `NOT_VERIFIED` |
| CORE-2/CORE-4 | Requieren migración o adopción en un host externo | Fuera de alcance: este proyecto solo trabaja en RUBIK-SEO-GEO-CORE |
| Sin Platform Layer (backend, auth, secretos) en ningún host | CORE-7, CORE-7.1 | Fase Platform Layer del host |
| `crawl()` de `OpenSEOAdapter` sigue con el contrato HTTP heredado (no existe la acción `crawl` en OpenSEO). La conectividad ya usa `/api/health` y nunca devuelve `CONNECTED` (D-14, en revisión en PR #3) | CORE-7.1 | Puente MCP server-side con Platform Layer; `DECISIONS.md` D-09 |

## 5. Reglas de continuidad

- No crear un segundo Core, Studio, Project State, Media Library ni Page Registry.
- Cualquier cambio de salida para Restaurant debe actualizar el golden (`scripts/generate-source-golden.cjs`) **con** una decisión en `DECISIONS.md`.
- Todo cambio de código y documentación se hace únicamente en RUBIK-SEO-GEO-CORE. Cada fase sigue branch → PR → CI → revisión humana → merge. No modificar repositorios externos; hacer lecturas puntuales solo con autorización expresa. No acceder nunca a WEB-RESTAURACI-N-PREMIUM-DIN-MICA. Sin despliegues.
- No declarar un proveedor externo como conectado sin fuente real verificable.
