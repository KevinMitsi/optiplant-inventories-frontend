# Fase 10 — Módulo de Compras

## Qué se hizo

1. **`PURCHASE_ORDERS_ROUTES` nuevo** (`/purchase-orders`): listado, alta en borrador y detalle con confirmación, cancelación y recepción por línea, contra `/branches/{branchId}/purchase-orders` y `/purchase-orders/{purchaseOrderId}/*`.
   - Dominio (`core/domain/models/purchase-order.model.ts`: `PurchaseOrderItem`, `PurchaseOrder`, `CreatePurchaseOrderItemInput`, `CreatePurchaseOrderInput`, `ReceivePurchaseOrderItemInput`, `PurchaseOrderQuery`; `core/domain/repositories/purchase-order.repository.ts`).
   - Infraestructura (`core/infrastructure/http/dtos/purchase-order.dto.ts`, `.../mappers/purchase-order.mapper.ts`, `.../repositories/purchase-order-http.repository.ts`).
   - Aplicación (`core/application/purchase-orders/*.usecase.ts`): `SearchPurchaseOrdersUseCase`, `CreatePurchaseOrderUseCase`, `GetPurchaseOrderUseCase`, `ConfirmPurchaseOrderUseCase`, `CancelPurchaseOrderUseCase`, `ReceivePurchaseOrderItemUseCase`.
2. **Listado** (`searchPurchaseOrders`, HU-20/RF-22): `GET /branches/{branchId}/purchase-orders`, mismo criterio de sucursal obligatoria que `SaleListPage` (Fase 9) — ADMIN elige sucursal con selector, el resto ve la suya fija. Filtros: proveedor, producto (documentado en la API, sin selector propio en la UI todavía porque no hay listado de productos ya comprados que lo justifique) y estado. A diferencia de Ventas, la API no documenta `fromDate`/`toDate` para este recurso.
3. **Alta en borrador** (`createPurchaseOrder`, HU-17/HU-18): formulario con proveedor, número, fecha, plazo de pago en días (opcional) y líneas (`FormArray`, al menos una): producto, presentación (`productUnitId`), cantidad, precio unitario y descuento % opcional. A diferencia de `SaleItemRequest`, aquí `unitPrice` es obligatorio (`PurchaseOrderItemRequest.required` en APIDOC.json): es el precio pactado con el proveedor, no hay lista de precios que lo resuelva.
4. **Confirmación** (`confirmPurchaseOrder`): `POST /purchase-orders/{id}/confirmation`; a partir de aquí puede empezar a recibirse mercancía. Solo visible con `status === 'DRAFT'`.
5. **Recepción por línea** (`receivePurchaseOrderItem`, HU-19, RF-21/RF-23): `POST /purchase-orders/{id}/items/{itemId}/receipt` con `quantityReceived`; incrementa inventario y recalcula el costo promedio ponderado del producto en el backend. Admite recepción parcial — el campo se precarga con el pendiente (`quantity - receivedQuantity`) pero es editable; visible por línea mientras `status === 'CONFIRMED'` y `receivedQuantity < quantity`.
6. **Cancelación** (`cancelPurchaseOrder`): `POST /purchase-orders/{id}/cancellation`, "solo antes de recibir cualquier mercancía" según su propia descripción en APIDOC.json; la UI la oculta en cuanto alguna línea tiene `receivedQuantity > 0` (`hasAnyReceipt`), para no ofrecer una acción que el backend rechazaría.
7. **`PurchaseOrder.status` es texto libre**, sin enum documentado — mismo criterio que `Sale.status` (Fase 9); la UI asume `DRAFT`/`CONFIRMED`/`CANCELLED`.
8. **DI**: `PurchaseOrderRepository` → `PurchaseOrderHttpRepository` en `app.config.ts`. Enlace "Órdenes de compra" añadido al sidebar, entre "Ventas" e "Inventario".
9. Verificado con `ng build --configuration development`: build limpio (browser + server); `purchase-order-list-page`, `purchase-order-create-page` y `purchase-order-detail-page` son chunks lazy independientes.

## Cómo se hizo (decisiones clave)

- **Sin `roleGuard` en `purchase-orders.routes.ts`**: comprar es trabajo operativo dentro de la propia sucursal, mismo criterio que `sales.routes.ts`/`inventory.routes.ts`.
- **`orderDate` sin ajuste de hora**: a diferencia de `Sale.saleDate` (Fase 9), `PurchaseOrderResponse.orderDate` es `date` puro (sin hora) en APIDOC.json, así que el `<input type="date">` se envía tal cual, sin completar `T00:00:00`.
- **Cancelar oculto tras la primera recepción calculado en el frontend** (`hasAnyReceipt`), no delegado solo al backend: a diferencia de la validación de rol en `GetBranchComparisonUseCase` (Fase 8), aquí sí vale la pena evitar la llamada porque la condición ("cualquier mercancía recibida") es visible en los propios datos ya cargados, sin pedir nada extra al servidor.
- **Filtro `productId` de `searchPurchaseOrders` no expuesto en el listado**: RF-22 lo describe como analítico ("para analizar el comportamiento de abastecimiento"), no como filtro operativo del día a día; añadir un selector de producto ahora habría sido especulativo sin una HU que lo pida explícitamente, mismo criterio que el filtro de fechas omitido en el panel (Fase 8).

## Qué sigue

Ver [`fase-11-rutas-logisticas.md`](./fase-11-rutas-logisticas.md): se revisó el catálogo de RF/HU y quedaba sin cubrir todo el dominio de Transferencias entre sucursales (HU-27 a HU-41) más su prerrequisito, Rutas logísticas (RF-45) — ya implementado.
