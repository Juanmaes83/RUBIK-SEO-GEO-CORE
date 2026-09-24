# Roadmap operativo — Rubik SEO/GEO Core

**Única fuente de estado del Core.** Última verificación: 24/09/2026, contra GitHub y el repositorio fuente `Juanmaes83/WEB-RESTAURACI-N-PREMIUM-DIN-MICA` en `main@388e48a`.

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

## 2. Extracción (esta rama)

| ID | Tarea | Estado |
|---|---|---|
| EX-1 | Copiar los 7 módulos Core sin modificar | ✅ |
| EX-2 | Separar el materializer en Core + hook de host Restaurant | ✅ paridad 0 diferencias |
| EX-3 | Tests A–E + Hardening A/B ejecutables sin el repo de Restaurantes | ✅ 73/73 (Node 20 y 24) |
| EX-4 | CI propio (`core-ci.yml`, Node 20 y 22) | ✅ escrito · ⏳ primera ejecución en GitHub al abrir el PR |
| EX-5 | Contratos canónicos copiados con estados reconciliados | ✅ `docs/upstream/` |
| EX-6 | README, arquitectura, contrato de host, decisiones, procedencia, handoff | ✅ |

## 3. Siguiente trabajo del Core (en orden)

| ID | Tarea | Criterio de cierre |
|---|---|---|
| **CORE-1** | **Revisar y fusionar esta extracción** (PR desde `feat/seo-geo-core-extraction`) | CI verde en GitHub, revisión humana, merge a `main` |
| CORE-2 | Sacar el bootstrap navegador de `core.js` (`RestaurantDefaults`, inyección de `release-d-studio.js`) y llevarlo a un loader del host | Core sin referencias a ficheros o globales del host, y Restaurantes sigue funcionando con su loader. Requiere un PR coordinado en el repo fuente |
| CORE-3 | Inyectar dependencias explícitas: `intelligence.pages(config,{releaseB})` y `release-e` con vertical derivado del adapter activo | Mismo golden para Restaurant; nuevos tests para los verticales no Restaurant |
| CORE-4 | Consumo del Core por Restaurantes Premium desde este repositorio (paquete git, submódulo o vendor con hash) | El fuente deja de tener copia propia y sus tests E2E siguen verdes |
| CORE-5 | Validación externa del adapter `real-estate` con Sarah Katerina | Estado real del host → golden y HTML materializado revisados. Ni datos inventados ni NAP sin confirmar |
| CORE-6 | Deuda multidioma (TECH DEBT · MULTILINGUAL SEO) | Solo con decisión canónica: locales, hreflang y canonical por idioma |
| CORE-7 | Conexiones server-side de Release E y Release C | Depende de la Platform Layer del host (auth, secretos, backend). Siempre con provenance real |

## 4. Reglas de continuidad

- No crear un segundo Core, Studio, Project State, Media Library ni Page Registry.
- Cualquier cambio de salida para Restaurant debe actualizar el golden (`scripts/generate-source-golden.cjs`) **con** una decisión en `DECISIONS.md`.
- Cada bloque sigue el mismo flujo: branch → PR → CI → revisión humana → merge. Sin despliegues desde este repositorio.
- No declarar un proveedor externo como conectado sin fuente real verificable.
