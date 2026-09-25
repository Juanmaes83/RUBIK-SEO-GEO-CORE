# Roadmap operativo — Rubik SEO/GEO Core

**Única fuente de estado del Core.** Última verificación: 25/09/2026, contra `main@995207f` de este repositorio. El alcance operativo se limita a RUBIK-SEO-GEO-CORE; no se accede ni modifica ningún otro repositorio.

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
| **CORE-3** | **Siguiente fase Core-only:** inyectar `releaseB` en `intelligence.pages`, derivar Release E del adapter activo, corregir health de OpenSEO según D-09 y validar rutas en Page Registry según D-11 | 🔄 **Implementado, en revisión** en [PR #3](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/3) (D-12…D-15): tests con 6 adapters no Restaurant + Restaurant ✅, mocks locales sin red ✅, rutas válidas e inválidas ✅, golden sin cambios ✅; `npm run verify` 113 (111 pasan, 2 se omiten en Windows). Falta: CI del PR, revisión humana y merge |
| CORE-4 | Adopción del Core por un host externo | ⛔ Fuera de alcance mientras el trabajo se limite a este repositorio |
| CORE-5 | Validación externa del adapter `real-estate` con Sarah Katerina | Estado real del host → golden y HTML materializado revisados. Ni datos inventados ni NAP sin confirmar |
| CORE-6 | Deuda multidioma (TECH DEBT · MULTILINGUAL SEO) | Solo con decisión canónica: locales, hreflang y canonical por idioma |
| CORE-7 | Conexiones server-side de Release E y Release C | Depende de la Platform Layer del host (auth, secretos, backend). Siempre con provenance real |
| CORE-7.1 | **Integración OpenSEO (Release C · Intelligence) mediante un puente de proveedor server-side** que actúa como cliente MCP. Diseño en [`integrations/OPENSEO.md`](integrations/OPENSEO.md) | 📝 documentado · ⛔ **bloqueado** por CORE-2 (fuera de alcance), CORE-3 (en revisión) y la Platform Layer. Orden de cierre: (a) interfaz de proveedor definida; (b) contrato validado con mocks de respuestas MCP reales (sin red ni consultas de pago); (c) health `/api/health` en lugar de `GET` raíz, **hecho en CORE-3 (D-14)**, pendiente de merge; (d) puente en el backend del host; (e) revisión humana. No es una Release nueva: completa la fuente real que le falta a Release C |

## 4. Bloqueos y riesgos abiertos

| Bloqueo | Afecta a | Salida |
|---|---|---|
| CORE-1 | Cerrado en `main@995207f`; sin deploy | Ninguno |
| CORE-3 en revisión (PR #3) | CORE-3 → CORE-7.1 | Revisión humana y merge por el propietario |
| CORE-2/CORE-4 | Requieren migración o adopción en un host externo | Fuera de alcance: este proyecto solo trabaja en RUBIK-SEO-GEO-CORE |
| Sin Platform Layer (backend, auth, secretos) en ningún host | CORE-7, CORE-7.1 | Fase Platform Layer del host |
| `crawl()` de `OpenSEOAdapter` sigue con el contrato HTTP heredado (no existe la acción `crawl` en OpenSEO). La conectividad ya usa `/api/health` y nunca devuelve `CONNECTED` (D-14, en revisión en PR #3) | CORE-7.1 | Puente MCP server-side con Platform Layer; `DECISIONS.md` D-09 |

## 5. Reglas de continuidad

- No crear un segundo Core, Studio, Project State, Media Library ni Page Registry.
- Cualquier cambio de salida para Restaurant debe actualizar el golden (`scripts/generate-source-golden.cjs`) **con** una decisión en `DECISIONS.md`.
- Todo cambio se hace únicamente en RUBIK-SEO-GEO-CORE. Cada fase sigue branch → PR → CI → revisión humana → merge. Sin acceso a otros repositorios y sin despliegues.
- No declarar un proveedor externo como conectado sin fuente real verificable.
