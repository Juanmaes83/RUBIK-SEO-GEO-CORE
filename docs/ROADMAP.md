# Roadmap operativo — Rubik SEO/GEO Core

**Única fuente de estado del Core.** Estado actualizado el 25/09/2026 tras el cierre de CORE-7.1: merge `main@bc271fe` (PR #11); CI del HEAD del PR verde en Node 20/22, run `36126029028`. Todo cambio de código y documentación se hace solo en RUBIK-SEO-GEO-CORE. No se modifica ningún repositorio externo ni se accede a WEB-RESTAURACI-N-PREMIUM-DIN-MICA. Las lecturas externas requieren autorización expresa y concreta.

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
| **CORE-3.1** | **Desacoplar `entityGraph().products` de `config.dishes`** mediante el contrato de datos por adapter ya existente | ✅ Cerrada en [PR #6](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/6), merge `0be47522148e7fb33b6e0a6177cd8a219e011dc5`; D-17. CI Node 20/22 verde: 129/129, 0 omitidos ([run 36108440350](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36108440350)) |
| **CORE-3.2** | **Neutralizar acoplamientos verticales restantes de Intelligence:** `geoReadiness()` y `entityGraph().business/location` desde `source(config)` del adapter activo | ✅ Cerrada en [PR #7](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/7), merge `3ad7b130c52538c3f48fcee1da70c9909ed292f4`; D-18. CI Node 20/22 verde: 153/153, 0 omitidos (run 36111618492). Sin cambios en adapters, Publisher, materializer ni golden |
| CORE-4 | Adopción del Core por un host externo | ⛔ Fuera de alcance mientras el trabajo se limite a este repositorio |
| CORE-5 | Validación externa del adapter `real-estate` con Sarah Katerina | Estado real del host → golden y HTML materializado revisados. Ni datos inventados ni NAP sin confirmar |
| **CORE-6** | **SEO multidioma:** traducciones reales, metadata por locale, Page Registry localizado, hreflang y canonical AUTO/CUSTOM por idioma | ✅ Cerrada en [PR #9](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/9), merge `304f6555416210ff562343dea20a4a22db252a67`; D-19. CI verde en Node 20.20.2 y 22.23.2: 174/174 pruebas en cada versión, 0 omitidas; syntax/docs y ambos smoke checks CLI (run [36115604817](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36115604817)). La configuración solo `es` permanece byte-identical; golden sin cambios. Deuda registrada: límites BCP 47, entidad/adapters, blog/AUTO y discrepancia heredada sitemap/canonical de home |
| **CORE-7** | **Preparar contratos de integración para Release E y Release C** | ✅ Cerrada en [PR #10](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/10), merge `6ef8c4e56da1ea9e28649c8160f815ef6c9895c2`; D-21. Contratos neutrales C/E, protección de secretos, presupuesto finito obligatorio para cuota/pago (`BUDGET_REQUIRED`) y normalización de backlinks. CI Node 20.20.2/22.23.2: 205/205 por versión, 0 omitidas; syntax, documentación y CLI smoke verdes (run [36121912236](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36121912236)). `npm run verify` local: 205 (203 pasan, 2 omitidas por symlinks en Windows). Golden y paridad sin cambios. Solo mocks; sin proveedor real ni deploy |
| **CORE-7.1** | **Preparación del puente OpenSEO/MCP** ([`integrations/OPENSEO.md`](integrations/OPENSEO.md)) | ✅ Cerrada en [PR #11](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/11), merge `bc271fe5632cdf34b98ad0e218341cdcc8e5c81e`; D-22. Contrato Core-only para las cinco herramientas MCP documentadas, validado con mocks; respuestas limitadas a `structuredContent`, auditorías manuales y Lighthouse desactivado. `whoamiAuthenticated` debe confirmar explícitamente autorización y las negativas (`authenticated:false`, `authorized:false`, `error`/`errors` no vacíos) prevalecen. CI Node 20.20.2/22.23.2: 233/233 por versión, 0 omitidas; sintaxis, docs y smoke CLI verdes (run [36126029028](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36126029028)). `npm run verify` local: 233 pruebas (231 pasan, 2 se omiten por symlinks en Windows). Sin conexión real ni deploy; autenticación MCP, backend, secretos y persistencia siguen en CORE-9. `crawl()` heredado también queda pendiente para la integración real |
| **CORE-8** | **SEO off-page & Authority** | Definir contratos neutrales y análisis auditable para backlinks, menciones/citas y presencia local, usando datos aportados/importados con fuente y fecha. Sin storage propio, conexiones reales, creación automatizada de enlaces ni promesas de ranking; conectores reales se activan en CORE-9 |
| **CORE-9** | **Platform Layer multi-proyecto (fase final)** | Plano de control para proyectos Rubik, auth/roles, backend, secretos, trabajos programados, conectores e historial/audit log. Activar aquí las integraciones reales de CORE-7/7.1/8. El Project State, Studio, Media Library y Page Registry canónicos siguen en cada host; implementación de la plataforma en un proyecto separado cuando se autorice |

**Secuencia aprobada:** CORE-6 → CORE-7 (contratos/mocks, cerrado) → CORE-7.1 (preparación OpenSEO/MCP con mocks) → CORE-8 (SEO off-page Core-only) → CORE-9 (Platform Layer final y activación de servicios reales). CORE-2/4/5 siguen dependiendo de un host; esta secuencia no los inicia ni los valida.


**Evaluación del ecosistema:** referencias y decisiones en [`ECOSYSTEM-REFERENCES.md`](ECOSYSTEM-REFERENCES.md). No añade dependencias ni altera el alcance del Core.

## 4. Bloqueos y riesgos abiertos

| Bloqueo | Afecta a | Salida |
|---|---|---|
| CORE-1 | Cerrado en `main@995207f`; sin deploy | Ninguno |
| CORE-3 | Cerrado en `main@b382253`; D-12…D-15, CI Node 20/22 verde | Ninguno |
| CORE-3.1 | Cerrado en `main@0be4752`; D-17, CI Node 20/22 verde | Ninguno |
| CORE-3.2 | Cerrado en `main@3ad7b13`; D-18, CI Node 20/22 verde (153/153) | Ninguno |
| Límites conocidos de CORE-6 (D-19) | Scripts BCP 47, entidad/adapters, artículos y fórmulas AUTO no localizados; discrepancia heredada entre canonical de home y sitemap | No bloquean CORE-7; reconsiderar si esos alcances se priorizan |
| Microcopy OpenSEO | Mensaje de éxito de conectividad puede dar a entender que la autorización MCP ya está verificada | Corregir en una fase posterior según D-16; el estado devuelto sigue siendo `NOT_CONNECTED` / `NOT_VERIFIED` |
| CORE-2/CORE-4 | Requieren migración o adopción en un host externo | Fuera de alcance: este proyecto solo trabaja en RUBIK-SEO-GEO-CORE |
| Platform Layer todavía no construida | Integraciones reales de CORE-7/7.1 y conectores en CORE-8 | CORE-9, definida como fase final; hasta entonces solo contratos/mocks y datos manuales/importados con provenance |
| `crawl()` de `OpenSEOAdapter` sigue con el contrato HTTP heredado (no existe la acción `crawl` en OpenSEO). La conectividad base usa `/api/health` (D-14); el puente Core-only de CORE-7.1 se cierra con D-22 | CORE-9 | Conexión MCP autenticada server-side y adaptación real de `crawl()` durante CORE-9; `DECISIONS.md` D-09 |

## 5. Reglas de continuidad

- No crear un segundo Core, Studio, Project State, Media Library ni Page Registry.
- Cualquier cambio de salida para Restaurant debe actualizar el golden (`scripts/generate-source-golden.cjs`) **con** una decisión en `DECISIONS.md`.
- Todo cambio de código y documentación se hace únicamente en RUBIK-SEO-GEO-CORE. Cada fase sigue branch → PR → CI → revisión humana → merge. No modificar repositorios externos; hacer lecturas puntuales solo con autorización expresa. No acceder nunca a WEB-RESTAURACI-N-PREMIUM-DIN-MICA. Sin despliegues.
- No declarar un proveedor externo como conectado sin fuente real verificable.
