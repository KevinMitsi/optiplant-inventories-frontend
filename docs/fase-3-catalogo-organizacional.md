# Fase 3 — Catálogo organizacional (Categorías, Transportistas, Proveedores, Unidades de medida)

## Qué se hizo

1. **Tres módulos CRUD nuevos** replicando exactamente el patrón de Sucursales (Fase 2), uno por entidad de `APIDOC.json`:
   - **Categorías** (`features/categories`): código/nombre/descripción, alta/edición reservada a ADMIN, baja lógica (activar/desactivar).
   - **Transportistas** (`features/carriers`): código/nombre/teléfono/correo, mismo esquema de permisos.
   - **Proveedores** (`features/suppliers`): código/razón social/NIT/correo/teléfono, mismo esquema.
   - Cada uno con las cuatro capas completas: dominio (`*.model.ts`, `*.repository.ts` abstracto), infraestructura (DTOs, mapper, `*-http.repository.ts`), aplicación (`search/get/create/update/set-status` use cases) y presentación (`*-list.page.ts` con filtros+paginación, `*-form.page.ts` combinado alta/edición).
2. **Módulo de solo lectura para Unidades de medida** (`features/units-of-measure`): la API no expone alta/edición para este catálogo (`GET /units-of-measure` completo, sin paginar — "conjunto pequeño y estable" según su propia descripción en APIDOC.json), así que no tiene formulario ni `roleGuard`; solo un listado.
3. **Rutas y navegación**: cuatro entradas nuevas en `app.routes.ts` (todas como hijas del shell, lazy-loaded) y en el sidebar de `AppShellComponent` (`NAV_ITEMS`).
4. **DI**: los cuatro repositorios nuevos enlazados en `app.config.ts` junto a los de Sucursales.
5. **Extracción de patrones SCSS compartidos**, motivada directamente por la nueva regla de `CLAUDE.md` (mixins/funciones para garantizar interoperabilidad y evitar repetición) y por tener ya 4 módulos de listado + 4 de formulario con la misma forma:
   - `styles/abstracts/_mixins.scss`: nuevo mixin `responsive-table($breakpoint)` — generaliza el patrón tabla→tarjetas (`data-label` + `::before`) que en la Fase 2 vivía duplicado dentro de `branch-list.page.scss`. Se refactorizó ese archivo para usarlo también.
   - `styles/abstracts/_patterns.scss` (nuevo, añadido al barril `abstracts.scss`): mixins de página completa — `list-header`, `list-filters`, `form-error`, `status-badge`, `row-actions`, `button`, `entity-form` — agrupados en `crud-list` y `crud-form`. Cada `*-list.page.scss` nuevo queda en ~10 líneas (`@include ds.crud-list; .data-table { @include ds.responsive-table; }`) en vez de reescribir ~150 líneas de CSS por módulo.
6. Verificado con `ng build --configuration development`: build limpio (browser + server), sin errores de TypeScript ni de SCSS; los 4 módulos aparecen como chunks lazy independientes.

## Cómo se hizo (decisiones clave)

- **Copiar el patrón de Sucursales al pie de la letra, no reinventar por entidad**: las tres entidades CRUD (Categoría, Transportista, Proveedor) comparten la misma forma en `APIDOC.json` (código inmutable + campos editables + activación/desactivación + búsqueda paginada por `text`/`active`), así que domain/infra/application son mecánicos; la única variación real está en los campos del formulario y de la tabla.
- **Unidades de medida como excepción deliberada, no como CRUD a medias**: en vez de forzar un formulario que la API no soporta, se modela como lo que es — un catálogo de solo lectura, sin `CreateUnitOfMeasureRequest`/`UpdateUnitOfMeasureRequest` en el esquema. Evita construir UI para operaciones que el backend rechazaría.
- **`responsive-table` y `_patterns.scss` extraídos justo ahora, no desde la Fase 2**: con un solo módulo (Sucursales) generalizar habría sido especulativo; con cuatro módulos más la duplicación ya era real y medible (mismo bloque de ~150 líneas de SCSS copiado 4 veces). Es la aplicación concreta de la regla nueva de `CLAUDE.md` sobre mixins/funciones para "asegurar la interoperabilidad... en dispositivos desktop como móviles": el mixin sigue siendo mobile-first (`respond()` por dentro) y ahora un solo lugar corrige el patrón responsivo para los cinco listados (Sucursales incluida).
- **`branch-list.page.scss` refactorizado para consumir el mixin nuevo**: si se hubiera dejado con su copia local, la próxima entidad habría heredado el snippet viejo por copy-paste en vez del compartido — se corrigió en el mismo cambio que introdujo el mixin.
- **`roleGuard([Role.Admin])` en alta/edición de las tres entidades CRUD, ninguno en Unidades de medida**: mismo criterio de la Fase 2 (listado abierto porque otros módulos lo necesitan como referencia — p. ej. un producto necesita elegir categoría/proveedor —, escritura reservada a ADMIN porque son maestros de catálogo).

## Qué sigue (Fase 4 propuesta)

1. **Producto** (`ProductResponse` + `ProductUnit` + factor de conversión + unidad base): la entidad más compleja pendiente — depende de Categoría, Proveedor y Unidad de medida, todos ya modelados. Es el bloqueante real para Inventario.
2. **Lista de precios** (`PriceListResponse` + `product-prices`): depende de Producto.
3. Módulo de **Inventario** por sucursal (`/branches/{branchId}/inventory/*`, entradas/salidas/ajustes/movimientos): núcleo funcional de la app, depende de Producto y Sucursal.
4. Paneles del dashboard con datos reales (`/organizations/{organizationId}/dashboard/*`) sustituyendo el placeholder de `DashboardPage`.
5. Pruebas unitarias: `ng test` sigue bloqueado en este entorno por falta de Chrome (`CHROME_BIN` no configurable aquí); pendiente para un entorno con navegador disponible.
