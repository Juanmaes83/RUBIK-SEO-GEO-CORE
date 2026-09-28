# Instrucciones de Claude Code para este repositorio

## Fuente de estado y alcance

- Proyecto único: RUBIK-SEO-GEO-CORE. No leer, clonar ni modificar otros repositorios; está prohibido acceder a WEB-RESTAURACI-N-PREMIUM-DIN-MICA.
- Antes de trabajar o reanudar, leer [docs/README.md](docs/README.md), [docs/ROADMAP.md](docs/ROADMAP.md) y [docs/AUTONOMOUS-CONTINUATION.md](docs/AUTONOMOUS-CONTINUATION.md), además del final de [docs/HANDOFF.md](docs/HANDOFF.md).
- ROADMAP es la fuente de estado; HANDOFF conserva el checkpoint. No declarar completada una fase por tener código o pruebas locales.
- CORE-8, CORE-8.1 y la preparación de CORE-9 ya están fusionadas; el siguiente trabajo de plataforma está bloqueado por las decisiones de docs/core-9/PLATFORM-SPEC.md §10.

## Trabajo autónomo con Loop

- Continuar de forma autónoma criterio por criterio mientras haya trabajo seguro y definido; al terminar un criterio, registrar el resultado y pasar al siguiente sin pedir confirmación por decisiones rutinarias.
- Si se agotan los créditos o hay que pausar, guardar un checkpoint reanudable: commit pequeño si el bloque está coherente, y actualizar HANDOFF con fecha, rama/PR, HEAD, cambios, comandos y resultados exactos, CI, tareas pendientes y el siguiente paso concreto.
- Al reanudar, comprobar primero estado, rama, HEAD remoto, PR y CI. No rehacer trabajo ya completado.
- Para cambios nuevos, usar rama y PR revisable; las ramas apiladas #12–#14 ya fueron fusionadas. No abrir otra rama hasta definir un alcance autorizado.

## Estado y gates

- **CORE-8:** cerrada en PR #12.
- **CORE-8.1:** cerrada en PR #13.
- **CORE-9 preparación:** cerrada en PR #14. La implementación real sigue bloqueada por las decisiones de PLATFORM-SPEC §10.
- No repetir fases cerradas. No crear o modificar otro repositorio, usar servicios reales ni habilitar credenciales hasta autorización explícita del propietario.
- Las decisiones rutinarias dentro del alcance autorizado se resuelven con criterio; si falta alguna decisión bloqueante de §10, documentarla y no fingir que el sistema está integrado.

## No hacer

- Nunca fusionar PRs, habilitar auto-merge, desplegar, publicar/enviar contenido, contactar terceros o gastar dinero/créditos de proveedores.
- No usar secretos, llamadas reales de red, cuentas de clientes ni datos inventados. No afirmar CI verde sin run completado.
- No tocar ni consultar repositorios ajenos, ni siquiera como referencia, salvo autorización nueva, concreta y expresa.
- No convertir el Core en plugin vertical ni duplicar Studio, Project State, Media Library o Page Registry del host.
