# CORE-9 · Plan de ejecución de la plataforma

**Estado:** decisiones de producto e infraestructura iniciales aprobadas; aplicación aún no implementada.  
**Fecha de actualización:** 28/09/2026.  
**Repo de aplicación designado:** [Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO](https://github.com/Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO).  
**Repo de contratos SEO/GEO:** [Juanmaes83/RUBIK-SEO-GEO-CORE](https://github.com/Juanmaes83/RUBIK-SEO-GEO-CORE).  
**Documento de arquitectura/requisitos:** [PLATFORM-SPEC.md](PLATFORM-SPEC.md). **Decisiones:** [D-25 y D-26](../DECISIONS.md).  
**Fuente única del estado operativo:** [ROADMAP.md](../ROADMAP.md). Último checkpoint: [HANDOFF.md](../HANDOFF.md).

## 1. Objetivo y límites

Construir una plataforma multi-proyecto que use el Core como librería y aporte interfaz, autenticación, persistencia, conectores y operaciones de servicio. El Core sigue siendo vertical-agnóstico y conserva la lógica SEO/GEO. La plataforma no duplica Project State, Studio, Media Library ni Page Registry de cada host: integra sus contratos y guarda referencias, observaciones, evidencias mínimas, campañas y borradores necesarios para el servicio.

El desarrollo de la aplicación pertenece al repo designado de plataforma. Los contratos SEO/GEO, decisiones compartidas y documentación del producto Core se mantienen en RUBIK-SEO-GEO-CORE. Nunca trabajar en WEB-RESTAURACI-N-PREMIUM-DIN-MICA ni en repositorios que no hayan sido designados.

**CORE-9 no se considera terminado** por tener una maqueta o login. El cierre requiere seguridad multi-tenant, persistencia, al menos el flujo manual y los conectores acordados, auditoría, políticas de gasto, pruebas, documentación, piloto revisado y operación sostenible. No se afirmará que una integración está conectada hasta validarla contra el servicio real autorizado.

## 2. Decisiones aprobadas

| Tema | Decisión |
|---|---|
| Repositorio de aplicación | **Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO**; destino expresamente designado por el propietario |
| Autenticación | **Supabase Auth** aprobado |
| Base de datos | Supabase/Postgres es la opción prevista; falta validar proyecto, región, RLS, backups, límites y configuración |
| Hosting inicial | Preferencia por probar Vercel gratuito durante validación; sus términos oficiales indican que Hobby es solo para uso personal/no comercial ([plan Hobby](https://vercel.com/docs/plans/hobby)). No alojar ni comercializar el servicio en Hobby sin verificar un cambio vigente de términos; pasar a un plan compatible antes de uso comercial |
| DNS/CDN | Cloudflare se contempla para DNS/CDN/proxy cuando se configure; no es backend, base de datos ni almacén de secretos |
| Dominio | Comprar/configurar cuando producto y hosting estén listos y revisados |
| Primer proyecto real | SARAHKARENINA.COM después de terminar sus cambios y migración; trabajo separado del alcance actual |
| Orden de proveedores | (1) importación manual, (2) Search Console read-only, (3) Bing Webmaster REST read-only, (4) IndexNow con aprobación humana por cada envío |
| Retención producto | Se aprueba como base la propuesta §4.3 de PLATFORM-SPEC; sujeta a validación legal antes de producción |
| IA | El propietario informa tener tokens de Gemini, ChatGPT y Claude. No se ha comprobado que sean API keys ni sus límites, modelos, términos, regiones, uso de datos o costes |
| Acciones externas | Requieren aprobación humana registrada en el mismo proyecto/scope. Nada se publica, envía o programa por defecto |

Una decisión aprobada de producto no equivale a una credencial, consentimiento OAuth, aceptación de términos, gasto aprobado ni revisión legal.

## 3. División de responsabilidades

### Claude Code — implementación del repositorio asignado

- Trabaja en PLATAFORMA-RUBIK-SEO-GEO solo con el prompt específico de implementación; inspecciona el estado remoto y conserva cambios existentes.
- Propone decisiones técnicas rutinarias (framework, estructura y estrategia de dependencia del Core), las registra en ADR y las implementa de forma reversible con pruebas. No inventa secretos ni elige proveedores/modelos con cargos.
- Implementa fases con límites claros, validaciones, CI y PR revisable. Actualiza el handoff/roadmap de la plataforma al final de cada bloque.
- No trabaja en Restaurantes Premium ni en repositorios distintos de Core y del repo de plataforma designado.
- No fusiona, despliega, publica ni envía comunicaciones externas; no concede OAuth ni consume servicios reales, créditos o dinero salvo instrucción humana explícita y acotada.

### Codex — continuidad, documentación y revisión

- En RUBIK-SEO-GEO-CORE: mantiene decisiones compartidas, contrato del Core, ROADMAP, handoff y revisa cambios de contrato con evidencia.
- En la plataforma: puede auditar el repo asignado, revisar PR/diff, CI, pruebas, seguridad y coherencia con el Core; preparar documentación y prompts; señalar bloqueos o riesgos.
- No puede comprobar API keys, cuotas, facturación, permisos de consola ni DPA privados sin evidencia compartida por el propietario. Puede ayudar a interpretarlos con capturas/valores redactados; nunca pedir ni repetir secretos.
- Ejecuta merges solo cuando el propietario lo solicite expresamente para el PR concreto. No despliega, activa gastos ni envía acciones de clientes.

### Propietario / intervención humana obligatoria

- Controla organizaciones/cuentas, plan y región, MFA, OAuth, permisos de propiedades, secretos y sus rotaciones; configura manualmente el gestor server-side.
- Revisa términos actuales de Vercel, Supabase y proveedores; aprueba presupuesto, tratamiento de datos y DPA/base legal con el asesor correspondiente.
- Confirma cuándo SARAHKARENINA.COM está listo y autoriza acceso/pruebas; revisa visualmente interfaz, copys, permisos y resultados del piloto.
- Da aprobación explícita antes de cualquier gasto, acceso a datos reales, acción externa, publicación, dominio o despliegue a producción.
- Elige/acepta el plan de modelos de IA después de comparar consola API, retención, región y límites. Las suscripciones de ChatGPT/Claude no prueban disponibilidad de API.

## 4. Secuencia de trabajo y criterios de aceptación

Cada etapa se entrega en PR independiente o PRs cortos y ordenados. Ninguna etapa se declara completa sin criterios verificables y CI verde.

### CORE-9.0 · Descubrimiento y base de aplicación

**Tareas de Claude:** inspeccionar únicamente el repo designado de plataforma; preservar archivos; determinar framework y versión por el estado real del repo; documentar arquitectura y ADR; definir una forma fijada y reproducible de consumir el Core (hoy paquete privado/no publicado, sin copiar módulos); proponer contratos de entorno sin valores secretos; levantar app local y CI.

**Criterios:** decisión técnica explicada; dependencia del Core fijada a versión/SHA o mecanismo equivalente reproducible; build, lint/typecheck y pruebas pasan; no hay claves, datos reales, despliegue ni cambios en Core salvo autorización separada.

**Decide el propietario:** cualquier compra, cambio de plan, dominio o servicio de pago. Puede revisar el aspecto visual después de la primera pantalla local.

### CORE-9.1 · Identidad, organizaciones y aislamiento

Implementar Supabase Auth y el modelo tenant/proyecto/roles basado en D-25. La autorización se aplica en servidor y en Postgres RLS; no confiar en ocultar botones en el cliente.

**Criterios:** pruebas negativas entre tenants y proyectos; roles del Core respetados; sesiones y errores seguros; pruebas RLS ejecutadas contra Supabase local o entorno de prueba aislado; instrucciones sin credenciales commiteadas.

**Humano:** crea/configura proyecto y secretos Supabase en su cuenta, activa MFA y revisa permisos. No comparte service-role key.

### CORE-9.2 · Persistencia, auditoría y provenance productiva

Implementar repositorios para los puertos de D-25, historial append-only, consentimiento, políticas y ledger de gasto. Sustituir mocks criptográficos con canonicalización especificada, SHA-256 y KMS/HMAC gestionado en servidor, con keyId, rotación y recuperación. Acordar la frontera para que offpage.measurement verifique resultados rehidratados.

**Criterios:** contrato del mock pasa contra repositorios reales en entorno aislado; migraciones versionadas; aislamiento RLS; tamper tests; claves nunca en logs/DB/código; exportación y borrado probados; recuperación documentada.

**Humano:** aprueba retención legal, ubicación y controles de claves.

### CORE-9.3 · Importación manual y flujo inicial

Empezar sin integraciones externas: carga/entrada explícita de datos, validación, fuente, fecha, estado de revisión y provenance. Mostrar qué es evidencia, estimación, borrador y desconocido.

**Criterios:** datos inválidos/parciales no se convierten en cero o hechos; cada importación queda auditada; exportación/borrado; recorrido probado con fixtures anonimizados.

### CORE-9.4 · Google Search Console read-only

Solo después de decidir consentimiento, propiedad, OAuth/scopes mínimos y secretos server-side. Leer métricas permitidas; no alterar sitios ni automatizar acciones de Search Console.

**Criterios:** consentimiento y scope por proyecto; conexión verificada contra cuenta de prueba autorizada; presupuesto/cuotas; errores 401/403/429; provenance, minimización, desconexión y revocación probados.

**Humano:** concede acceso a propiedad de prueba y OAuth desde consola; no pega secretos en chat/PR.

### CORE-9.5 · Bing Webmaster read-only

REST de solo lectura, con credenciales server-side, políticas y límites equivalentes.

**Criterios:** mismas salvaguardas de CORE-9.4; confirmar API/formatos actuales con documentación oficial al implementarlo; no afirmar datos que el API no devuelve.

### CORE-9.6 · Operación de observación y borradores

Persistir periodos, snapshots, continuidad de campañas, borradores e informes; programar primero solo observación/medición/preparación. Todo trabajo automático debe ser idempotente, auditable, cancelable y respetar consentimiento, presupuesto y scope. No forzar acciones mensuales.

**Criterios:** pruebas de repetición, fallos, caducidad, series no comparables y no duplicación; un trabajo programado no puede publicar, enviar ni generar gasto no autorizado.

### CORE-9.7 · IA asistida

Integrar inicialmente un proveedor/modelo seleccionado por el propietario tras revisar facturación API, calidad, privacidad/retención, región y límites. Entrada solo con evidencia aprobada y minimizada; salida siempre candidata/borrador con fuente y revisión humana.

**Criterios:** sin supuestos de entrenamiento/retención; política de gasto, límites, timeout y fallos; redacción; outputs no respaldados se bloquean o quedan UNKNOWN; no invocar modelos con datos reales antes de DPA/consentimiento y autorización.

**Humano:** elige proveedor, modelo y tope; configura API key en secret store. No exponerla a Claude/Codex ni al navegador.

### CORE-9.8 · IndexNow y acciones externas

IndexNow es la primera operación externa, pero solo tras completar seguridad y revisión de términos. Envío manual por URL/lista explícita y aprobación humana registrada; una respuesta de envío nunca significa indexación. Las demás publicaciones/contactos quedan después y fuera del piloto inicial.

**Criterios:** aprobación por scope, destinos validados, límites/deduplicación, idempotencia y auditoría; pruebas negativas aseguran que sin aprobación no hay llamada externa.

**Humano:** aprueba la operación concreta; revisa el efecto en el sitio.

### CORE-9.9 · Piloto SARAHKARENINA.COM

Solo cuando el propietario confirme que la nueva web está terminada y migrada. Primero validar en staging o propiedades de prueba, comprobar datos reales y ownership; comparar salida y resultados con una persona responsable.

**Criterios:** contrato host documentado, revisión visual humana, privacidad/consentimiento, rollback y exportación probados; ninguna acción de producción sin aprobación.

### CORE-9.10 · Preparación comercial y producción

Antes de vender: decidir alojamiento compatible con uso comercial; revisar disponibilidad, cuotas, backups, restauración, alertas, soporte, dominio, seguridad, DPA, términos de proveedores, retención, exportación/borrado y presupuesto por cliente. Migrar desde plan gratuito si los términos/límites lo requieren.

**Criterios:** checklist de lanzamiento aceptada por propietario; pruebas de seguridad y recuperación; presupuesto y límites probados; despliegue aprobado explícitamente. No se incluye compra de dominio/hosting en autorización de desarrollo.

## 5. Registro de puertas abiertas

| Gate | Responsable | Cuándo |
|---|---|---|
| Framework y estrategia de dependencia Core | Claude propone ADR; propietario revisa si implica coste/compromiso | CORE-9.0 |
| Región/plan Supabase y RLS/backups | Propietario configura; Claude implementa y prueba | Antes de CORE-9.1 |
| Plan/condiciones comerciales Vercel | Propietario verifica términos vigentes; Codex puede resumir fuentes actuales | Antes de publicar o comercializar |
| Credenciales y permisos GSC/Bing/IndexNow | Propietario en consolas; nunca vía chat/repositorio | Antes de cada integración live |
| Proveedor/modelo IA, privacidad, región y límite | Propietario decide; Codex ayuda a comparar; Claude integra tras autorización | CORE-9.7 |
| Base legal/DPA/retención final | Propietario/asesor legal | Antes de datos reales/producción |
| Sarah lista, acceso y revisión de resultados | Propietario | CORE-9.9 |
| Firma de provenance y consumo por offpage | Claude implementa en repo destino; Codex revisa contrato y plantea cambio Core separado si hace falta | Antes de confiar en medición persistida |

## 6. Reglas de continuidad

- Al retomar: leer esta página, PLATFORM-SPEC, Core ROADMAP/HANDOFF y README del repo de plataforma; comprobar rama, SHA, PR, CI y cambios sin commit.
- No asumir que una tarea está hecha por el resumen de un agente: verificar estado remoto y evidencia.
- Una rama y PR por unidad coherente, basados en la rama acordada. No borrar ramas remotas: el propietario pidió conservarlas.
- Mantener en cada repo su documentación local; toda decisión que cambie contratos compartidos también se registra en RUBIK-SEO-GEO-CORE/docs/DECISIONS.md.
- Guardar checkpoints reanudables con etapa, entregables, SHA, pruebas, bloqueos, responsable y siguiente paso.
- Ninguna credencial real, dato de cliente, coste, llamada live, publicación, despliegue o compra se presume autorizada por este plan.
