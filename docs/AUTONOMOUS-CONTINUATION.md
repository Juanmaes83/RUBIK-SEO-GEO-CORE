# Continuidad autónoma de CORE-9

**Estado (28/09/2026):** CORE-8, CORE-8.1 y la preparación de CORE-9 están fusionadas en RUBIK-SEO-GEO-CORE. La aplicación aún no existe. El propietario designó [Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO](https://github.com/Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO) y aprobó las decisiones iniciales en [CORE-9/EXECUTION-PLAN.md](core-9/EXECUTION-PLAN.md) y D-26. El estado del Core está en [ROADMAP.md](ROADMAP.md); último checkpoint: [HANDOFF.md](HANDOFF.md).

## Aprobado

- Aplicación: repo Juanmaes83/PLATAFORMA-RUBIK-SEO-GEO.
- Identidad: Supabase Auth.
- Vercel gratuito como preferencia para validar, sujeto a verificar términos, elegibilidad comercial y cuotas antes de publicar.
- Cloudflare se contempla para DNS/CDN/proxy; no reemplaza backend, DB ni gestor de secretos.
- Sin compra de dominio/hosting comercial hasta que la aplicación esté lista.
- Primer piloto: SARAHKARENINA.COM después de terminar cambios y migración.
- Integraciones: importación manual; Google Search Console read-only; Bing Webmaster REST read-only; IndexNow con aprobación humana por cada envío.
- Retención de producto §4.3 aprobada, pendiente de revisión legal antes de producción.
- El usuario informa tener tokens Gemini, ChatGPT y Claude; no se confirmó que sean credenciales API ni sus cuotas, modelos, gasto, términos o retención.

## Qué puede avanzar Claude Code

En el repo de plataforma designado, con prompt específico, Claude puede inspeccionar, decidir/documentar opciones técnicas reversibles y construir por PR fases locales, mockeadas y sin coste: bootstrap, arquitectura, consumo reproducible del Core, UI inicial, pruebas, auth/RLS en entorno local/aislado y contratos de persistencia. Mantener checkpoints y criterios de aceptación.

Claude no fusiona PRs, despliega, publica, envía outreach, inicia llamadas live, accede a datos de clientes ni incurre en gasto. No usa claves reales ni pide que se peguen en el prompt. No trabaja en repositorios distintos de Core y la plataforma designada; WEB-RESTAURACI-N-PREMIUM-DIN-MICA queda prohibido.

## Qué hace Codex

Codex puede revisar el estado GitHub, documentación, PR, CI, pruebas, seguridad y compatibilidad con el Core; mantener roadmap/decisiones compartidas en el Core; explicar opciones actuales de proveedores con fuentes oficiales; preparar prompts y revisar diffs. No inspecciona credenciales privadas o billing sin evidencia del propietario. Nunca solicita ni reproduce API keys.

## Qué requiere al propietario / revisión humana

- Crear/configurar proyectos y planes desde sus cuentas; activar MFA; elegir regiones; conceder OAuth mínimo; cargar secretos directamente en almacén server-side.
- Verificar términos de Vercel, cuotas y elegibilidad comercial; decidir gasto, modelos API y límites.
- Validar base legal, DPA y retención con asesoría adecuada antes de datos reales.
- Facilitar SARAH cuando esté migrada; revisar visualmente interfaz y resultados; aprobar acciones que afecten a cliente, sitio o tercero.
- Autorizar explícitamente gasto, llamadas reales, despliegue, dominio y producción.

## Próxima tarea recomendada

Comenzar CORE-9.0 según [EXECUTION-PLAN.md §4](core-9/EXECUTION-PLAN.md): inspección read-only del estado del repo PLATAFORMA-RUBIK-SEO-GEO, documentar una ADR de framework/dependencia del Core y preparar una base local con CI y mocks solo después de preservar lo existente. No se necesitan credenciales para este bloque. No integrar Supabase hosted, proveedores, IA o datos de clientes todavía.

## Reglas de continuidad

- Al retomar, comprobar refs remotas, PRs abiertos, HEAD, CI y cambios sin commit; no confiar solo en este resumen.
- Ejecutar validaciones por repo y anotar comandos/resultados exactos.
- Una unidad coherente por rama/PR; esperar revisión humana y autorización de merge.
- No borrar ramas remotas: el propietario pidió conservarlas.
- Actualizar los documentos locales del repo correspondiente. Decisiones que alteren contratos compartidos se reflejan también en RUBIK-SEO-GEO-CORE/docs/DECISIONS.md.
