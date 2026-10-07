# CORE-9 · Platform Layer: especificación revisable

**Fecha:** 26/09/2026 · **Decisión:** [D-25](../DECISIONS.md) · **Contratos y mocks:** `src/rubik-seo-geo-platform-contracts.js` (`./platform-contracts`) · **Pruebas:** `tests/core-9-platform-contracts.test.cjs`

**Estado (28/09/2026):** preparación documental y contractual cerrada en RUBIK-SEO-GEO-CORE. La aplicación se implementará exclusivamente en `Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO`. Las decisiones aprobadas y las puertas abiertas están en [EXECUTION-PLAN.md](EXECUTION-PLAN.md).

**Límite de repositorio y ejecución:**

- Este documento y los contratos/mocks de `RUBIK-SEO-GEO-CORE` no son la aplicación.
- La aplicación se construirá en el repositorio expresamente designado `Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO`; este cambio documental no modifica ese repo.
- La designación no autoriza por sí sola a añadir credenciales, incurrir en gasto, conceder OAuth, conectar datos de clientes ni desplegar en producción.
- No acceder ni modificar `WEB-RESTAURACI-N-PREMIUM-DIN-MICA` ni ningún otro repositorio. SARAHKARENINA.COM será piloto cuando el propietario confirme que terminó cambios y migración.

## 1. Objetivo

CORE-9 es el plano de control multi-proyecto que ejecuta en servidor lo que el Core define como contratos puros:

- **Conectores y datos:** conecta proveedores (CORE-7/7.1) con credenciales server-side y persiste snapshots, información aprobada, historial de periodos, acciones, borradores y auditoría (CORE-8/8.1).
- **Trabajos:** programa solo trabajos de observación, medición y borrador.
- **Acciones externas:** ejecuta envíos o publicaciones únicamente tras una aprobación humana vigente y registrada.

**Lo que no cambia:** el Project State, el Studio, la Media Library y el Page Registry canónicos siguen en cada host (D-05, D-20). La plataforma no los duplica: guarda referencias y resultados de servicio.

## 2. Requisitos

### 2.1 Funcionales

| ID | Requisito | Contrato del Core que lo soporta |
|---|---|---|
| F1 | Tenants (agencias) y proyectos (clientes), con miembros y roles | `scope`, `authorize`, `ROLES`, `MATRIX` |
| F2 | Conectores server-side por proyecto, con consentimiento | `CONNECTORS`, `consentRecord`, `hasConsent`, `providers.runProviderRequest` |
| F3 | Presupuesto por tenant, proveedor y mes, con confirmación humana del coste | `spendPolicy`, `spendCheck`, `toProviderBudget`, `recordSpend` (alimentan el `budget` de CORE-7) |
| F4 | La verificación de proveedores se conserva tras persistir | `signProvenance`, `verifyProvenance` (sobre `providers.isTrustedResult`) |
| F5 | Historial off-page por periodo, acciones y borradores | `REPOSITORY_PORTS`; `offpage.*` y `offpageOps.*` como lógica |
| F6 | Aprobación humana antes de cualquier acción externa | `offpage.transition` más `authorize('execute-approved-action')` con la aprobación en el mismo scope |
| F7 | Trabajos programados de observación, medición y borrador | `jobSpec` (los efectos externos no son programables) |
| F8 | Auditoría de acciones, accesos denegados y consumos | `auditEvent`, `verifyAuditChain` |
| F9 | Publicación o envío a través del canal del host o de una pasarela de salida | Fuera del Core: solo tras F6, con un registro por destinatario |

### 2.2 No funcionales

- **Aislamiento:** ninguna lectura cruza tenants. Toda consulta lleva `tenantId` y `projectId`, y se aplica en la capa de datos (no solo en la API).
- **Secretos:** solo hay referencias (`secretRef`) en datos y registros. Los valores viven en un gestor de secretos o KMS y solo los resuelve el conector en el servidor.
- **Privacidad:** minimización (`offpage.minimize`, `prepareEvidence`), finalidad por consentimiento, retención definida (§4.3) y exportación y borrado por proyecto.
- **Coste:** nunca una operación de pago sin política finita, presupuesto derivado y confirmación humana si supera el umbral.
- **Trazabilidad:** cadena de auditoría append-only con hash criptográfico en el servidor. El FNV del mock no sirve para producción.
- **Honestidad de datos:** se heredan todas las reglas de CORE-7/8/8.1: `null` frente a `0`, `NOT_VERIFIED` por defecto, candidatas no canónicas y sin promesas.

## 3. Arquitectura de referencia

```text
┌──────────── Hosts (Restaurantes, Inmobiliaria, …) ───────────┐
│ Project State · Studio · Media Library · Page Registry        │  (canónicos, no se duplican)
└───────────────┬──────────────────────────────┬───────────────┘
                │ API autenticada (server)      │ canal propio de publicación
┌───────────────▼──────────────────────────────▼───────────────┐
│ CORE-9 Platform (Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO)                │
│  Auth/roles ── authorize()      Aprobaciones ── offpage.transition │
│  Job runner ── jobSpec()        Pasarela de salida (solo aprobado) │
│  Conectores ── transport/mcp ── Secret store/KMS (secretRef)   │
│  Repositorios (REPOSITORY_PORTS) · Auditoría · Spend ledger     │
└───────────────┬──────────────────────────────────────────────┘
                │ llamadas en proceso (librería pura)
┌───────────────▼──────────────────────────────────────────────┐
│ RUBIK-SEO-GEO-CORE: core · providers · offpage · offpage-ops ·│
│ platform-contracts (sin red, secretos ni storage)             │
└──────────────────────────────────────────────────────────────┘
```

- **El Core es una librería pura** que el servidor importa: la plataforma no reimplementa reglas.
- **Los conectores implementan** el `transport` de CORE-7 (`{kind:'live', request}`) o el cliente MCP de CORE-7.1 (`{kind:'live', callTool}`).
- **Verificación:** el resultado emitido se firma (`signProvenance`) antes de persistirlo. La firma cubre status, conexión, `partial`, errores, coste, provenance y el digest de los datos.
  - Al leerlo, `verifyProvenance` exige los datos recuperados, detecta cambios en datos, firma o sobre, y devuelve el sobre reconstruido desde la firma.
  - **Frontera (D-28):** `offpage.measurement` acepta el resultado reconstruido por `verifyProvenance` solo con el módulo `platform` inyectado (`trust:'SIGNED_PROVENANCE'`); las copias siguen como `UNTRUSTED_ENVELOPE`. El digest productivo (`sha256`) se inyecta y queda firmado (`dataHashAlg`).
  - **A sustituir en producción:** la forma canónica `stable()` (por ejemplo por RFC 8785 JCS), el digest `fnv()` (por SHA-256) y el firmante de prueba (por KMS/HMAC con `keyId` y rotación).

## 4. Límites de datos y propiedad

### 4.1 Qué guarda cada parte

| Dato | Dónde vive | Notas |
|---|---|---|
| Project State, páginas, medios | Host | La plataforma solo guarda identificadores o URLs públicas |
| Información aprobada (`factBook`) | Plataforma, por proyecto | Con quién la aprobó y cuándo, fuente y permisos |
| Snapshots, series GEO, historial de periodos | Plataforma | Resultados de proveedor con provenance firmada |
| Acciones, aprobaciones, borradores | Plataforma | Historial inmutable; los borradores nunca se publican solos |
| Direcciones de contacto de terceros | No se guardan en el Core; en la plataforma, solo si hay base legal | Por defecto solo la vía pública y su URL de origen |
| Datos de autores de reseñas | No se guardan | Ya eliminados en CORE-8.1 |
| Secretos | Gestor de secretos o KMS | Solo `secretRef` fuera de él |

### 4.2 Clases de datos (campo `dataClass` de `CONNECTORS`)

`client-analytics` (GSC, Bing, GA4) · `third-party-estimates` (métricas de proveedores de pago; siempre etiquetadas como estimación) · `crawl-results` · `public-urls` · `minimised-evidence` (lo único que llega a un modelo).

### 4.3 Retención base aprobada como política de producto (pendiente de validación legal)

- **Auditoría y consumo:** mientras exista el tenant, más el plazo legal.
- **Snapshots y series:** mientras dure el servicio del proyecto.
- **Borradores rechazados o caducados:** 90 días.
- **Evidencia enviada a modelos:** no se conserva más allá de la respuesta, salvo en el registro de auditoría minimizado.
- **Cuando termina el servicio:** exportación completa y borrado a petición del cliente.

El propietario aprueba esta base como decisión de producto. No equivale a asesoramiento jurídico, determinación de base legal, DPA firmado ni validación de plazos obligatorios. Antes del uso comercial, validar obligaciones aplicables, excepciones de conservación y procedimiento de borrado.

## 5. Permisos

| Rol | Puede | Nunca |
|---|---|---|
| owner | Todo lo de gestión del tenant, incluidos miembros, conectores y referencias de secretos | Ejecutar acciones externas (lo hace `system` con aprobación) |
| account-manager | Leer, redactar, proponer, revisar, aprobar acciones externas, confirmar coste | Gestionar secretos o miembros |
| analyst | Leer, redactar, proponer | Aprobar |
| client-approver | Leer, aprobar información y acciones externas de su proyecto | Redactar o confirmar coste |
| viewer | Leer | — |
| system | Leer y ejecutar acciones **con aprobación humana del mismo scope** | Aprobar |
| ai | Redactar y proponer | Aprobar, ejecutar, confirmar coste, tocar secretos o leer fuera de lo minimizado |

La matriz exacta es `MATRIX` en el módulo de contratos y está cubierta por pruebas.

- **Aprobadores** (`APPROVER_ROLES`): los roles con `approve-external-action` en `MATRIX` (owner, account-manager, client-approver). La ejecución exige un aprobador con identidad, uno de esos roles, una fecha válida y el mismo scope.
- **Frontera:** `authorize()` evalúa identidades y aprobaciones que el servidor ya autenticó y cargó. No es autenticación ni frontera de seguridad por sí misma.

## 6. Threat model (resumen)

| Activo | Amenaza | Mitigación (contrato o prueba) |
|---|---|---|
| Consentimiento | Fechas malformadas interpretadas como indefinidas | `consentRecord` rechaza fechas inválidas (`INVALID_DATE`) y `hasConsent` ignora registros no canónicos. |
| Datos de un cliente | Acceso de otro tenant | `scope` en todo; `authorize` exige pertenencia; el repositorio indexa por `tenant/project` (prueba de aislamiento). En producción, además, row-level security en la base de datos. |
| Credenciales de proveedor | Fuga en logs, entradas o auditoría | `secretRef` rechaza valores; CORE-7 rechaza secretos en la entrada; la auditoría redacta y rechaza claves sensibles. |
| Verificación de datos | Un objeto falsificado o una caché alterada pasan por verificados | `isTrustedResult` (CORE-8); `signProvenance`/`verifyProvenance` con hash de datos; firma KMS/HMAC en el servidor. |
| Reputación del cliente | Envío o publicación sin permiso, outreach masivo, reseñas manipuladas | La IA no transiciona; `execute-approved-action` exige aprobación humana en el scope; los trabajos no pueden tener efectos externos; los borradores de CORE-8.1 no son enviables; `outreachBatchCheck`; reseñas neutrales. |
| Presupuesto | Gasto no autorizado, bucles o registros manipulados | `spendPolicy` finita, `toProviderBudget` → `BUDGET_EXCEEDED` en CORE-7 y `needsConfirmation`. `recordSpend` rechaza unidades negativas o peticiones no enteras, y un ledger con entradas inválidas da presupuesto 0 (`INVALID_LEDGER`). |
| Integridad del historial | Borrado o edición retroactiva | Puertos append-only; `verifyAuditChain` detecta cambios de hash, orden y enlace. |
| Privacidad de terceros | Datos personales en evidencia, prompts o borradores | `prepareEvidence`, guard `PERSONAL_DATA_IN_REQUEST`, sin direcciones de contacto ni datos de autores; consentimiento `ai-processing`. |
| Cumplimiento de plataformas | Scraping o tácticas prohibidas | `METHOD_NOT_ALLOWED` en GEO y trabajos; `PROHIBITED_TACTICS` (CORE-8). |

**Riesgos residuales:**

- La autenticación, la gestión de sesiones, la seguridad de red y la cadena de suministro pertenecen al proyecto destino y no están cubiertas aquí.
- El hash FNV y el firmante de las pruebas son mocks, no controles criptográficos.

## 7. Esquema lógico propuesto (documentación, no migraciones)

- `tenants(id, name, created_at)` · `projects(id, tenant_id, host_ref, vertical, created_at)` · `memberships(user_id, tenant_id, project_id|*, role)`
- `secret_refs(ref, tenant_id, provider, rotation_days)`: **sin columna de valor**.
- `connectors(id, project_id, connector, secret_ref, status, verified_at)` · `consents(project_id, purpose, granted_by, granted_at, expires_at, revoked_at)`
- `provider_results(id, project_id, provider, operation, status, signed_payload, signature, key_id, data_hash, data)`
- `snapshots(id, project_id, period, body)` · `fact_book(project_id, fact_id, body, status)` · `period_ledger(project_id, seq, period, body)` (append-only)
- `actions(id, project_id, state, body)` · `action_history(action_id, seq, from, to, at, actor_role, actor_id, reason)` (append-only) · `drafts(id, project_id, kind, status, body)`
- `spend_policies(tenant_id, provider, monthly_units, monthly_requests, confirm_above_units)` · `spend_ledger(tenant_id, provider, period, units, requests, at)` (append-only)
- `audit_events(tenant_id, project_id, seq, at, actor_role, actor_id, action, target, outcome, details, prev_hash, hash)` (append-only)
- `jobs(id, project_id, type, cadence, paid, spend_policy_ref)`

Todas las tablas llevan `tenant_id`, directamente o a través de `project_id`, con row-level security.

## 8. Plan de implementación

La secuencia operativa, las responsabilidades y los criterios de aceptación están en [EXECUTION-PLAN.md](EXECUTION-PLAN.md). Resumen:

1. Cerrar decisiones técnicas abiertas (framework, forma de consumir el Core, región/planes concretos, límites de gasto y tratamiento de datos por IA).
2. Crear el esqueleto en `PLATAFORMA-RUBIK-SEO-GEO`, con Supabase Auth y límites server-side; inicialmente sin proveedores ni modelos reales.
3. Implementar aislamiento por tenant, persistencia, auditoría, consumo del Core y provenance productiva mediante criptografía del servidor.
4. Integrar en el orden aprobado: importación manual, Search Console read-only, Bing Webmaster REST read-only e IndexNow con aprobación humana por envío.
5. Implementar trabajos de observación/borradores y aprobaciones; añadir IA tras acordar proveedor/modelo, privacidad y presupuesto.
6. Hacer piloto SARAHKARENINA.COM cuando el propietario confirme que la web está terminada y migrada.
7. Revisar hosting, términos, seguridad, privacidad, backups, recuperación y costes antes de dominio y despliegue comercial. No asumir que Vercel Hobby permite el uso previsto.

## 9. Costes y riesgos

- **Conocidos:** DataForSEO y los modelos de IA son de pago (`paid` en el catálogo); Search Console, Bing Webmaster e IndexNow tienen cuotas sin coste directo. **Tarifas: por averiguar**; el Core no conoce precios (`estimatedUsd:null`).
- **Por averiguar:** hosting, base de datos, gestor de secretos o KMS, coste por unidad de cada proveedor, retención y DPA del proveedor de IA, y el esfuerzo de validar OpenSEO contra una instancia real.
- **Riesgos:**
  - dependencia de proveedores de métricas propietarias;
  - cambios de API y de términos de servicio;
  - la variabilidad de los motores generativos (la hipótesis de repeticiones necesarias sigue abierta);
  - las obligaciones RGPD al tratar datos de clientes y de terceros.

## 10. Decisiones del propietario y cuestiones abiertas

### 10.1 Aprobado y registrado

Las decisiones para planificar la siguiente etapa están en [EXECUTION-PLAN.md](EXECUTION-PLAN.md) y D-26:

- Repositorio de aplicación: `Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO`. El trabajo de este PR se limita a RUBIK-SEO-GEO-CORE; la aplicación tendrá su propio trabajo en el repo designado.
- Supabase Auth aprobado. Supabase/Postgres es la opción prevista para autenticación y base de datos; faltan concretar plan, región, RLS, backups y gestor de secretos.
- Vercel: preferencia de empezar con plan gratuito para validación. No se presume que Hobby permita el uso comercial previsto; revisar términos y límites vigentes antes de publicar o comercializar; la documentación oficial actual indica que Hobby se limita a uso personal/no comercial ([plan Hobby](https://vercel.com/docs/plans/hobby)). Un cambio de plan posterior es técnicamente posible, pero no elimina cuotas, pausas ni restricciones previas.
- Cloudflare se contempla para DNS/CDN/proxy cuando se configure; no sustituye backend, base de datos ni gestor de secretos.
- Dominio y hosting comercial se posponen hasta que la aplicación esté lista y revisada.
- Primer piloto: SARAHKARENINA.COM, después de que el propietario termine cambios y migración en su trabajo separado.
- Orden inicial: importación manual; Search Console read-only; Bing Webmaster REST read-only; IndexNow al final, con aprobación humana por envío.
- Retención §4.3 aprobada como base de producto, pendiente de revisión jurídica antes de producción.
- El propietario informa tener tokens de Gemini, ChatGPT y Claude. No se ha verificado que sean API keys ni planes, cuotas, facturación, disponibilidad de modelos, retención o presupuesto. Una suscripción de chat no demuestra acceso API.

### 10.2 Decisiones e intervenciones aún pendientes

- Framework/lenguaje y arquitectura UI/server; no se presume Next.js ni otra opción.
- Cómo consumir `@rubik/seo-geo-core`, que hoy no está publicado: referencia Git fijada a SHA, workspace u otra distribución mantenible sin duplicar lógica.
- Organización/proyecto y región/planes concretos de Supabase/Vercel; RLS, backups, límites y almacén de secretos/KMS. No se han inspeccionado dashboards.
- Modelos/API habilitados, región, retención y límites de Gemini/OpenAI/Anthropic; revisar las consolas sin compartir secretos.
- OAuth y permisos para propiedades de Search Console/Bing cuando toque; IndexNow key y endpoint al implementar esa integración.
- Revisión jurídica de base legal, DPA, privacidad de terceros, retención final, exportación y borrado.
- Validación de OpenSEO/MCP y del host Sarah solo cuando estén disponibles y el propietario autorice cuentas y pruebas.
- Sustituir mocks por serialización canónica, SHA-256 y KMS/HMAC con rotación; decidir cómo `offpage.measurement()` aceptará provenance firmada antes de confiar en mediciones persistidas (D-25 §8).

Esto no bloquea estructura, interfaz local ni pruebas mock. Sí bloquea credenciales reales, datos de clientes, IA con información real, acciones externas, uso comercial y producción hasta cerrar los gates respectivos.
