# Evaluación de repositorios SEO/GEO relacionados

**Fecha:** 25/09/2026  
**Alcance:** evaluación inicial de encaje de producto a partir de los README de los repositorios SEO/GEO visibles en la cuenta GitHub y la documentación vigente del Core. No es auditoría de código, seguridad, licencia, mantenimiento ni rendimiento. No se inspeccionó WEB-RESTAURACI-N-PREMIUM-DIN-MICA ni ningún otro repositorio de host. No se modificó ningún repositorio ajeno al Core.

## Decisión ejecutiva

El Core sigue siendo el producto independiente y la única fuente de lógica SEO/GEO compartida. Los repositorios externos se consideran posibles proveedores, referencias de workflow o herramientas auxiliares; no se copian ni se convierten en dependencias por defecto.

La decisión de producto es mantener el foco en **CORE-3** y:

1. Tratar `open-seo` como integración futura candidata, detrás de un contrato inyectable y con mocks; no declararlo conectado ni implementarlo antes de cerrar los bloqueos del roadmap.
2. Mantener crawlers y fuentes de medición como proveedores intercambiables que pueden evaluarse por separado.
3. Usar skills/agentes y extensiones como referencias de workflow y QA, no como núcleo de ejecución.
4. No ampliar ahora el Core para duplicar paneles SaaS, marketing general o herramientas verticales.
5. No copiar código de estos proyectos sin revisión independiente de licencia, procedencia, mantenimiento y encaje técnico.

## Evaluación

| Repositorio | Interés | Uso recomendado |
|---|---|---|
| [open-seo](https://github.com/Juanmaes83/open-seo) | **Alto, integración futura** | Proveedor externo de crawl post-publicación y datos SEO mediante MCP. La integración está descrita en [OPENSEO.md](integrations/OPENSEO.md) y CORE-7.1. Requiere primero la interfaz inyectable ya cerrada en CORE-3, mocks de respuestas MCP y Platform Layer server-side. |
| [open-seo-crawler](https://github.com/Juanmaes83/open-seo-crawler) | **Medio, referencia de crawler** | Comparar cobertura de auditoría técnica y operación local. Evaluar como proveedor alternativo; no añadir ahora al Core. |
| [seonaut](https://github.com/Juanmaes83/seonaut) | **Medio-bajo, referencia de crawler** | Comparar modelo de auditoría, severidad y presentación de hallazgos. No asumir mantenimiento o idoneidad sin una revisión específica. |
| [dataforseo-claude](https://github.com/Juanmaes83/dataforseo-claude) | **Medio, referencia de datos** | Estudiar operaciones de keywords, SERP, backlinks y rankings. DataForSEO es un servicio externo de pago; debe ser opcional, con coste y procedencia explícitos. |
| [bisibility](https://github.com/Juanmaes83/bisibility) | **Medio, referencia de medición** | Revisar patrones para almacenamiento propio y seguimiento de visibilidad. Complementario a contratos de medición; no es auditoría técnica ni motor de publicación. |
| [SEOntology](https://github.com/Juanmaes83/seontology) | **Interés de investigación futura** | Consultar como vocabulario semántico y posible referencia para procedencia y multidioma. El repositorio se describe como borrador temprano; no sustituye los modelos canónicos del Core. |
| [seo-side-panel](https://github.com/Juanmaes83/seo-side-panel) | **Medio, QA auxiliar** | Inspección manual de páginas, metadata, schema y lo que reciben crawlers. Herramienta complementaria, no dependencia del Core. |
| [bulk-seo-meta-editor-for-ai-agents](https://github.com/Juanmaes83/bulk-seo-meta-editor-for-ai-agents) | **Condicional a WordPress** | Posible referencia para un adapter vertical de WordPress si un host de ese tipo entra en alcance. No trasladar funciones WordPress al núcleo compartido. |
| [seo-god](https://github.com/Juanmaes83/seo-god), [geo-seo-claude](https://github.com/Juanmaes83/geo-seo-claude), [claude-seo](https://github.com/Juanmaes83/claude-seo), [notfair-plugin](https://github.com/Juanmaes83/notfair-plugin) | **Referencia de workflows** | Consultar patrones de auditoría, revisión humana, informes y operación mediante agentes. No duplicar sus skills en el Core ni acoplarlo a un agente concreto. |
| [open-seo-mcp-skills](https://github.com/Juanmaes83/open-seo-mcp-skills) | **Referencia de workflows/proveedor** | Útil para estudiar flujos basados en MCP y fuentes externas. Es una vía de integración distinta de OpenSEO; no se considera parte de CORE-7.1 sin decisión nueva. |
| [geo-checker](https://github.com/Juanmaes83/geo-checker), [seo-command-center](https://github.com/Juanmaes83/seo-command-center) | **Baja prioridad** | Productos de auditoría/medición con panel y dependencias propias. Sus flujos pueden inspirar requisitos, pero no resuelven la arquitectura de adapters y propagación del Core. |
| [OpenSEO](https://github.com/Juanmaes83/OpenSEO) (mayúsculas) | **No priorizar** | Su README lo presenta como WIP orientado a APIs. No confundirlo con [open-seo](https://github.com/Juanmaes83/open-seo), que es la implementación MCP examinada por la especificación actual del Core. |
| [marketingskills](https://github.com/Juanmaes83/marketingskills), [marketingskills2](https://github.com/Juanmaes83/marketingskills2), [digital-marketing-pro](https://github.com/Juanmaes83/digital-marketing-pro) | **No integrar** | Colecciones de habilidades de marketing de alcance amplio. Mantenerlas fuera del producto Core; evitar conservar referencias duplicadas cuando no aporten una diferencia demostrable. |

## Reglas de integración

- El Core no se convierte en un agregador de todos estos productos.
- Cada proveedor futuro debe entrar detrás de un contrato pequeño e inyectable, con fixtures/mocks deterministas, límites de coste y datos de procedencia.
- Nunca representar como conectada una integración que no tenga comprobación real y segura.
- No introducir llamadas de pago en tests; usar mocks. Cualquier uso real requiere contrato, autorización, límites y evidencia de coste.
- No trasladar a CORE capacidades que ya pertenecen al host, Studio, Project State, Media Library o adapters verticales.
- Esta evaluación no cambia el roadmap por sí sola: cualquier cambio de fase o alcance requiere actualizar `ROADMAP.md` y, si corresponde, registrar una decisión en `DECISIONS.md`.

## Próximos pasos ya alineados

1. Ejecutar CORE-3.1 como indica [ROADMAP.md](ROADMAP.md): eliminar la dependencia restaurant de `entityGraph().products` tras validar los contratos de los siete adapters.
2. Mantener CORE-7.1 bloqueado hasta satisfacer sus condiciones; utilizar `open-seo` solo como referencia para diseñar el contrato y los mocks.
3. Reabrir la evaluación de crawlers o medición únicamente cuando una tarea del Core necesite una fuente real y exista un contrato claro.
