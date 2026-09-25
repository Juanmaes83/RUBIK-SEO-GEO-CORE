# Instrucciones de Claude Code para este repositorio

## Fuente de estado y alcance

- Proyecto único: RUBIK-SEO-GEO-CORE. No leer, clonar ni modificar otros repositorios; está prohibido acceder a WEB-RESTAURACI-N-PREMIUM-DIN-MICA.
- Antes de trabajar o reanudar, leer [docs/README.md](docs/README.md), [docs/ROADMAP.md](docs/ROADMAP.md) y [docs/AUTONOMOUS-CONTINUATION.md](docs/AUTONOMOUS-CONTINUATION.md), además del final de [docs/HANDOFF.md](docs/HANDOFF.md).
- ROADMAP es la fuente de estado; HANDOFF conserva el checkpoint. No declarar completada una fase por tener código o pruebas locales.
- Para CORE-8 → CORE-8.1 → preparación de CORE-9, seguir literalmente la secuencia, hallazgos, gates y límites de `docs/AUTONOMOUS-CONTINUATION.md`.

## Trabajo autónomo con Loop

- Continuar de forma autónoma criterio por criterio mientras haya trabajo seguro y definido; al terminar un criterio, registrar el resultado y pasar al siguiente sin pedir confirmación por decisiones rutinarias.
- Si se agotan los créditos o hay que pausar, guardar un checkpoint reanudable: commit pequeño si el bloque está coherente, y actualizar HANDOFF con fecha, rama/PR, HEAD, cambios, comandos y resultados exactos, CI, tareas pendientes y el siguiente paso concreto.
- Al reanudar, comprobar primero estado, rama, HEAD remoto, PR y CI. No rehacer trabajo ya completado.
- Trabajar con ramas y PRs separados/apilados: corregir primero PR #12 (CORE-8); después CORE-8.1 en una rama dependiente; luego CORE-9 en una rama independiente dependiente. Indicar claramente el base/PR padre y actualizar la documentación de continuidad.

## Gates de fase

1. **CORE-8:** resolver los seis hallazgos pendientes en la guía; añadir regresiones; ejecutar `npm run verify`; obtener CI Node 20/22 verde y dejar PR #12 abierto para revisión.
2. **CORE-8.1:** implementar solo después de pasar el gate técnico de CORE-8. Alcance de D-24 y OFFPAGE-SERVICE §6; borradores y contratos con evidencia, sin publicación/envío ni servicios reales.
3. **CORE-9:** avanzar en este repositorio con especificación, límites de datos, arquitectura, threat model, interfaces, contratos y mocks. Detener aplicación externa, backend real, autenticación/secrets, storage conectado, proveedores/modelos live y deploy hasta tener autorización y destino.

## No hacer

- Nunca fusionar PRs, habilitar auto-merge, desplegar, publicar/enviar contenido, contactar terceros o gastar dinero/créditos de proveedores.
- No usar secretos, llamadas reales de red, cuentas de clientes ni datos inventados. No afirmar CI verde sin run completado.
- No tocar ni consultar repositorios ajenos, ni siquiera como referencia, salvo autorización nueva, concreta y expresa.
- No convertir el Core en plugin vertical ni duplicar Studio, Project State, Media Library o Page Registry del host.
