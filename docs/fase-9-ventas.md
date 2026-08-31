# Fase 9 — Módulo de Ventas

## Qué se hizo

1. **`SALES_ROUTES` nuevo** (`/sales`): listado, alta en borrador y detalle con confirmación/cancelación, contra `/branches/{branchId}/sales` y `/sales/{saleId}/*`.
   - Dominio (`core/domain/models/sale.model.ts`: `SaleItem`, `Sale`, `CreateSaleItemInput`, `CreateSaleInput`, `SaleQuery`; `core/domain/repositories/sale.repository.ts`).
   - Infraestructura (`core/infrastructure/http/dtos/sale.dto.ts`, `.../mappers/sale.mapper.ts`, `.../repositories/sale-http.repository.ts`).
   - Aplicación (`core/application/sales/*.usecase.ts`): `SearchSalesUseCase`, `CreateSaleUseCase`, `GetSaleUseCase`, `ConfirmSaleUseCase`, `CancelSaleUseCase`.
2. **Listado** (`searchSales`, HU-26/RF-30): `GET /branches/{branchId}/sales`, `branchId` es segmento de ruta obligatorio (no query opcional como en Alertas de inventario), así que se usa el mismo criterio que `InventoryListPage` (Fase 6): ADMIN elige sucursal con un selector, BRANCH_MANAGER/INVENTORY_OPERATOR ven la suya fija sin selector. Filtros adicionales: estado, `fromDate`/`toDate`.
3. **Alta en borrador** (`createSale`, HU-22): formulario con número, fecha, lista de precios opcional (`priceListId`, HU-25 — si se omite el precio de una línea, el backend lo resuelve contra esa lista) y líneas (`FormArray`, al menos una): producto, presentación (`productUnitId`, del catálogo de unidades del producto elegido), cantidad, precio unitario manual opcional y descuento % opcional. No mueve stock: crea el documento en `DRAFT`.
4. **Confirmación** (`confirmSale`, RN-03): `POST /sales/{id}/confirmation` descuenta inventario vía `SALE_OUT` validando stock disponible; solo visible con `status === 'DRAFT'`.
5. **Cancelación** (`cancelSale`): `POST /sales/{id}/cancellation`; si la venta ya estaba confirmada, restituye el inventario con un `RETURN_IN` compensatorio. Visible en `DRAFT` o `CONFIRMED`; una vez `CANCELLED` no queda ninguna acción.
6. **`Sale.status` es texto libre**, sin enum: APIDOC.json no documenta los valores posibles (`SaleResponse.status: string`), igual criterio que `InventoryAdjustment.approved`/`InventoryAlert.status`; la UI asume `DRAFT`/`CONFIRMED`/`CANCELLED` porque son los únicos que describen las operaciones documentadas (creación, confirmación, cancelación).
7. **`fromDate`/`toDate`/`saleDate` son `date-time` en la API** pero los campos usan `<input type="date">` (no hay precedente de `datetime-local` en el proyecto); se completan a inicio/fin de día (`T00:00:00`/`T23:59:59`) antes de enviarlos.
8. **DI**: `SaleRepository` → `SaleHttpRepository` en `app.config.ts`. Enlace "Ventas" añadido al sidebar (`app-shell.component.ts`), entre "Panel" e "Inventario".
9. Verificado con `ng build --configuration development`: build limpio (browser + server); `sale-list-page`, `sale-create-page` y `sale-detail-page` son chunks lazy independientes.

## Cómo se hizo (decisiones clave)

- **Sin `roleGuard` en `sales.routes.ts`**: vender es trabajo operativo dentro de la propia sucursal, mismo criterio que `inventory.routes.ts`/`inventory-adjustments.routes.ts`; el backend ya impone el alcance (403 si la sucursal no es la del usuario).
- **`priceListId` opcional en el formulario de alta**: forzarlo habría contradicho HU-25 (precio manual por línea como alternativa válida, no solo fallback).
- **Detalle reutiliza el mapa `productId → Product`** cargado una vez (mismo patrón que `InventoryAdjustmentDetailPage`) para resolver SKU/nombre y presentación de cada línea sin pedir cada producto por separado.

## Qué sigue (Fase 10 propuesta)

1. Módulo de Compras (`Órdenes de compra a proveedores`): borrador (HU-17/HU-18), confirmación y recepción —parcial o total— por línea (HU-19/HU-20, RF-21/RF-23: recalcula costo promedio ponderado).
2. Pruebas unitarias: `ng test` sigue bloqueado en este entorno por falta de Chrome (`CHROME_BIN` no configurable aquí); pendiente para un entorno con navegador disponible.
