# Continuidad autónoma: CORE-8 → CORE-8.1 → CORE-9

**Repositorio único:** `Juanmaes83/RUBIK-SEO-GEO-CORE`. **Fecha del punto de partida:** 25/09/2026. Esta guía acompaña al estado autoritativo de [ROADMAP.md](ROADMAP.md); si cambia el HEAD o la CI, actualiza primero ROADMAP y HANDOFF con evidencia.

## Punto exacto de reanudación

- PR #12: [CORE-8 off-page & Authority](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/12), rama `feat/core-8-offpage-authority`, HEAD inicial auditado `42d213da5d728bee3296a34b0266f52e82a3368a`.
- Estado al preparar este plan: abierto, CI run `36129957035` verde (Node 20/22, 262/262 por job, sin omitidas); no fusionado ni desplegado.
- La auditoría encontró las seis tareas obligatorias siguientes. El verde actual no las resuelve: las pruebas nuevas deben fallar contra el comportamiento anterior y pasar con la corrección.

## Etapa 1 — terminar CORE-8

Trabajar primero en la rama/PR #12, sin ampliar su alcance:

1. **Provenance confiable.** Impedir que un objeto arbitrario con `method:'api'` y `connection:'VERIFIED'` obtenga estado verificado en `measurement()` o `geoRun()`. La confianza debe venir de una frontera inyectada/confiable y compatible con CORE-7; entradas manuales/importadas/mocks siguen no verificadas.
2. **Cobertura GEO por grupo.** Calcular consultas, runs válidos, respuestas utilizables y cobertura usando la intersección exacta de `locale + market` (y demás dimensiones pertinentes) de cada grupo. ERROR/NO_ANSWER no deben inflar el mínimo de respuestas utilizables. Añadir fixtures con varios idiomas/mercados.
3. **Cambio de modelo/superficie.** Si cambia el modelo, motor, superficie o método de observación que haga incomparables las series, devolver `NOT_COMPARABLE` con motivo. No reportar `UP`/`DOWN` entre series distintas.
4. **Conflictos temporales.** Distinguir valores incompatibles para una misma medición comparable de valores que evolucionan entre periodos, proveedores o métodos. No bloquear como contradictorias las tendencias temporales. Documentar las reglas de comparabilidad y probar ambos casos.
5. **Minimización completa.** Revisar todo el objeto de evidencia enviado al transporte IA, incluidos `id`, `subject`, `field`, `provider`, referencias y metadatos. Redactar o rechazar PII/secretos y URLs con datos sensibles. Probar correo/teléfono/secreto en cada campo; comprobar que nada sensible llega al mock.
6. **Honestidad semántica de IA.** El validador no puede demostrar entailment solo comparando cifras/URLs. No presentar `VALID/accepted` como hecho verificado. Mantenerlo como borrador/candidato no canónico y siempre revisable; exigir evidencia pertinente/comparable en contratos cuando sea posible, marcar hipótesis y límites, y documentar explícitamente que una persona valida la correspondencia semántica antes de usar el contenido. Añadir pruebas para una afirmación que cite evidencia real pero no se desprenda de ella.

**Salida requerida de etapa:** código y regresiones; actualización de D-23, OFFPAGE-SERVICE, ROADMAP, HANDOFF y README solo con resultados medidos; `npm run verify`; CI Node 20/22 verde; revisión del diff. Mantener PR #12 abierto y no fusionarlo. Registrar cualquier hallazgo nuevo antes de considerarlo resuelto.

## Etapa 2 — CORE-8.1

Después de completar los gates de CORE-8, crear rama y PR independientes basados en el HEAD corregido de CORE-8 (PR apilado, con dependencia claramente indicada). La especificación aprobada está en [OFFPAGE-SERVICE.md §6](integrations/OFFPAGE-SERVICE.md#6-core-81--operación-off-page-continua-asistida-por-ia) y D-24.

Implementar capacidades Core-only para:
- continuidad entre periodos: campañas, acciones, bloqueos, aprendizajes y seguimiento, con datos pasados/actuales y siguiente paso explícito;
- conjuntos de consultas GEO versionados y mediciones repetidas con comparación honesta por motor, superficie, modelo, idioma y mercado;
- preparar como borradores artículos/guías desde información del cliente aprobada y adaptaciones por canal (redes, newsletter, perfiles/publicaciones de negocio);
- estudios, casos de éxito e infografías solo con datos reales, permisos, periodo y metodología;
- ideas y borradores para PR, colaboraciones y solicitudes de periodistas; outreach personalizado, nunca masivo;
- respuestas a reseñas y solicitudes neutrales de opinión, sin incentivos ni filtrado;
- informes periódicos basados en evidencia aprobada, indicando qué se observó, qué se hizo, qué no se verificó y qué sigue.

Antes de codificar, dividirlo en contratos pequeños y criterios comprobables. Cada hecho debe conservar referencias y procedencia; lo no sabido se declara. Hipótesis/inferencias se etiquetan. La validación automática no se vende como garantía semántica. La persona responsable aprueba el contenido y cualquier acción externa. El Core prepara, nunca publica/envía. Sin modelo real, proveedor, secreto, red ni persistencia en CORE-8.1; estos se diseñan/resuelven después en CORE-9.

**Gate:** pruebas deterministas con mocks en al menos tres verticales, negativos para datos ausentes/contradictorios/no aprobados, `npm run verify`, CI Node 20/22 verde y documentación/handoff actualizados. PR separado, sin merge.

## Etapa 3 — avanzar CORE-9 hasta el límite autorizado

CORE-9 es la fase final de plataforma. En este proyecto solo se autoriza dejar trabajo revisable en RUBIK-SEO-GEO-CORE. Claude puede preparar:
- requisitos y arquitectura de referencia;
- límites de tenant/proyecto y propiedad de datos (Project State/Studio/Media Library/Page Registry siguen en cada host);
- threat model, permisos, auditoría, límites de gasto y gestión de consentimiento, sin secretos reales;
- contratos/adapters e interfaces server-side para proveedores, MCP/OpenSEO y modelos, con mocks;
- esquema lógico/migraciones propuestas como documentación, sin desplegar base de datos;
- plan de implementación, riesgos, costes conocidos/por averiguar y criterios de aceptación.

No crear otro repositorio, no modificar ni leer otros repositorios, no usar credenciales, no llamar servicios externos, no conectar cuentas reales, no almacenar datos de cliente, no desplegar y no abrir automáticamente una plataforma funcional fuera de este proyecto. Si para continuar hace falta un repo destino, secretos, decisión de proveedor/coste o acceso a host, dejar la pregunta/bloqueo concreto en HANDOFF y avanzar en las tareas independientes de especificación. No inventar respuestas.

## Loop, checkpoints y reanudación por créditos

En cada inicio/reanudación:

1. Leer `CLAUDE.md`, `docs/README.md`, ROADMAP §§3–6, este documento y la última sesión de HANDOFF.
2. Comprobar `git status`, rama, HEAD local/remoto, PRs y CI; no asumir que el SHA de esta guía sigue siendo el HEAD.
3. Ejecutar `npm run verify` antes de modificar código. Repetir solo si corrige un fallo o valida un gate.
4. Escoger el siguiente criterio pendiente, trabajar hasta dejar una unidad coherente, revisar el diff y actualizar las pruebas/documentación.
5. Ejecutar verificaciones disponibles. Informar por separado resultados locales y CI; nunca afirmar que CI está verde si no hay un run exitoso.
6. Hacer commit pequeño y descriptivo tras un bloque coherente. Antes de detenerse o cuando el saldo/tiempo sea bajo, dejar el árbol limpio o anotar cambios sin commit y actualizar HANDOFF con fase, PR/rama, HEAD exacto, archivos, pruebas/resultados, CI, pendientes y próxima tarea concreta. No esperar al último crédito para guardar el estado.
7. Al reanudar, continuar desde ese handoff y el último commit; no repetir trabajo terminado ni reescribir evidencias.

Usa el Loop autorizado para continuar el trabajo en esta secuencia, sin esperas artificiales entre tareas. Si una fase queda bloqueada, registra el bloqueo y avanza solo a tareas posteriores que no dependan de ella; no declares fases completas por conveniencia.

## Límites no negociables

- Todo el trabajo, ramas, PRs, commits y documentación de esta tarea pertenecen exclusivamente a RUBIK-SEO-GEO-CORE.
- Nunca acceder, clonar, leer, editar, commitear ni abrir PR en `WEB-RESTAURACI-N-PREMIUM-DIN-MICA` ni en ningún otro repo. No contactar a nadie ni enviar comunicaciones externas.
- No fusionar PRs, activar auto-merge, desplegar, publicar contenido, enviar mensajes, crear gastos ni habilitar integraciones reales. Se requiere instrucción explícita del usuario.
- No afirmar que una acción se aprobó, ejecutó, verificó o tuvo resultado sin evidencia confiable.
- Mantener fases separadas en ramas/PRs apilados y explicar la dependencia. La revisión y el merge corresponden al usuario.
