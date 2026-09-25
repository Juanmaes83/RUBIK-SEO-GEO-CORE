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
| EX-3 | Tests A–E + Hardening A/B ejecutables sin el repo de Restaurantes | ✅ 86 en local (84 pasan y 2 se omiten en Windows), incluidas las pruebas de seguridad D-11; 73/73 en CI hasta `007bb2e` |
| EX-4 | CI propio (`core-ci.yml`, Node 20 y 22) | ✅ verde en GitHub: `8486054` ([run 36101061645](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36101061645)) y `007bb2e` ([run 36101151706](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36101151706)), en Node 20.20.2 y 22.23.2, 73/73, docs y smoke del CLI. La CI del commit D-11 se verifica en el PR |
| EX-5 | Contratos canónicos copiados con estados reconciliados | ✅ `docs/upstream/` |
| EX-6 | README, arquitectura, contrato de host, decisiones, procedencia, handoff | ✅ |
| EX-8 | Materializer: path traversal y enlaces dentro de `outputDir` (D-11, D-11b) + regresiones | ✅ en local (paridad 0 diferencias, golden sin cambios) · CI en el PR |
| EX-7 | Auditoría documental: índice de autoridad (`docs/README.md`), `check:docs`, OpenSEO documentado | ✅ |

## 3. Siguiente trabajo del Core (en orden)

| ID | Tarea | Criterio de cierre |
|---|---|---|
| **CORE-1** | **Revisar y fusionar esta extracción** ([PR #1](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/1) desde `feat/seo-geo-core-extraction`) | ✅ PR abierto · ✅ CI verde · ⏳ revisión humana · ⏳ merge a `main` (por el propietario) |
| CORE-2 | Sacar el bootstrap navegador de `core.js` (`RestaurantDefaults`, inyección de `release-d-studio.js`) y llevarlo a un loader del host | Core sin referencias a ficheros o globales del host, y Restaurantes sigue funcionando con su loader. Requiere un PR coordinado en el repo fuente |
| CORE-3 | Inyectar dependencias explícitas: `intelligence.pages(config,{releaseB})` y `release-e` con vertical derivado del adapter activo | Mismo golden para Restaurant; nuevos tests para los verticales no Restaurant |
| CORE-4 | Consumo del Core por Restaurantes Premium desde este repositorio (paquete git, submódulo o vendor con hash) | El fuente deja de tener copia propia y sus tests E2E siguen verdes |
| CORE-5 | Validación externa del adapter `real-estate` con Sarah Katerina | Estado real del host → golden y HTML materializado revisados. Ni datos inventados ni NAP sin confirmar |
| CORE-6 | Deuda multidioma (TECH DEBT · MULTILINGUAL SEO) | Solo con decisión canónica: locales, hreflang y canonical por idioma |
| CORE-7 | Conexiones server-side de Release E y Release C | Depende de la Platform Layer del host (auth, secretos, backend). Siempre con provenance real |
| CORE-7.1 | **Integración OpenSEO (Release C · Intelligence) mediante un puente de proveedor server-side** que actúa como cliente MCP. Diseño en [`integrations/OPENSEO.md`](integrations/OPENSEO.md) | 📝 documentado · ⛔ **bloqueado** por CORE-2 y CORE-3 (interfaz de proveedor inyectable) y por la Platform Layer. Orden de cierre: (a) interfaz de proveedor definida, (b) contrato validado con mocks de respuestas MCP reales (sin red ni consultas de pago), (c) health `/api/health` en lugar de `GET` raíz, (d) puente en el backend del host, (e) revisión humana. No es una Release nueva: completa la fuente real que le falta a Release C |

## 4. Bloqueos y riesgos abiertos

| Bloqueo | Afecta a | Salida |
|---|---|---|
| El repo fuente (`scripts/seo-geo-materialize-public.cjs@388e48a`) tiene el mismo path traversal (D-11) | Host Restaurant | Aviso al propietario; corrección en el fuente o adopción del Core (CORE-4). No se modifica el fuente desde aquí |
| PR #1 pendiente de revisión humana y merge | CORE-1 → CORE-2… | Decisión del propietario |
| Bootstrap navegador de `core.js` acoplado al host | CORE-2, CORE-4 | PR coordinado con Restaurantes Premium |
| Sin Platform Layer (backend, auth, secretos) en ningún host | CORE-7, CORE-7.1 | Fase Platform Layer del host |
| El contrato `OpenSEOAdapter` no coincide con el OpenSEO real (falso `CONNECTED` en `GET` raíz, no existe acción `crawl`) | CORE-7.1 | CORE-3 + mocks; `DECISIONS.md` D-09. No se toca el código hasta entonces |

## 5. Reglas de continuidad

- No crear un segundo Core, Studio, Project State, Media Library ni Page Registry.
- Cualquier cambio de salida para Restaurant debe actualizar el golden (`scripts/generate-source-golden.cjs`) **con** una decisión en `DECISIONS.md`.
- Cada bloque sigue el mismo flujo: branch → PR → CI → revisión humana → merge. Sin despliegues desde este repositorio.
- No declarar un proveedor externo como conectado sin fuente real verificable.
