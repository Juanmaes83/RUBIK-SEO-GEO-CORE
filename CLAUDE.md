# Instrucciones de Claude Code para este repositorio

## Fuente de estado y alcance

- Repositorio de contratos Core: RUBIK-SEO-GEO-CORE. La aplicación CORE-9 tiene como único destino designado Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO, según D-26. No acceder ni modificar otros repositorios; está prohibido acceder a WEB-RESTAURACI-N-PREMIUM-DIN-MICA.
- Antes de trabajar o reanudar, leer [docs/README.md](docs/README.md), [docs/ROADMAP.md](docs/ROADMAP.md) y [docs/AUTONOMOUS-CONTINUATION.md](docs/AUTONOMOUS-CONTINUATION.md), además del final de [docs/HANDOFF.md](docs/HANDOFF.md).
- ROADMAP es la fuente de estado; HANDOFF conserva el checkpoint. No declarar completada una fase por tener código o pruebas locales.
- CORE-8, CORE-8.1 y la preparación de CORE-9 ya están fusionadas. Las decisiones iniciales del propietario y el plan de implementación están en docs/core-9/EXECUTION-PLAN.md y D-26. La plataforma aún no está construida.

## Trabajo autónomo con Loop

- Continuar de forma autónoma criterio por criterio mientras haya trabajo seguro y definido; al terminar un criterio, registrar el resultado y pasar al siguiente sin pedir confirmación por decisiones rutinarias.
- Si se agotan los créditos o hay que pausar, guardar un checkpoint reanudable: commit pequeño si el bloque está coherente, y actualizar HANDOFF con fecha, rama/PR, HEAD, cambios, comandos y resultados exactos, CI, tareas pendientes y el siguiente paso concreto.
- Al reanudar, comprobar primero estado, rama, HEAD remoto, PR y CI. No rehacer trabajo ya completado.
- Para cambios nuevos, usar rama y PR revisable; las ramas apiladas #12–#14 ya fueron fusionadas. No abrir otra rama hasta definir un alcance autorizado.

## Estado y gates

- **CORE-8:** cerrada en PR #12.
- **CORE-8.1:** cerrada en PR #13.
- **CORE-9 preparación:** cerrada en PR #14. Las decisiones de inicio y la ejecución están registradas en docs/core-9/EXECUTION-PLAN.md y D-26; la aplicación aún no está construida.
- No repetir fases cerradas. No crear ni modificar repos distintos del Core y el destino designado PLATAFORMA-RUBIK-SEO-GEO. Servicios reales y credenciales requieren autorización humana específica.
- Las decisiones técnicas reversibles del scaffold se documentan en ADR y se resuelven con criterio; los gates humanos de EXECUTION-PLAN §5 detienen credenciales, datos reales, gastos, acciones externas y producción.

## No hacer

- Nunca fusionar PRs, habilitar auto-merge, desplegar, publicar/enviar contenido, contactar terceros o gastar dinero/créditos de proveedores.
- No usar secretos, llamadas reales de red, cuentas de clientes ni datos inventados. No afirmar CI verde sin run completado.
- No tocar ni consultar repositorios ajenos, ni siquiera como referencia, salvo autorización nueva, concreta y expresa.
- No convertir el Core en plugin vertical ni duplicar Studio, Project State, Media Library o Page Registry del host.


## Retención de ramas

- El propietario ha indicado que las ramas remotas se conservan por ahora. No borrar ni limpiar ninguna referencia de rama, aunque su PR esté fusionado, hasta recibir una nueva instrucción explícita.
- Consultar el inventario fechado de ROADMAP §7; es una fotografía, no una lista garantizada de refs actuales. No cambiar bases ni usar una rama antigua para nuevo trabajo sin comprobar primero su relación con main.


## CORE-9: asignación de trabajo

- Leer docs/core-9/EXECUTION-PLAN.md y docs/core-9/PLATFORM-SPEC.md antes de actuar.
- La implementación de la aplicación va únicamente en Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO mediante prompt de tarea específico; el trabajo Core-only va en este repo.
- Claude implementa y documenta por fases/PRs, sin secretos, llamadas live, gasto, merge ni despliegue. El propietario gestiona consolas, credenciales, permisos, legal, revisión visual y autorizaciones. Codex revisa documentación, PR/CI, seguridad y contratos, y solo mergea con instrucción expresa.
- Vercel Hobby no debe asumirse compatible con uso comercial; no publicar/comercializar antes de verificar términos actuales y elegir plan adecuado.
