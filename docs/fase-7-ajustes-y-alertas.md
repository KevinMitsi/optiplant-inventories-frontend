# Fase 7 — Ajustes de inventario y Alertas de inventario

## Qué se hizo

1. **Módulo de Ajustes de inventario** (`features/inventory-adjustments`): corrección formal de stock, con responsable (`createdBy`) y aprobador (`approvedBy`), a diferencia de la entrada/salida sin documento de la Fase 6 (`RegisterInventoryMovementRequest`).
   - Dominio (`core/domain/models/inventory-adjustment.model.ts`, `core/domain/repositories/inventory-adjustment.repository.ts`).
   - Infraestructura (`core/infrastructure/http/dtos/inventory-adjustment.dto.ts`, `.../mappers/inventory-adjustment.mapper.ts`, `.../repositories/inventory-adjustment-http.repository.ts`).
   - Aplicación (`core/application/inventory-adjustments/*.usecase.ts`): `CreateInventoryAdjustmentUseCase`, `GetInventoryAdjustmentUseCase`, `ApproveInventoryAdjustmentUseCase`.
   - Presentación: `inventory-adjustment-lookup` (`''`, puerta de entrada del módulo), `inventory-adjustment-create` (`new`, borrador con líneas dinámicas), `inventory-adjustment-detail` (`:id`, consulta + aprobación).
2. **Sin listado de ajustes, por diseño**: APIDOC.json documenta `POST /branches/{branchId}/inventory-adjustments` (crear) y `GET /inventory-adjustments/{id}` (consultar uno), pero ningún `GET` de colección. En vez de fabricar una tabla que el backend no puede llenar, `inventory-adjustment-lookup` ofrece "Nuevo ajuste" y un campo para consultar uno existente por identificador — mismo criterio que la consulta puntual de precio de producto en `PriceListFormPage` (Fase 5).
3. **Líneas dinámicas con `FormArray`**: `InventoryAdjustmentCreatePage` es el primer formulario del proyecto con un número variable de campos repetidos (`CreateInventoryAdjustmentRequest.items`, mínimo una línea); se modela con `FormArray<FormGroup<AdjustmentItemForm>>` y botones "Añadir línea"/"Quitar línea", en vez de un array de signals paralelo al formulario — sigue siendo Reactive Forms tal como exige `.claude/CLAUDE.md`.
4. **Aprobación como acción de detalle, no de listado**: `InventoryAdjustmentDetailPage` muestra el ajuste (motivo, estado, líneas) y, si no está `approved`, un botón "Aprobar ajuste" que llama a `POST /inventory-adjustments/{id}/approval`; la API documenta que a partir de ahí el documento es inmutable, así que tras aprobar se refresca el mismo signal con la respuesta en vez de recargar.
5. **Módulo de Alertas de inventario** (`features/inventory-alerts`): panel de avisos automáticos de stock bajo/agotado (HU-16, RF-16).
   - Dominio (`core/domain/models/inventory-alert.model.ts`, `core/domain/repositories/inventory-alert.repository.ts`).
   - Infraestructura (`core/infrastructure/http/dtos/inventory-alert.dto.ts`, `.../mappers/inventory-alert.mapper.ts`, `.../repositories/inventory-alert-http.repository.ts`).
   - Aplicación (`core/application/inventory-alerts/*.usecase.ts`): `SearchInventoryAlertsUseCase`, `DismissInventoryAlertUseCase`, `ResolveInventoryAlertUseCase`.
   - Presentación: `inventory-alert-list.page.ts` — sí tiene listado paginado, porque `GET /inventory-alerts` sí existe (a diferencia de los ajustes).
6. **`InventoryAlertQuery` no extiende `PageQuery`**: el endpoint solo documenta `branchId`, `status`, `page` y `size` — sin `sortBy`/`sortDirection` — así que el modelo declara solo esos cuatro campos, mismo criterio que `PriceListQuery` (Fase 5).
7. **Selector de sucursal solo para ADMIN, igual que en Inventario (Fase 6)**: `InventoryAlertListPage` reutiliza el criterio de `InventoryListPage` — ADMIN ve un `<select>` con "Todas las sucursales" además de las sucursales activas (porque `searchInventoryAlerts` documenta que sin `branchId` un ADMIN ve las de toda la organización, RN-12); los demás roles no ven selector, la API filtra sola por la sucursal del usuario.
8. **Filtro de estado con valor por defecto `OPEN`**: refleja el default documentado en la API (`status` por defecto solo trae las abiertas); el `<select>` añade `DISMISSED`/`RESOLVED` para poder auditar el histórico de cierres.
9. **Acciones "Resolver"/"Descartar" solo en alertas abiertas**: se ocultan cuando `alert.status !== 'OPEN'` porque la API devuelve 422 si la alerta ya no está abierta — la UI evita el intento en vez de mostrar el error después.
10. **Sin `roleGuard` en ninguna ruta de los dos módulos**: mismo criterio que `inventory.routes.ts` (Fase 6) — crear/aprobar un ajuste y cerrar una alerta son trabajo operativo dentro de la sucursal propia, no gestión de catálogo; APIDOC.json no documenta una restricción de rol distinta para `approveInventoryAdjustment`, `dismissInventoryAlert` o `resolveInventoryAlert`.
11. **Rutas y navegación**: `inventory-adjustments.routes.ts` e `inventory-alerts.routes.ts` como hijas lazy del shell en `app.routes.ts`; entradas en `NAV_ITEMS` de `AppShellComponent` justo después de Inventario.
12. **DI**: `InventoryAdjustmentRepository` → `InventoryAdjustmentHttpRepository` e `InventoryAlertRepository` → `InventoryAlertHttpRepository` en `app.config.ts`.
13. Verificado con `ng build --configuration development`: build limpio (browser + server); `inventory-adjustment-create-page`, `inventory-adjustment-detail-page` e `inventory-alert-list-page` aparecen como chunks lazy independientes.

## Cómo se hizo (decisiones clave)

- **Ajustes y alertas separados en dos features, no dentro de `features/inventory`**: aunque ambos giran en torno al mismo saldo, tienen ciclos de vida y endpoints completamente distintos entre sí y respecto a las entradas/salidas de la Fase 6 — meterlos en el mismo directorio habría mezclado tres flujos de negocio distintos bajo una sola carpeta sin ganar nada.
- **`InventoryAdjustmentItem.reason` opcional**: `InventoryAdjustmentItemRequest.reason` no está en el arreglo `required` de `CreateInventoryAdjustmentRequest` (solo `productId`/`quantityDelta` lo están); se envía `undefined` cuando el campo queda vacío, igual que ya hace `description`/`validFrom` en `CreatePriceListInput`.
- **`quantityDelta` sin `Validators.min`**: a diferencia de la cantidad de una entrada/salida (siempre positiva), el ajuste admite negativos a propósito (`"positivo entra, negativo sale"`, según su propia descripción en APIDOC.json) — forzar un mínimo habría bloqueado la mitad de los casos de uso del formulario.
- **`approve()` en el repositorio hace `POST` con cuerpo vacío `{}`**: igual que `activate()`/`deactivate()` en todos los demás repositorios del proyecto (Branch, Category, Carrier, Supplier, Product, PriceList) — la API no espera payload en las transiciones de estado, solo el identificador en la ruta.
- **Consulta de alertas revalida tras cada acción con `search()` en vez de mutar el signal en el sitio**: a diferencia de la aprobación de un ajuste (una sola entidad, un solo signal), el listado de alertas puede tener la fila afectada en cualquier página visible; recargar la página actual es más simple y correcto que buscar-y-reemplazar dentro de `result().content`.

## Qué sigue (Fase 8 propuesta)

1. Paneles del dashboard con datos reales (`/organizations/{organizationId}/dashboard/*`, incluido `product-rotation`) sustituyendo el placeholder de `DashboardPage`.
2. Módulo de Ventas (`Ventas`, tag de APIDOC.json): creación de venta en borrador (HU-22), confirmación y cancelación, con su propio descuento de stock vía `SALE_OUT` (RN-03).
3. Módulo de Compras (`Órdenes de compra a proveedores`): borrador (HU-17/HU-18), confirmación y recepción (HU-19/HU-20).
4. Pruebas unitarias: `ng test` sigue bloqueado en este entorno por falta de Chrome (`CHROME_BIN` no configurable aquí); pendiente para un entorno con navegador disponible.
