# Servicio off-page & Authority (CORE-8)

**Fecha:** 25/09/2026 · **Decisión:** [D-23](../DECISIONS.md) · **Módulo:** `src/rubik-seo-geo-offpage.js` (`./offpage`, global `RubikSEOGeoOffpage`) · **Pruebas:** `tests/core-8-offpage-authority.test.cjs`

Este documento describe el modelo de servicio recurrente (normalmente mensual) de SEO off-page y autoridad, los contratos del Core que lo soportan, qué hace la IA y qué exige aprobación humana, y qué queda para CORE-9. También recoge la investigación previa, con fuentes, fecha de consulta y tipo de fuente.

**Límites:**

- Es un contrato **Core-only**: sin red, sin credenciales, sin persistencia y sin reloj propio. Las fechas las pasa quien llama.
- Los datos entran como manuales, importados, mock o resultados de proveedor de CORE-7.
- Ninguna fuente se declara conectada sin una verificación real (`connection:'VERIFIED'` de un transporte `live`).

## 1. Modelo de servicio

El ciclo es: observar → investigar → priorizar → actuar → medir → aprender → continuar.

No hay que forzar acciones nuevas cada mes. El seguimiento, la verificación y el aprendizaje son trabajo mensual válido, y el informe puede decir «no hubo cambios relevantes».

| Fase | Contrato | Qué garantiza |
|---|---|---|
| **A. Estado y línea base** | `profile(input,{core,config})`, `snapshot(...)` | Entidad y variantes de nombre (desde `core.source(config)`), dominio, mercados/locale (`core.normalizeLocale`), activos prioritarios, competidores **confirmados por el host** (los demás quedan como `candidateCompetitors` y no se comparan) y fuentes declaradas, siempre `NOT_VERIFIED`. La línea base es el primer `snapshot` con periodo, fecha, cobertura y estado por fuente. |
| **B. Observación y diagnóstico** | `measurement`, `snapshot`, `compareSnapshots`, `mention`, `citationConsistency`, `querySet`, `geoRun`, `summarizeGeo`, `compareGeo`, `aiCrawlerAccess` | Backlinks mediante `providers.normalizeBacklinks` (CORE-7), dominios de referencia y destinos. Enlaces nuevos, perdidos (solo con el indicador `lost` del proveedor) y «no vistos» (hay que verificarlos antes de darlos por perdidos). Menciones enlazadas y no enlazadas sobre `releaseE.normalizeMentionRecord`. Consistencia NAP frente al adapter. Visibilidad en IA y acceso de rastreadores de IA. Tráfico de referencia como dimensión aparte. |
| **C. Oportunidades y plan** | `opportunity`, `prioritize` | Cada oportunidad tiene problema/objetivo, evidencia, fuente, fecha, relevancia, esfuerzo, riesgo, confianza y motivo de prioridad. La puntuación es una heurística transparente (pesos incluidos en el resultado), **nunca** una señal de Google. Incluye acciones sin enlace. Sin cuotas de enlaces ni de contactos. |
| **D. Ejecución y seguimiento** | `action`, `transition`, `campaign`, `campaignProgress`, `closePeriod` | Campañas que abarcan varios periodos. Diez estados: propuesta, revisada, aprobada, en curso, esperando respuesta, publicada/ejecutada, verificación pendiente, completada, rechazada y cancelada. Mantiene la cadena objetivo → acción → evidencia de ejecución → resultado verificado. Las acciones abiertas se arrastran con motivo y siguiente paso. El cierre compara lo planificado con lo hecho, explica bloqueos y registra aprendizajes. |
| **E. Informe al cliente** | `monthlyReport`, `validateReport` | Cambios observados, acciones ejecutadas con evidencia, acciones propuestas, pendientes y bloqueadas, y evolución por dimensión con límites de medición. Resultado de negocio solo si es atribuible. Siguiente foco con su motivo. Sin promesas. |

### 1.1 Reglas de honestidad (comprobadas por pruebas)

- **Sin medición no hay cifra.** Una fuente que no midió da `value:null` y `NOT_MEASURED`, nunca `0`. Una respuesta de IA sin contenido cuenta como `NO_ANSWER`, no como cero.
- **La ausencia en una muestra no demuestra ausencia.** Esta limitación viaja en cada `snapshot`, comparación y resumen GEO.
- **«Sin cambios relevantes» solo con datos comparables.** Si el proveedor cambió o falta una medición, el resultado es `null` («no se sabe»), nunca `true`.
- **La verificación viene de una frontera confiable, no de campos de entrada.** Solo cuenta como verificado un resultado que el módulo `providers` inyectado emitió en este proceso (`providers.isTrustedResult`), con transporte `live` (`method:'api'`) y `connection:'VERIFIED'`.
  - Un objeto con la misma forma, una copia serializada o una caché externa rehidratada nunca son verificados, digan lo que digan `method` o `connection`. En `measurement()` quedan como `trust:'UNTRUSTED_ENVELOPE'` y método `import`.
  - En `geoRun()` la ejecución solo es verificada si aporta ese resultado confiable en `providerResult`.
  - Lo importado, lo manual y los mocks nunca son verificados. La confianza no sobrevive a la serialización: CORE-9 deberá restablecerla en el servidor (por ejemplo, con provenance firmada).
- **Minimización de datos personales.** Los extractos pierden correos (también codificados como `%40`), teléfonos (incluidas secuencias de 9 a 15 dígitos), credenciales, cadenas con forma de token y query strings de URL. La regla de dígitos es conservadora: puede ocultar métricas muy grandes. La consistencia NAP devuelve estados, no el teléfono ni la dirección del cliente.

## 2. GEO off-page (dimensión observacional)

No es una técnica oficial: es una medición de lo que responden los motores generativos sobre un conjunto de consultas controlado.

- **Conjunto de consultas versionado** (`querySet`): id, versión, hash, locale y mercado; intención, si la consulta es de marca y su origen (`search-console`, `people-also-ask`, `host`, `manual` o `llm-generated`).
  - Un conjunto formado solo por consultas generadas por LLM se marca como tal (`ONLY_LLM_GENERATED_QUERIES`).
  - Admite **controles negativos**: marcas ficticias que detectan menciones alucinadas.
- **Ejecución** (`geoRun`): motor, superficie (`api` o `consumer-ui`), modelo, fecha, índice de repetición y método (`manual`, `import`, `mock` o `api`). El locale y el mercado son siempre los de la consulta; una ejecución que declara otros se rechaza (`LOCALE_MARKET_MISMATCH`).
  - **Cualquier otro método, incluido el scraping, se rechaza** (`METHOD_NOT_ALLOWED`) para no incumplir términos de servicio.
  - La mención se detecta por coincidencia exacta de palabra con las variantes del nombre.
  - La cita propia exige que el host coincida exactamente o sea un subdominio, nunca una subcadena.
  - Una observación nunca es «verificada» por sus campos declarados; ver §1.1.
- **Resumen** (`summarizeGeo`), por grupo **motor × superficie × locale × mercado**. Una API y una interfaz de consumo nunca se mezclan.
  - La cobertura y las repeticiones se calculan solo sobre las consultas de ese locale y mercado exactos (`queriesInGroup`, `queriesAnswered`, `queryCoverage`).
  - `minUsableAnswersPerQuery` cuenta solo respuestas utilizables: `ERROR` y `NO_ANSWER` no inflan las repeticiones.
  - tasa de mención y de cita propia, con intervalo de Wilson al 95 %;
  - rango entre consultas, variabilidad (consultas con resultados inconsistentes entre repeticiones), posiciones de cita y dominios más citados;
  - avisos `FEW_RUNS_PER_QUERY`, `INCOMPLETE_QUERY_COVERAGE`, `HALLUCINATED_CONTROL_MENTIONS`, `MODEL_CHANGED_WITHIN_WINDOW`, `MODEL_NOT_EXPOSED`, `MIXED_METHODS` y `UNVERIFIED_OBSERVATIONS`;
  - la confianza nunca pasa de `medium`.
- **Comparación** (`compareGeo`): exige el mismo hash de conjunto y el mismo grupo. La serie es `NOT_COMPARABLE`, con motivo, si cambia la superficie (`SURFACE_CHANGED`), el modelo (`MODEL_CHANGED`, o `MODEL_CHANGED_WITHIN_WINDOW` si cambia dentro de una ventana) o el método de observación (`METHOD_CHANGED`), o si no hay respuestas utilizables.
  - Solo entre series comparables hay cambio (`UP`/`DOWN`), y solo si los intervalos no se solapan; si se solapan, es `WITHIN_NOISE`.
  - Nunca se informa `UP`/`DOWN` entre series distintas.
- **Acceso de rastreadores** (`aiCrawlerAccess`): reutiliza `intelligence.crawlerAudit`/`parseRobots` para OAI-SearchBot, GPTBot, Google-Extended y PerplexityBot, con el significado documentado de cada uno. No se infieren factores de ranking no documentados.
- **Tráfico de referencia** (dimensión `referrals`): sesiones de `chatgpt.com` (`utm_source=chatgpt.com`) y de otros motores de IA.
  - Se mantiene **separado** de la visibilidad observada y del resultado de negocio.

## 3. IA y aprobación humana

### 3.1 Lo que automatiza el Core

- Análisis, normalización, comparación, agrupación, preparación de tareas y borradores con evidencia.
- La IA entra solo como adaptador inyectado:
  - `runAiTask` pasa por `providers.runProviderRequest` (proveedor `ai-assist`, operación `offpageAnalysis`, tratada como de pago). Así reutiliza la confirmación de coste, el presupuesto finito, el rechazo de secretos, la provenance y la redacción de CORE-7.
  - La salida se valida con `validateAiOutput`.
- **Minimización completa de la evidencia enviada** (`evidenceItem`/`prepareEvidence`):
  - Se revisan todos los campos: `id`, `kind`, `subject`, `field`, `provider`, `period`, `value`, `text` y `url`.
  - Un `id` que no sea un identificador simple, o que contenga datos personales o secretos, excluye el elemento, porque los ids se devuelven como referencias. La exclusión se informa en `evidenceRejected` sin copiar el contenido.
  - Los metadatos se minimizan y, si queda algo sensible, se sustituyen por `[redacted]`.
  - Las URLs pierden credenciales, query y fragmento, y se descartan si la ruta aún contiene datos personales.
  - Antes de llamar al transporte, `runAiTask` revisa la petición completa. Si sobrevive algún dato personal (por ejemplo, un teléfono guardado como número), no envía nada (`PERSONAL_DATA_IN_REQUEST`).

**Tareas** (`AI_TASKS`): `classify-evidence`, `summarize-evidence`, `detect-opportunities`, `detect-changes`, `cluster`, `prioritize-explain`, `draft-outreach`, `draft-pr-brief`, `draft-report`, `compare-geo-answers` y `extract-learnings`.

**Validación de la salida:**

- Se acepta un objeto, una cadena JSON o JSON dentro de un bloque de código. La prosa libre, el JSON roto o la falta de `items` dan `INVALID_OUTPUT`.
- Cada elemento declara su tipo: `FACT`, `INFERENCE` o `HYPOTHESIS` (`DRAFT` en las tareas de borrador). Debe incluir referencias de evidencia, confianza y límites.
- **Motivos de rechazo por elemento:**
  - hecho o inferencia sin evidencia (`UNSUPPORTED_CLAIM`);
  - referencia desconocida (`UNKNOWN_EVIDENCE_REF`);
  - hecho apoyado en evidencia contradictoria (`CONTRADICTORY_EVIDENCE`, detectada con `findConflicts`);
  - hecho que cita evidencia sin fecha ni periodo (`UNDATED_EVIDENCE_FOR_FACT`);
  - hecho que mezcla evidencia de contextos no comparables sobre el mismo dato (`NON_COMPARABLE_EVIDENCE_FOR_FACT`);
  - cifra que no aparece en la evidencia citada (`UNSUPPORTED_NUMBER`);
  - URL que no aparece en la evidencia citada (`UNSUPPORTED_URL`);
  - promesas (`PROMISE_NOT_ALLOWED`);
  - datos personales o secretos (`PERSONAL_DATA_OR_SECRET`);
  - falta de confianza o de límites.
- Una hipótesis sin evidencia queda como candidata `INSUFFICIENT`, con la confianza limitada a `low`.
- **Contradicción frente a evolución** (`compareEvidence`):
  - Dos valores distintos para el mismo `subject`+`field` son un **conflicto** solo dentro del mismo contexto de medición: mismo periodo (o día de captura), proveedor y método.
  - Si difieren el periodo, el proveedor o el método, es una **divergencia**: evolución o cobertura distinta, no contradicción. Se informa en `reviewFlags` (`EVIDENCE_DIFFERS_BY_PERIOD`, `_PROVIDER` o `_METHOD`) y no bloquea inferencias de tendencia.
  - Los valores sin fecha ni periodo comparten el contexto `unscoped`, así que si difieren cuentan como conflicto: nada demuestra que sean mediciones distintas.
- **La validación es solo estructural.** El Core no puede demostrar que una afirmación se desprenda de su evidencia (entailment): comprobar cifras y URLs no basta.
  - El estado es `STRUCTURALLY_VALID`, `PARTIAL`, `REJECTED`, `EMPTY` o `INVALID_OUTPUT`, nunca «válido».
  - Cada elemento que pasa es una **candidata** (`status:'CANDIDATE'`, `claimedKind`, `verification:'STRUCTURAL_ONLY'`, `semanticReview:'PENDING_HUMAN'`), y el resultado incluye `semanticVerification:'NOT_PERFORMED'`.
  - `LOW_LEXICAL_OVERLAP` avisa al revisor cuando la afirmación apenas comparte términos con su evidencia. Es solo una pista, no una garantía.
  - **Una persona valida la correspondencia entre afirmación y evidencia antes de usar el contenido.**
- **El resultado nunca es estado canónico** (`canonical:false`, `requiresHumanReview:true`). Los borradores son `sendable:false` y `requiresHumanApproval:true`.

### 3.2 Lo que exige aprobación humana explícita

Estas acciones son `EXTERNAL_KINDS`: `send-email`, `send-message`, `publish-content`, `edit-external-profile`, `paid-placement`, `business-change`, `reputation-change`, `directory-submission` y `external-decision`.

- La IA solo propone acciones (`origin:'ai-suggestion'`) y **nunca** cambia estados (`AI_CANNOT_TRANSITION`).
- Revisar, aprobar (con alcance), rechazar, cancelar y completar son acciones **humanas**.
- Una acción externa no pasa a «en curso», «esperando respuesta» ni «ejecutada» sin una aprobación humana vigente.
- **Evidencia obligatoria:**
  - «ejecutada» exige evidencia de ejecución;
  - «completada» exige un resultado verificado (fecha, método y resultado).
- **Decisiones reversibles:** revocar una aprobación, rechazar, cancelar o reabrir exige motivo, y el historial es inmutable.

### 3.3 Lo que no se implementa

Estas tácticas están en `PROHIBITED_TACTICS` y se rechazan como oportunidad o como acción:

- compra o intercambio de enlaces para manipular el ranking; redes privadas de blogs; enlaces automáticos o ocultos;
- envíos masivos; reseñas falsas, incentivadas o filtradas; menciones artificiales o sembradas en UGC;
- contenido a escala, abuso de reputación de sitio o de dominios caducados;
- colocaciones de pago sin `rel="sponsored"`/`nofollow`.

Tampoco se admiten cuotas de enlaces o contactos, ni acciones con más de un destinatario.

## 4. CORE-8 frente a CORE-9

| En el Core (CORE-8) | En CORE-9 (Platform Layer) |
|---|---|
| Contratos puros, validación, heurísticas y comparaciones | Conectores reales: backlinks, menciones, GSC, Bing AI Performance, GA4 y motores de IA |
| Interfaces inyectables y mocks de IA (`ai-assist` en el catálogo, con release `O`) | Modelos reales, prompts de producción, credenciales y control de gasto real |
| Estados y transiciones inmutables con historial en el objeto | Persistencia, historial entre periodos, programación de ciclos y auditoría central |
| Borradores no enviables | Envío real tras aprobación, registro de entregas y autenticación de usuarios |
| Comprobación de acceso de rastreadores sobre el robots.txt declarado | Recuperación real de robots.txt y verificación periódica de enlaces publicados |

## 5. Fuentes consultadas (25/09/2026)

Tipos: **OFICIAL** (requisito o recomendación de la plataforma), **INVESTIGACIÓN** (hallazgo publicado), **ANECDÓTICO** (experiencia de profesionales, no verificada), **DECISIÓN** (decisión de producto) e **HIPÓTESIS** (algo que hay que medir).

No se copiaron repositorios, skills, documentación, código ni publicaciones: solo se extrajeron patrones, con su procedencia.

### 5.1 Fuentes oficiales

| Fuente | Tipo | Qué se toma |
|---|---|---|
| [Google Search: políticas contra el spam](https://developers.google.com/search/docs/essentials/spam-policies) (actualizada el 28/08/2026) | OFICIAL | Son spam de enlaces la compra o venta de enlaces para posicionar, los enlaces automáticos, los intercambios excesivos y los enlaces ocultos en widgets. También el contenido a escala, el abuso de reputación de sitio y de dominios caducados, y el spam en UGC. Los enlaces de pago deben llevar `sponsored`/`nofollow`. → `PROHIBITED_TACTICS` y cualificación de colocaciones de pago. |
| [Google Search: optimización para funciones de IA generativa](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (actualizada el 10/07/2026) | OFICIAL | Se aplican las buenas prácticas SEO de siempre. No hacen falta ficheros especiales, llms.txt ni schema específico. Perseguir menciones no auténticas ayuda menos de lo que parece. Ninguna herramienta de terceros ve los sistemas internos de Google. Para medir, remite al informe de rendimiento de IA generativa de Search Console. → La puntuación es heurística y no una señal de Google. Resultados en IA sin promesas. |
| [Google Search: calificar enlaces salientes](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links) (actualizada el 10/12/2025) | OFICIAL | `sponsored` para publicidad y pago, `ugc` para contenido de usuarios y `nofollow` cuando no encaja otro. Google los trata como indicaciones, no como directivas. → `rel` de `normalizeBacklinks` y regla `PAID_LINK_WITHOUT_QUALIFICATION`. |
| [Rastreadores comunes de Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) (actualizada el 14/07/2026) | OFICIAL | Google-Extended controla el uso en entrenamiento y grounding de Gemini, sin efecto en Google Search. → Nota de `aiCrawlerAccess`. |
| [OpenAI: FAQ para editores y desarrolladores](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) (fecha relativa en la página) | OFICIAL | No bloquear OAI-SearchBot si se quiere aparecer en ChatGPT search. GPTBot solo afecta al entrenamiento. ChatGPT añade `utm_source=chatgpt.com`. Una página bloqueada puede mostrarse como enlace y título; para excluirla hace falta `noindex` con el rastreador permitido. No documenta factores de ranking. → `aiCrawlerAccess`, dimensión `referrals`. La consulta directa devolvió 403 y se leyó una copia en caché. |
| [Bing: directrices para webmasters](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a) | OFICIAL | La compra de enlaces, las redes privadas y la promoción social falsa son infracciones. Manipular los modelos de lenguaje de Bing puede reducir la visibilidad. NOARCHIVE/NOCACHE limitan Copilot. IndexNow para cambios. |
| [Bing: AI Performance (vista previa)](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) | OFICIAL; página oficial identificada, detalles de producto pendientes de verificación directa | Referencia candidata para CORE-9. No basar conectores ni afirmaciones de medición en funciones que no se hayan confirmado en la documentación accesible. |
| [Perplexity: rastreadores](https://docs.perplexity.ai/guides/bots) | OFICIAL | PerplexityBot respeta robots.txt. Perplexity-User generalmente no. → Nota de `aiCrawlerAccess`. |

### 5.2 Investigación (Hugging Face y arXiv)

| Fuente | Tipo | Licencia | Uso en el Core |
|---|---|---|---|
| [GEO-bench](https://huggingface.co/datasets/GEO-Optim/geo-bench) · [arXiv 2311.09735](https://arxiv.org/abs/2311.09735) | Dataset de benchmark y artículo | **No resuelta:** la ficha/README declara CC BY-NC-SA 4.0, mientras los metadatos de Hugging Face muestran CC BY-SA 4.0 | **Solo referencia; no reutilizar ni redistribuir datos** hasta confirmar la licencia con la fuente responsable. Un benchmark controlado en inglés no describe producción. |
| [NorGEO-Bench](https://huggingface.co/datasets/dervig/NorGEO-Bench) | Evidencia de producción (noruego) | CC BY 4.0 | Patrón: conjunto de preguntas fijo, repeticiones, citas y menciones de entidades. Solo metodología; no es la verdad sobre otros mercados. |
| [AI Recommendation Index](https://huggingface.co/datasets/nikoalho/ai-recommendation-index) | Evidencia de producción (144 respuestas) | CC BY 4.0 | Muestra demasiado pequeña: anecdótica. Solo refuerza la idea de instantánea fechada y no determinista. |
| [arXiv 2603.08924](https://arxiv.org/abs/2603.08924) | INVESTIGACIÓN | CC BY 4.0 | La variabilidad de citas exige repetir y dar intervalos. El tamaño de muestra se fija antes, sin parar pronto. → Intervalos y `WITHIN_NOISE`. |
| [arXiv 2604.07585](https://arxiv.org/abs/2604.07585) | INVESTIGACIÓN (detalles no verificados) | no comprobada | La visibilidad se trata como una distribución, no como una única medición. → Rango y variabilidad. |
| [arXiv 2609.05059](https://arxiv.org/abs/2609.05059) | INVESTIGACIÓN | no comprobada | Las repeticiones dejan de aportar marcas nuevas, pero siguen apareciendo fuentes nuevas. → `HIPÓTESIS`: más repeticiones para medir fuentes que para medir marcas. |
| [arXiv 2605.14021](https://arxiv.org/abs/2605.14021) | INVESTIGACIÓN | no comprobada | Las AI Overviews aparecen solo en parte de las consultas y a veces citan páginas que no respaldan lo que se afirma. → `NO_ANSWER` como resultado propio. Una cita no equivale a exactitud. |
| [Space «GEO for SMEs»](https://huggingface.co/spaces/jrishpapi/geo-for-smes-ai-search-visibility) | Demo | no indicada | Sin método validable: **no** se usa. |

### 5.3 Repositorios (solo lectura)

La evaluación detallada de cada repositorio está en [ECOSYSTEM-REFERENCES.md](../ECOSYSTEM-REFERENCES.md#core-8--investigación-off-page-25092026). Un repositorio de ejemplo no es una práctica validada.

### 5.4 Foros (ANECDÓTICO)

Hilos recientes de r/localseo, r/SEO, r/DigitalPR, r/b2bmarketing, r/agency y r/PublicRelations. No se copió ninguna publicación. Patrones repetidos:

- Pocos enlaces relevantes al mes bastan para negocios locales.
- Recuperar menciones sin enlace es barato y está infrautilizado.
- Las citas locales son mantenimiento, no una palanca de ranking.
- Una sola consulta a un motor de IA no significa nada; se recomiendan conjuntos fijos, repeticiones y tendencias.
- Hay escepticismo ante las «puntuaciones de visibilidad» precisas y las promesas de «#1 en ChatGPT».
- Hay informes con métricas de autoridad que no se traducen en resultados.

Estos patrones inspiran las reglas (sin cuotas, «no vistos» frente a perdidos, métricas de terceros como estimaciones, sin promesas), no los valores concretos.

### 5.5 Decisiones e hipótesis derivadas

- **DECISIÓN:** la puntuación usa pesos visibles (relevancia 3, confianza 2, esfuerzo 1, riesgo 2) y es solo un orden interno. Los pesos se pueden inyectar.
- **DECISIÓN:** el intervalo de Wilson es determinista y reproducible. Como las repeticiones de una misma consulta están correlacionadas, el intervalo es optimista y así se indica. Un bootstrap con semilla queda como mejora posible.
- **HIPÓTESIS a medir en CORE-9:** cuántas repeticiones por consulta y motor hacen falta para que los intervalos sean útiles en cada mercado y vertical. El Core solo avisa con `FEW_RUNS_PER_QUERY` por debajo de 3.


## 6. CORE-8.1 · operación off-page continua asistida por IA (alcance aprobado)

**Estado:** aprobado el 25/09/2026 (D-24). Implementado en `src/rubik-seo-geo-offpage-ops.js` en la rama `feat/core-8-1-offpage-operations` ([PR #13](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/pull/13), apilado sobre #12; CI run [36203308792](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE/actions/runs/36203308792) del HEAD `a0f59fa` verde en Node 20.20.2/22, 287/287 por job, 0 omitidas; pendiente de revisión humana), apilada sobre PR #12. No está cerrado ni fusionado. La continuidad a largo plazo es propia del servicio off-page; no se exige que cada periodo invente acciones nuevas. Seguimiento, verificación, aprendizaje, informe o «sin cambios relevantes» con mediciones comparables son trabajo válido.

### 6.1 Capacidades que debe habilitar el Core

- Seguimiento entre periodos de clientes, campañas, oportunidades, acciones abiertas, bloqueos, respuestas, resultados verificados y aprendizajes. Mantener la relación entre una observación y el siguiente paso; no perder el historial cuando una campaña cruza meses. La persistencia real corresponde a CORE-9/host.
- Mediciones GEO repetidas sobre consultas versionadas, por motor/superficie/modelo, idioma y mercado; registrar menciones, fuentes citadas y evolución con límites claros. No usar scraping ni presentar menciones/citas como garantizadas. Una API y una interfaz de consumo no son observaciones equivalentes.
- Preparar con IA artículos y guías a partir de servicios, productos, preguntas frecuentes, datos y experiencia **aprobados** del cliente; generar adaptaciones para redes, newsletters, perfiles/publicaciones de negocio y otros canales. Cada borrador conserva las referencias que respaldan sus hechos y señala como desconocido lo que no pueda respaldar.
- Proponer estudios, casos de éxito e infografías solo cuando existan datos reales suficientes, permisos de uso y metodología/periodo/fuente identificables. No inventar resultados, clientes, testimonios, muestras, cifras ni causalidad.
- Proponer temas de PR, colaboraciones y respuestas a solicitudes periodísticas; crear borradores individualizados de contacto para medios o sitios pertinentes. Sin scraping de contactos, envíos en lote, cuotas ni outreach automatizado.
- Preparar respuestas a reseñas y solicitudes neutrales de opinión. Nunca inventar reseñas, ofrecer incentivos, filtrar a quién se pide opinión ni ocultar críticas; cualquier envío/publicación requiere revisión y aprobación humanas.
- Producir informes periódicos que separen lo observado, lo ejecutado, lo que no se pudo verificar y lo siguiente recomendado. La IA usa solo fuentes identificadas y datos aprobados; si no hay evidencia, declara el vacío.

### 6.2 Criterios de aceptación y fronteras

- Cada afirmación factual del borrador enlaza a evidencia aprobada; cifras y citas conservan fuente, periodo, cobertura y método. Inferencias e hipótesis quedan etiquetadas y sujetas a revisión humana. La validación estructural del Core no equivale a verificación semántica automática.
- La IA solo propone y redacta. Ningún mensaje, publicación, edición de perfil, solicitud de reseña ni otra acción externa se envía sin aprobación humana explícita y vigente. No se promete ranking, venta, backlink ni cita.
- Generar contenido no equivale a publicarlo: el Core devuelve borradores revisables; el CMS/canal y su publicación los aporta el host o CORE-9.
- CORE-8.1 en este repo define contratos, validaciones, provenance y mocks. No introduce credenciales, llamadas reales a modelos/proveedores, envío externo ni storage. Debe probar más de un vertical y datos faltantes/contradictorios.
- Al iniciar CORE-8.1, Claude debe convertir este alcance en entregables pequeños y criterios verificables antes de codificar; no ampliar ni sustituir estas decisiones sin registrar una decisión y pedir autorización cuando cambie el alcance.

### 6.3 Entregables y criterios comprobables (antes de codificar)

**Módulo:** `src/rubik-seo-geo-offpage-ops.js` (`./offpage-ops`, global `RubikSEOGeoOffpageOps`). Recibe `offpage` (CORE-8) por inyección y reutiliza sus contratos: acciones y aprobación humana, cierre de periodo, comparación GEO, minimización y comprobación de afirmaciones. Sin red, reloj, storage ni modelos.

| # | Entregable | Contrato | Criterios comprobables |
|---|---|---|---|
| 1 | **Información aprobada** | `approvedFact`, `factBook` | Un dato solo es utilizable si tiene `approvedBy`, `approvedAt`, fuente y alcance. Sin aprobación queda `PENDING_APPROVAL`; caducado, `EXPIRED`. Dos datos aprobados incompatibles en el mismo contexto se marcan `CONFLICT` y no se pueden citar como hechos. Los datos personales se minimizan. |
| 2 | **Continuidad entre periodos** | `periodLedger` | El libro se construye a partir de `offpage.closePeriod`. Cada campaña y acción abierta pasa al periodo siguiente con motivo y siguiente paso, o queda marcada. El historial solo crece (no se reescribe). La agenda del periodo siguiente admite seguimiento, verificación o remedición sin acciones nuevas (`newActionsRequired:false`). |
| 3 | **Mediciones GEO repetidas** | `geoMeasurementPlan`, `geoSeries` | El plan enumera las ejecuciones por consulta, motor, superficie, modelo, idioma y mercado, sin ejecutar nada ni permitir scraping. La serie compara cada periodo con el anterior mediante `offpage.compareGeo` y marca las rupturas (`NOT_COMPARABLE` con motivo) sin encadenar tendencias a través de ellas. |
| 4 | **Artículos, guías y adaptaciones por canal** | `contentBrief`, `validateDraft` | Cada bloque factual cita datos aprobados y utilizables. Una cifra o URL que no esté en esos datos se rechaza. Lo que no tiene respaldo queda `UNKNOWN`. Una adaptación por canal solo usa los datos de su borrador padre. Sin promesas. Resultado: `publishable:false`, `requiresHumanApproval:true` y `semanticReview:'PENDING_HUMAN'`. |
| 5 | **Estudios, casos e infografías** | `studyProposal` | Requieren datos aprobados de tipo dato o resultado con periodo, metodología, fuente y permiso de publicación. Un caso de éxito requiere además permiso de atribución. Si faltan, el estado es `BLOCKED` con motivos. Las afirmaciones causales solo pueden ser hipótesis. |
| 6 | **PR, colaboraciones, periodistas y outreach** | `prIdea`, `journalistResponse`, `outreachDraft`, `outreachBatchCheck` | Un destinatario por borrador, con una vía de contacto pública y con URL de origen (el Core no guarda direcciones). Personalización obligatoria respaldada por evidencia. Se detecta el mismo texto repetido en varios borradores (`TEMPLATED_MASS`). La acción asociada es una propuesta de `offpage.action` externa que exige aprobación humana. Las citas de experto requieren un dato aprobado con permiso de atribución. |
| 7 | **Reseñas** | `reviewResponseDraft`, `reviewRequestDraft` | Respuestas neutrales, sin datos personales del autor, sin pedir que se cambie o retire una reseña y sin compensación a cambio. Solicitudes dirigidas a toda la clientela elegible: se rechazan segmentación por satisfacción, incentivos y lenguaje de filtrado. Siempre borradores no enviables. |
| 8 | **Informe periódico** | `operationsReport` | Secciones de lo observado, lo ejecutado, lo no verificado y lo siguiente. Cada afirmación lleva referencias o el estado `UNKNOWN`. Se listan las fuentes. Sin promesas. Admite «sin cambios relevantes» solo con datos comparables (herencia de CORE-8). |

**Negativos obligatorios en las pruebas:** datos ausentes, no aprobados, caducados y contradictorios; outreach masivo; incentivos o filtrado de reseñas; causalidad no demostrada; tres verticales (restaurant, real-estate, professional-service).
