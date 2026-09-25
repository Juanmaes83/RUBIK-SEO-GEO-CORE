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
- **Nada importado ni manual es «verificado».** Solo lo es un sobre de CORE-7 con `connection:'VERIFIED'`.
- **Minimización de datos personales.** Los extractos pierden correos, teléfonos, credenciales y query strings de URL. La consistencia NAP devuelve estados, no el teléfono ni la dirección del cliente.

## 2. GEO off-page (dimensión observacional)

No es una técnica oficial: es una medición de lo que responden los motores generativos sobre un conjunto de consultas controlado.

- **Conjunto de consultas versionado** (`querySet`): id, versión, hash, locale y mercado; intención, si la consulta es de marca y su origen (`search-console`, `people-also-ask`, `host`, `manual` o `llm-generated`).
  - Un conjunto formado solo por consultas generadas por LLM se marca como tal (`ONLY_LLM_GENERATED_QUERIES`).
  - Admite **controles negativos**: marcas ficticias que detectan menciones alucinadas.
- **Ejecución** (`geoRun`): motor, superficie (`api` o `consumer-ui`), modelo, locale, mercado, fecha, índice de repetición y método (`manual`, `import`, `mock` o `api`).
  - **Cualquier otro método, incluido el scraping, se rechaza** (`METHOD_NOT_ALLOWED`) para no incumplir términos de servicio.
  - La mención se detecta por coincidencia exacta de palabra con las variantes del nombre.
  - La cita propia exige que el host coincida exactamente o sea un subdominio, nunca una subcadena.
  - Una observación manual nunca es «verificada».
- **Resumen** (`summarizeGeo`), por motor, locale y mercado:
  - tasa de mención y de cita propia, con intervalo de Wilson al 95 %;
  - rango entre consultas, variabilidad (consultas con resultados inconsistentes entre repeticiones), posiciones de cita y dominios más citados;
  - avisos `FEW_RUNS_PER_QUERY`, `INCOMPLETE_QUERY_COVERAGE`, `HALLUCINATED_CONTROL_MENTIONS`, `MODEL_CHANGED_WITHIN_WINDOW` y `MANUAL_OBSERVATIONS_UNVERIFIED`;
  - la confianza nunca pasa de `medium`.
- **Comparación** (`compareGeo`): exige el mismo hash de conjunto. Hay cambio (`UP`/`DOWN`) solo si los intervalos no se solapan; si se solapan, es `WITHIN_NOISE`. Un cambio de modelo se marca como ruptura de serie.
- **Acceso de rastreadores** (`aiCrawlerAccess`): reutiliza `intelligence.crawlerAudit`/`parseRobots` para OAI-SearchBot, GPTBot, Google-Extended y PerplexityBot, con el significado documentado de cada uno. No se infieren factores de ranking no documentados.
- **Tráfico de referencia** (dimensión `referrals`): sesiones de `chatgpt.com` (`utm_source=chatgpt.com`) y de otros motores de IA.
  - Se mantiene **separado** de la visibilidad observada y del resultado de negocio.

## 3. IA y aprobación humana

### 3.1 Lo que automatiza el Core

- Análisis, normalización, comparación, agrupación, preparación de tareas y borradores con evidencia.
- La IA entra solo como adaptador inyectado:
  - `runAiTask` pasa por `providers.runProviderRequest` (proveedor `ai-assist`, operación `offpageAnalysis`, tratada como de pago). Así reutiliza la confirmación de coste, el presupuesto finito, el rechazo de secretos, la provenance y la redacción de CORE-7.
  - La salida se valida con `validateAiOutput`.

**Tareas** (`AI_TASKS`): `classify-evidence`, `summarize-evidence`, `detect-opportunities`, `detect-changes`, `cluster`, `prioritize-explain`, `draft-outreach`, `draft-pr-brief`, `draft-report`, `compare-geo-answers` y `extract-learnings`.

**Validación de la salida:**

- Se acepta un objeto, una cadena JSON o JSON dentro de un bloque de código. La prosa libre, el JSON roto o la falta de `items` dan `INVALID_OUTPUT`.
- Cada elemento declara su tipo: `FACT`, `INFERENCE` o `HYPOTHESIS` (`DRAFT` en las tareas de borrador). Debe incluir referencias de evidencia, confianza y límites.
- **Motivos de rechazo por elemento:**
  - hecho o inferencia sin evidencia (`UNSUPPORTED_CLAIM`);
  - referencia desconocida (`UNKNOWN_EVIDENCE_REF`);
  - hecho apoyado en evidencia contradictoria (`CONTRADICTORY_EVIDENCE`, detectada con `findConflicts`);
  - cifra que no aparece en la evidencia citada (`UNSUPPORTED_NUMBER`);
  - URL que no aparece en la evidencia citada (`UNSUPPORTED_URL`);
  - promesas (`PROMISE_NOT_ALLOWED`);
  - datos personales o secretos (`PERSONAL_DATA_OR_SECRET`);
  - falta de confianza o de límites.
- Una hipótesis sin evidencia se acepta como `INSUFFICIENT`, con la confianza limitada a `low`.
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
| [Bing: AI Performance (vista previa)](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) | OFICIAL, **solo por resultados de búsqueda** | Informe de citas en Copilot y de «grounding queries». Mide citas, no rankings ni clics. Fuente candidata para CORE-9, sin verificar. |
| [Perplexity: rastreadores](https://docs.perplexity.ai/guides/bots) | OFICIAL | PerplexityBot respeta robots.txt. Perplexity-User generalmente no. → Nota de `aiCrawlerAccess`. |

### 5.2 Investigación (Hugging Face y arXiv)

| Fuente | Tipo | Licencia | Uso en el Core |
|---|---|---|---|
| [GEO-bench](https://huggingface.co/datasets/GEO-Optim/geo-bench) · [arXiv 2311.09735](https://arxiv.org/abs/2311.09735) | Dataset de benchmark y artículo | CC BY-NC-SA 4.0 | **Solo referencia**. Un entorno controlado en inglés no describe cómo se comportan los motores en producción. No se incorpora. |
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
