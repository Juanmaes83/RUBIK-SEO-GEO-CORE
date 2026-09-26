# CORE-9 · Platform Layer: especificación revisable

**Fecha:** 26/09/2026 · **Decisión:** [D-25](../DECISIONS.md) · **Contratos y mocks:** `src/rubik-seo-geo-platform-contracts.js` (`./platform-contracts`) · **Pruebas:** `tests/core-9-platform-contracts.test.cjs`

**Estado:** preparación dentro de RUBIK-SEO-GEO-CORE, sin plataforma funcional. Según D-24 y [`AUTONOMOUS-CONTINUATION.md`](../AUTONOMOUS-CONTINUATION.md) etapa 3, este documento y sus contratos son artefactos para revisar.

**Queda fuera:**

- crear o modificar otro repositorio;
- backend real, autenticación, secretos o storage conectado;
- proveedores o modelos live, programación real y despliegue.

Todo eso exige autorización y un proyecto destino explícitos (§10).

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
│ CORE-9 Platform (proyecto destino por decidir)                │
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
- **Verificación:** el resultado emitido se firma (`signProvenance`) antes de persistirlo; al leerlo, `verifyProvenance` restablece la verificación. La adaptación de `offpage.measurement` para aceptar provenance firmada se decidirá en su PR, con una decisión propia.

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

### 4.3 Retención propuesta (por confirmar con el propietario)

- **Auditoría y consumo:** mientras exista el tenant, más el plazo legal.
- **Snapshots y series:** mientras dure el servicio del proyecto.
- **Borradores rechazados o caducados:** 90 días.
- **Evidencia enviada a modelos:** no se conserva más allá de la respuesta, salvo en el registro de auditoría minimizado.
- **Cuando termina el servicio:** exportación completa y borrado a petición del cliente.

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

## 6. Threat model (resumen)

| Activo | Amenaza | Mitigación (contrato o prueba) |
|---|---|---|
| Datos de un cliente | Acceso de otro tenant | `scope` en todo; `authorize` exige pertenencia; el repositorio indexa por `tenant/project` (prueba de aislamiento). En producción, además, row-level security en la base de datos. |
| Credenciales de proveedor | Fuga en logs, entradas o auditoría | `secretRef` rechaza valores; CORE-7 rechaza secretos en la entrada; la auditoría redacta y rechaza claves sensibles. |
| Verificación de datos | Un objeto falsificado o una caché alterada pasan por verificados | `isTrustedResult` (CORE-8); `signProvenance`/`verifyProvenance` con hash de datos; firma KMS/HMAC en el servidor. |
| Reputación del cliente | Envío o publicación sin permiso, outreach masivo, reseñas manipuladas | La IA no transiciona; `execute-approved-action` exige aprobación humana en el scope; los trabajos no pueden tener efectos externos; los borradores de CORE-8.1 no son enviables; `outreachBatchCheck`; reseñas neutrales. |
| Presupuesto | Gasto no autorizado o bucles | `spendPolicy` finita, `toProviderBudget` → `BUDGET_EXCEEDED` en CORE-7 y `needsConfirmation`. |
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

## 8. Plan de implementación (cuando exista autorización)

1. **Proyecto destino y decisiones de base (§10):** repositorio, hosting, autenticación, base de datos y gestor de secretos. *Aceptación:* decisión registrada y threat model revisado.
2. **Esqueleto server-side:** autenticación, `scope`/`authorize` en cada endpoint y auditoría. *Aceptación:* pruebas de aislamiento entre tenants y de auditoría.
3. **Repositorios** que implementen `REPOSITORY_PORTS` con append-only real. *Aceptación:* las pruebas de contrato del mock pasan contra la base de datos real en un entorno aislado.
4. **Un primer conector de solo lectura y gratuito**, con secretos en el gestor y provenance firmada. *Aceptación:* `CONNECTED` solo con verificación real. Candidatos: Search Console o el puente OpenSEO, que antes debe validar `whoami`, `statusVocabulary` y `get_audit_pages` contra su instancia.
5. **Trabajos de medición y borrador** (`jobSpec`) con política de gasto.
6. **Aprobaciones y pasarela de salida** para acciones externas, con registro por destinatario.
7. **Proveedores de pago y modelo de IA:** solo tras decidir proveedor, retención de datos, tarifas y presupuesto.

## 9. Costes y riesgos

- **Conocidos:** DataForSEO y los modelos de IA son de pago (`paid` en el catálogo); Search Console, Bing Webmaster e IndexNow tienen cuotas sin coste directo. **Tarifas: por averiguar**; el Core no conoce precios (`estimatedUsd:null`).
- **Por averiguar:** hosting, base de datos, gestor de secretos o KMS, coste por unidad de cada proveedor, retención y DPA del proveedor de IA, y el esfuerzo de validar OpenSEO contra una instancia real.
- **Riesgos:**
  - dependencia de proveedores de métricas propietarias;
  - cambios de API y de términos de servicio;
  - la variabilidad de los motores generativos (la hipótesis de repeticiones necesarias sigue abierta);
  - las obligaciones RGPD al tratar datos de clientes y de terceros.

## 10. Bloqueos: preguntas para el propietario

La implementación no puede continuar hasta responder:

1. **Proyecto destino:** ¿en qué repositorio o proyecto se construye la plataforma? No se creará ni se tocará ningún otro repositorio sin autorización expresa.
2. **Infraestructura:** hosting o cloud, base de datos (con row-level security), gestor de secretos o KMS y proveedor de autenticación.
3. **Proveedores:** cuáles se activan primero, con qué cuentas y con qué presupuesto mensual por tenant.
4. **Modelo de IA:** proveedor, modelo, región, retención de datos y límites de gasto.
5. **Legal:** base legal y DPA para datos de clientes y de terceros, y política de retención (§4.3).
6. **Primer host:** qué producto anfitrión se integra primero, y quién valida su contrato (CORE-2/4/5 siguen pendientes de host).
