# Fase 8 — Panel con datos reales

## Qué se hizo

1. **`DashboardPage` sustituye el placeholder de la Fase 1** por tres reportes reales de `/organizations/{organizationId}/dashboard/*`: ventas por mes, rotación de productos y comparación de sucursales.
   - Dominio (`core/domain/models/dashboard.model.ts`: `SalesSummary`, `ProductRotation`, `BranchComparison`, `DashboardQuery`; `core/domain/repositories/dashboard.repository.ts`).
   - Infraestructura (`core/infrastructure/http/dtos/dashboard.dto.ts`, `.../mappers/dashboard.mapper.ts`, `.../repositories/dashboard-http.repository.ts`).
   - Aplicación (`core/application/dashboard/*.usecase.ts`): `GetSalesSummaryUseCase`, `GetProductRotationUseCase`, `GetBranchComparisonUseCase`.
2. **Ventas por mes** (`getSalesSummary`, RF-42/43, HU-38): tabla sucursal/mes/ventas/monto; sin `from`/`to` explícitos el backend usa los últimos 6 meses, así que el panel no ofrece selector de período todavía (queda para cuando exista un caso de uso que lo necesite).
3. **Rotación de productos** (`getProductRotation`, RF-44, HU-39): tabla producto/cantidad vendida/ventas, ya viene ordenada de mayor a menor demanda desde el backend (los productos sin ventas aparecen al final con cantidad cero, tal cual documenta la API).
4. **Comparación de sucursales** (`getBranchComparison`, RF-47, HU-42): tabla sucursal/ventas/monto/valor de inventario/stock crítico, sección visible solo para ADMIN (`branchId === null`) porque el endpoint está "reservado al administrador general (RN-12)" según su propia descripción en APIDOC.json; no se le pide nada a las otras dos secciones para ADMIN sin filtro, ya que ese reporte no acepta `branchId`.
5. **Selector de sucursal solo para ADMIN**, igual criterio que `InventoryAlertListPage` (Fase 7) e `InventoryListPage` (Fase 6): filtra ventas y rotación por sucursal vía `branchId` opcional; el resto de roles no lo ve porque el backend ya filtra por la sucursal del usuario (RN-12/RN-13).
6. **Las tres peticiones se lanzan con `forkJoin`** (comparación de sucursales sustituida por `of([])` cuando el usuario no es ADMIN, para no pedir un endpoint que le devolvería 403) y comparten un único `loading()`/`errorMessage()`.
7. **DI**: `DashboardRepository` → `DashboardHttpRepository` en `app.config.ts`.
8. Verificado con `ng build --configuration development`: build limpio (browser + server); `dashboard-page` aparece como chunk lazy independiente (antes cargaba junto al shell, al ser componente sin ruta hija propia — sigue siendo `loadComponent` en `app.routes.ts`, sin cambios de ruteo).

## Cómo se hizo (decisiones clave)

- **Sin filtro de fechas (`from`/`to`) en esta fase**: la API los documenta como opcionales con default de 6 meses, y no hay todavía ningún requisito (HU/RF) que pida elegir un rango distinto desde el panel; añadir el control ahora habría sido especulativo.
- **DTOs separados de los modelos de dominio pese a tener los mismos campos**: se mantiene la misma capa de infraestructura que el resto del proyecto (Clean Architecture) en vez de hacer una excepción solo porque el mapeo es 1:1 hoy — si el backend agrega un campo nuevo algún día, el cambio queda contenido en `dashboard.dto.ts`/`dashboard.mapper.ts`.
- **`GetBranchComparisonUseCase` no valida el rol en el frontend**: el backend ya devuelve 403 si un no-ADMIN lo intenta (RN-12); el frontend solo evita la llamada innecesaria ocultando la sección, mismo criterio que ya usan `roleGuard`/las comprobaciones de `isAdmin()` en otras páginas de este proyecto.

## Qué sigue (Fase 9 propuesta)

1. Módulo de Ventas (`Ventas`, tag de APIDOC.json): creación de venta en borrador (HU-22), confirmación y cancelación, con su propio descuento de stock vía `SALE_OUT` (RN-03).
2. Módulo de Compras (`Órdenes de compra a proveedores`): borrador (HU-17/HU-18), confirmación y recepción (HU-19/HU-20).
3. Pruebas unitarias: `ng test` sigue bloqueado en este entorno por falta de Chrome (`CHROME_BIN` no configurable aquí); pendiente para un entorno con navegador disponible.
