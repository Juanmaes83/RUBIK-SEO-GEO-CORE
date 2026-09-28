# Continuidad autónoma del Core

**Estado al 28/09/2026:** CORE-8, CORE-8.1 y la preparación documental/contractual de CORE-9 ya están fusionadas en main@5e90362. Esta guía reemplaza el plan de ejecución anterior, ya completado. La única fuente de estado es [ROADMAP.md](ROADMAP.md); el último checkpoint está en [HANDOFF.md](HANDOFF.md).

## Fases completadas

- **CORE-8 / PR #12:** merge f5605ca3b0bd1c6f64fb8f4f437fa385121a4097; CI del HEAD 6e6afb1, run 36400713406, 281/281 en Node 20 y 22.
- **CORE-8.1 / PR #13:** merge a08007361f2e6c38207deedde80c2a0f1051b395; CI del HEAD 039a92a, run 36401250044, 298/298 en Node 20 y 22.
- **CORE-9 preparación / PR #14:** merge 5e90362b74b951740953c26926a4755c4d6bbad9; CI del HEAD df0b003, run 36401906196, 314/314 en Node 20 y 22. CI post-merge de main, run 36402558674, verde en ambas versiones.

No hubo despliegue ni conexión a servicios reales, cuentas, modelos o secretos. Los hashes y firmas de prueba de CORE-9 no son criptografía productiva. CORE-8 tampoco puede declarar verificada la observación generativa mientras CORE-7 no tenga una operación compatible.

## Siguiente hito: decisiones del propietario para implementar CORE-9

La especificación está en [core-9/PLATFORM-SPEC.md §10](core-9/PLATFORM-SPEC.md). Antes de programar una plataforma real hay que decidir y registrar:

1. Proyecto/repositorio destino y autorización explícita para trabajar ahí.
2. Hosting, autenticación, base de datos con aislamiento por tenant y gestor server-side de secretos/KMS.
3. Proveedores iniciales, permisos/cuentas y presupuesto por tenant.
4. Modelo/proveedor de IA, región, retención y límites de gasto.
5. Base legal, DPA y retención de datos de clientes/terceros.
6. Primer producto host y responsable de validar su contrato.

Las claves o tokens de API futuros se guardan solo en el gestor de secretos del backend, con referencias desde la plataforma. Nunca se incluyen en el Core, el navegador, Project State o Git.

Hasta tener esas decisiones y autorización, no inventar credenciales ni iniciar integraciones reales, persistencia, trabajos, gasto o despliegue. Se puede seguir atendiendo trabajo Core-only independiente si el propietario lo indica. CORE-2/4/5 requieren validar/adoptar un host y no se simulan dentro de este repo.

## Reglas para Claude Code

- Trabajar exclusivamente en Juanmaes83/RUBIK-SEO-GEO-CORE, salvo autorización nueva y explícita para el proyecto destino; nunca acceder a WEB-RESTAURACI-N-PREMIUM-DIN-MICA ni a otros repositorios.
- Al reanudar, leer CLAUDE.md, [docs/README.md](README.md), [ROADMAP.md](ROADMAP.md), y el final de [HANDOFF.md](HANDOFF.md); verificar HEAD, PRs y CI antes de continuar.
- Ejecutar npm run verify si se modifica el Core. Actualizar ROADMAP/HANDOFF con SHA, resultados y siguiente paso real.
- Usar ramas y PRs para cambios. Claude no fusiona, despliega, publica ni envía acciones externas; espera instrucciones del propietario para esos pasos.
- No declarar conexión o medición verificada sin evidencia real autenticada. No colocar secretos ni datos personales innecesarios en código, prompts o logs.
