# Fase 11 — Rutas logísticas

## Qué se hizo

1. **`LOGISTICS_ROUTES_ROUTES` nuevo** (`/logistics-routes`): listado, alta y edición contra `/organizations/{organizationId}/logistics-routes` y `/logistics-routes/{routeId}/*`.
   - Dominio (`core/domain/models/logistics-route.model.ts`: `LogisticsRoute`, `LogisticsRouteQuery`, `CreateLogisticsRouteInput`, `UpdateLogisticsRouteInput`; `core/domain/repositories/logistics-route.repository.ts`).
   - Infraestructura (`core/infrastructure/http/dtos/logistics-route.dto.ts`, `.../mappers/logistics-route.mapper.ts`, `.../repositories/logistics-route-http.repository.ts`).
   - Aplicación (`core/application/logistics-routes/*.usecase.ts`): `SearchLogisticsRoutesUseCase`, `GetLogisticsRouteUseCase`, `CreateLogisticsRouteUseCase`, `UpdateLogisticsRouteUseCase`, `SetLogisticsRouteStatusUseCase`.
2. **Listado** (`searchLogisticsRoutes`, RF-45): filtros `originBranchId`/`destinationBranchId`/`active`, mismo criterio CRUD que `CarrierListPage` — abierto a todos los autenticados, alta/edición/baja restringidas a ADMIN.
3. **Alta y edición**: origen y destino son inmutables tras crear la ruta (`CreateLogisticsRouteRequest` los exige, `UpdateLogisticsRouteRequest` no los admite); se reflejó bloqueando esos dos `select` en modo edición, mismo patrón que el `code` inmutable de `CarrierFormPage`. `estimatedDurationMinutes` es el único campo obligatorio además de origen/destino; `name`, `estimatedCost` y `priority` son opcionales.
4. **Baja lógica** (`activateLogisticsRoute`/`deactivateLogisticsRoute`): mismo patrón `SetCarrierStatusUseCase` — nunca se borra una ruta, solo se desactiva.
5. **DI**: `LogisticsRouteRepository` → `LogisticsRouteHttpRepository` en `app.config.ts`. Enlace "Rutas logísticas" añadido al sidebar, junto a "Transportistas".
6. Verificado con `ng build --configuration development`: build limpio (browser + server); `logistics-route-list-page` y `logistics-route-form-page` son chunks lazy independientes.

## Cómo se hizo (decisiones clave)

- **Por qué esta fase antes que Transferencias**: `assignTransferLogistics` (HU/RF de Transferencias) necesita elegir una ruta logística existente que conecte el origen y destino de la transferencia; sin gestión de rutas no hay nada que ofrecer en ese selector. Se adelantó como pieza independiente, mismo criterio que construir Proveedores antes de Compras.
- **Sin filtro de texto/ordenación en el listado**: `searchLogisticsRoutes` en APIDOC.json no documenta `text` ni `sortBy` (a diferencia de `CarrierQuery`), así que no se inventó ninguno; solo se exponen los filtros reales (origen, destino, estado).
- **Selects de sucursal cargados una vez con `size: 100`**: no hay paginación de sucursales en este selector porque el número esperado de sucursales por organización es bajo, mismo criterio usado para el filtro de sucursales en `InventoryListPage`.

## Qué sigue (Fase 12 propuesta)

Ver `Transferencias` (HU-27 a HU-41, RF-46): módulo grande con ciclo de vida completo — solicitud, aprobación (con ajuste de cantidades), preparación, asignación de logística (usa `LogisticsRoute` de esta fase), despacho (`TRANSFER_OUT`), recepción con incidencias por faltante (`TRANSFER_IN` + `TransferIssue`), resolución de incidencias y cancelación (solo antes de despachar). Pendiente también: pruebas unitarias (bloqueadas por falta de Chrome en este entorno).
