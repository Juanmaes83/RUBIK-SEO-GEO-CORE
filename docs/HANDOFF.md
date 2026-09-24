# Handoff — extracción de Rubik SEO/GEO Core

**Fecha:** 24/09/2026 · **Rama:** `feat/seo-geo-core-extraction` (desde `main@c384767`) · **Fuente:** `WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a` (solo lectura)

## Hecho

1. **Verificación del fuente.** PRs #44–#57 en estado MERGED en GitHub. `origin/main@388e48a` es el estado vigente. El checkout local del fuente está en `feat/seo-geo-hardening-c-mobile-performance` y no se tocó: todo se leyó con `git show` y `git archive`.
2. **Extracción.** Los 7 módulos Core se copiaron sin cambios (blob idéntico). El materializer se dividió en `src/` (Core) y `hosts/restaurant/` (pintado del HOME premium). Los tests A–E y Hardening A/B se adaptaron a fixtures.
3. **Paridad con Restaurant:**
   - blob ids idénticos en los módulos;
   - materializar con el `index.html` real y el estado LÚMINA da 0 diferencias (6 ficheros × preview/production) entre el script fuente y Core + host;
   - el test `core-source-parity` compara `publish()` y `preview()` con el golden generado por los módulos fuente.
4. **Independencia:** `npm run verify` da 73/73 tests en Node 24.14.1 y en Node 20.20.2 (`npx node@20`). El test `core-independence` comprueba que no hay imports fuera de `src/` ni storage, que los 7 adapters están registrados y que funciona un host genérico no-Restaurant.
5. **CI:** `.github/workflows/core-ci.yml`, con matriz Node 20 y 22, syntax, tests y smoke del CLI.
6. **Documentación:** README, `ARCHITECTURE`, `HOST-INTEGRATION-CONTRACT`, `ROADMAP`, `DECISIONS` (D-01…D-08), `PROVENANCE` y los contratos heredados en `docs/upstream/`, con los estados reconciliados.

## Pendiente

- **La CI no se ha ejecutado en GitHub.** Solo se ha validado en local. La rama no está publicada; hace falta push y PR.
- Acoplamientos del host que siguen dentro del Core (D-07): el bootstrap navegador de `core.js`, `intelligence.pages()` vía global y el vertical por defecto de Release E.
- Restaurantes Premium aún usa su propia copia de los módulos (CORE-4).
- Las conexiones externas de Release C/E dependen de la Platform Layer (backend, auth y secretos).

## Siguiente tarea concreta

**CORE-1:** publicar `feat/seo-geo-core-extraction`, abrir el PR contra `main`, comprobar que `core-ci` sale en verde en Node 20 y 22, hacer la revisión humana y fusionar. Después, **CORE-2**: mover el bootstrap navegador de `core.js` a un loader del host, con un PR coordinado en el repo de Restaurantes.

## Cómo retomar

```bash
git switch feat/seo-geo-core-extraction
npm run verify
```

Para volver a comprobar la paridad con el fuente, ver la cabecera de `scripts/generate-source-golden.cjs` y `docs/PROVENANCE.md`.
