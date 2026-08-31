# Fase 5 — Listas de precios

## Qué se hizo

1. **Módulo CRUD de Lista de precios** (`features/price-lists`): código inmutable/nombre/descripción/vigencia (`validFrom`–`validUntil`, fechas opcionales sin hora), baja lógica (activar/desactivar) — mismas capas que Categoría/Producto:
   - Dominio (`core/domain/models/price-list.model.ts`, `core/domain/repositories/price-list.repository.ts`).
   - Infraestructura (`core/infrastructure/http/dtos/price-list.dto.ts`, `.../mappers/price-list.mapper.ts`, `.../repositories/price-list-http.repository.ts`).
   - Aplicación (`core/application/price-lists/*.usecase.ts`): búsqueda paginada, alta, edición, activar/desactivar.
   - Presentación (`features/price-lists/price-list-list`, `features/price-lists/price-list-form`).
2. **Consulta/fijación de precio por producto** (`ProductPrice`), la pieza sin equivalente en el resto del catálogo: `GetProductPriceUseCase` y `SetProductPriceUseCase`, ambos operando sobre `priceListId` + `productId` + `productUnitId` — no existe un listado de precios de una lista en la API (`GET .../product-prices` exige los tres identificadores, es una consulta puntual, no una página).
3. **`PriceListFormPage` combina alta/edición con la sección "Precio de un producto"**, visible solo en edición (igual que las presentaciones de Producto en la Fase 4): selector de producto → selector de presentación (se puebla con `product.units` del producto elegido) → precio, con botones "Consultar" (lee el precio actual, si existe) y "Guardar precio" (`SetProductPriceRequest`, upsert según APIDOC.json).
4. **`PriceListListPage`** replica el patrón de listado de Categoría, pero sin filtro de texto ni orden: `GET /organizations/{organizationId}/price-lists` solo admite `active`, `page` y `size` (a diferencia de Categoría/Producto/Proveedor, que sí tienen `text`/`sortBy`) — el modelo (`PriceListQuery`) y el formulario de filtros reflejan esa API más chica en vez de simular parámetros que el backend ignoraría.
5. **Ruta y navegación**: `price-lists.routes.ts` (listado abierto a cualquier autenticado, alta/edición/fijar precio con `roleGuard([Role.Admin])`), hija lazy del shell en `app.routes.ts`, entrada en `NAV_ITEMS` de `AppShellComponent` justo después de Productos.
6. **DI**: `PriceListRepository` → `PriceListHttpRepository` en `app.config.ts`.
7. Verificado con `ng build --configuration development`: build limpio (browser + server); `price-list-list-page` y `price-list-form-page` aparecen como chunks lazy independientes.

## Cómo se hizo (decisiones clave)

- **Sin tabla de precios en la UI, porque la API no la ofrece**: `ProductPriceResponse` se consulta uno a uno (`productId`+`productUnitId` como query params obligatorios), no hay `GET` paginado de precios de una lista. Construir una tabla habría exigido recorrer todos los productos y presentaciones de la organización haciendo N llamadas — un patrón N+1 que el propio backend evita deliberadamente en `searchProducts` ("la página se resuelve en dos consultas fijas, no una por producto"); replicarlo aquí para simular una tabla habría ido contra ese mismo criterio. Se optó por el flujo real que la API sostiene: consultar/fijar un precio a la vez.
- **Selector de presentación dependiente del producto elegido, poblado desde `Product.units`**: como en Producto (Fase 4) una presentación solo existe dentro de un producto, no hace falta una llamada aparte — el listado de productos ya trae `units` embebido (`ProductResponse.units`), así que cambiar el producto seleccionado solo filtra en memoria.
- **Reset del selector de presentación con `valueChanges` de `productId`, no un `(change)` en la plantilla**: mismo estilo reactivo que usan los filtros de listado (`debounceTime`/`distinctUntilChanged` sobre `FormGroup.valueChanges`); mantiene toda la lógica reactiva en el constructor en vez de mezclar bindings de evento DOM con `ReactiveFormsModule`.
- **`PriceListQuery` no extiende `PageQuery`, se define aparte**: extenderlo habría heredado `sortBy`/`sortDirection` que esta API no acepta para este recurso — mejor una interfaz mínima que documente la diferencia real (visible también en la doc de Fase 4 al comparar con `ProductQuery`) que forzar la forma común y no usarla.
- **`roleGuard([Role.Admin])` en alta/edición/fijar precio, listado abierto**: mismo criterio del resto del catálogo — cualquier operador necesita consultar precios vigentes al facturar o cotizar; la gestión de precios (HU-25) es una decisión de negocio reservada a ADMIN.

## Qué sigue (Fase 6 propuesta)

1. Módulo de **Inventario** por sucursal (`/branches/{branchId}/inventory/*`, entradas/salidas/ajustes/movimientos, `minimum-stock`): núcleo funcional de la app, depende de Producto y Sucursal, ambos ya completos.
2. Paneles del dashboard con datos reales (`/organizations/{organizationId}/dashboard/*`, incluido `product-rotation`) sustituyendo el placeholder de `DashboardPage`.
3. Pruebas unitarias: `ng test` sigue bloqueado en este entorno por falta de Chrome (`CHROME_BIN` no configurable aquí); pendiente para un entorno con navegador disponible.
