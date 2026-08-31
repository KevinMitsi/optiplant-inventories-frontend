# Fase 4 — Producto (catálogo, presentaciones y unidad base)

## Qué se hizo

1. **Módulo CRUD de Producto** (`features/products`), la entidad más compleja pendiente de la Fase 3: código/SKU inmutable, nombre, categoría (opcional), código de barras (único, opcional), descripción, baja lógica (activar/desactivar) — mismo patrón de capas que Categorías/Transportistas/Proveedores:
   - Dominio (`core/domain/models/product.model.ts`, `core/domain/repositories/product.repository.ts`).
   - Infraestructura (`core/infrastructure/http/dtos/product.dto.ts`, `.../mappers/product.mapper.ts`, `.../repositories/product-http.repository.ts`).
   - Aplicación (`core/application/products/*.usecase.ts`): búsqueda paginada, alta, edición, activar/desactivar.
   - Presentación (`features/products/product-list`, `features/products/product-form`).
2. **Gestión de presentaciones (`ProductUnit`)**, la parte que no tiene equivalente en los módulos de la Fase 3: un producto puede manejarse en varias unidades de medida (botella, caja, pallet…), cada una con un factor de conversión hacia la unidad base. Casos de uso nuevos, todos colgando de `productId` porque solo tienen sentido sobre un producto ya creado:
   - `AddProductUnitUseCase` — añade una presentación (unidad + factor).
   - `ChangeProductUnitFactorUseCase` — cambia el factor de una presentación que no es la base.
   - `SetProductUnitStatusUseCase` — activa/desactiva una presentación (la API rechaza dar de baja la base con 422).
   - `ChangeBaseUnitUseCase` — designa otra presentación como base, exigiendo el nuevo factor de la base saliente (no es deducible: es una decisión de negocio).
3. **`ProductFormPage` combina alta/edición de producto con gestión de presentaciones**: en alta solo pide los datos del producto + unidad base obligatoria (`CreateProductRequest`); en edición añade una sección "Presentaciones" con tabla (unidad, factor, si es base, estado, acciones) y un formulario para añadir una presentación nueva. Esa sección solo existe en edición porque todas sus operaciones requieren el producto ya persistido.
4. **`ProductListPage`** replica el patrón de listado de Categorías, con un filtro adicional por categoría (`categoryId`, poblado con `SearchCategoriesUseCase` filtrando `active: true`, tamaño 100) y una columna calculada "Unidad base" (`units.find(u => u.baseUnit)`).
5. **Ruta y navegación**: `products.routes.ts` (listado abierto a cualquier autenticado, alta/edición con `roleGuard([Role.Admin])`, mismo criterio que el resto del catálogo), añadido como hija lazy del shell en `app.routes.ts` y como entrada de `NAV_ITEMS` en `AppShellComponent`, justo antes de Categorías (Producto es la entidad "principal" del catálogo).
6. **DI**: `ProductRepository` → `ProductHttpRepository` en `app.config.ts`, junto a los demás repositorios.
7. **`_patterns.scss` extendido, no reescrito**: el mixin `entity-form` ahora también estiliza `select`/`textarea` (antes solo `input`) porque el formulario de producto es el primero en usar un `<select>` dentro de `.entity-form` (categoría, unidad base). `product-form.page.scss` combina `crud-form` + `status-badge` + `row-actions` + `list-filters` (reutilizado para el mini-formulario de "añadir presentación") en vez de escribir CSS nuevo.
8. Verificado con `ng build --configuration development`: build limpio (browser + server), `product-list-page` y `product-form-page` aparecen como chunks lazy independientes.

## Cómo se hizo (decisiones clave)

- **Copiar el patrón de Categoría para los campos propios del producto, no inventar uno nuevo**: SKU inmutable tras la creación (paralelo exacto al `code` de Categoría/Transportista/Proveedor), edición limitada a `name`/`categoryId`/`barcode`/`description` (`UpdateProductRequest`), baja lógica con `activate`/`deactivate`. La única pieza sin precedente es la unidad base y las presentaciones.
- **Unidad base obligatoria solo en alta, deshabilitada en edición**: `CreateProductRequest.baseUnitId` es obligatorio (RF-07: sin unidad base el producto no podría recibir existencias) y la API no ofrece forma de cambiarla vía `UpdateProductRequest` — cambiarla es una operación de negocio aparte (`POST /products/{id}/base-unit`, `ChangeBaseUnitUseCase`) porque exige decidir qué factor pasa a tener la base saliente. El formulario refleja esa asimetría: el campo solo aparece en modo alta.
- **Sección de presentaciones solo en edición, no como parte del alta**: todas las mutaciones de `ProductUnit` (añadir, cambiar factor, activar/desactivar, cambiar base) cuelgan de un `productId` existente — no tiene sentido mostrarlas antes de guardar el producto. Se evita así construir un flujo de alta en dos pasos que la API no pide.
- **Sin selector de proveedor en el producto**: `ProductResponse`/`CreateProductRequest` en `APIDOC.json` no tienen ningún campo que vincule producto con proveedor (a diferencia de lo que sugería la Fase 3); no se agregó un campo especulativo que la API rechazaría.
- **Filtro de categoría en el listado, con `active: true` fijo**: igual que el desplegable de unidad base en el formulario, no tiene sentido ofrecer categorías dadas de baja para filtrar o clasificar productos nuevos — mismo criterio que ya aplica `CategoryListPage` al mostrarlas todas (activas e inactivas) pero que aquí, al ser un filtro auxiliar y no el recurso principal, se restringe a las activas.
- **`entity-form` extendido a `select`/`textarea` en vez de un mixin paralelo**: con cuatro módulos ya usando `.entity-form` solo con `<input>`, añadir `<select>` en Producto era el primer caso real que lo necesitaba; generalizar el mixin existente mantiene una sola definición de "cómo se ve un campo de formulario" en vez de duplicar reglas por variante de control.
- **`roleGuard([Role.Admin])` en alta/edición, listado abierto**: mismo criterio de Categoría/Transportista/Proveedor — el listado lo necesita cualquier operador para elegir producto al registrar movimientos de inventario; la escritura queda reservada a ADMIN por ser maestro de catálogo.

## Qué sigue (Fase 5 propuesta)

1. **Lista de precios** (`PriceListResponse` + `product-prices`): depende de Producto, ya modelado.
2. Módulo de **Inventario** por sucursal (`/branches/{branchId}/inventory/*`, entradas/salidas/ajustes/movimientos, `minimum-stock`): núcleo funcional de la app, depende de Producto y Sucursal, ambos ya completos.
3. Paneles del dashboard con datos reales (`/organizations/{organizationId}/dashboard/*`, incluido `product-rotation`) sustituyendo el placeholder de `DashboardPage`.
4. Pruebas unitarias: `ng test` sigue bloqueado en este entorno por falta de Chrome (`CHROME_BIN` no configurable aquí); pendiente para un entorno con navegador disponible.
