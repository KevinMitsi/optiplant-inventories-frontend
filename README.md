# OptiPlant — Inventarios (Frontend) — v2 (final)

App Angular (SSR) de gestión de inventarios multisucursal: catálogo, inventario, ventas, compras, transferencias, dashboard, usuarios, auditoría y notificaciones de alertas, contra API REST documentada en `APIDOC.json`. Este README condensa las 14 fases de `/docs`.

## Stack

- Angular 20 (standalone, zoneless, signals), SSR vía `@angular/ssr` + Express.
- TypeScript strict, RxJS, Reactive Forms (obligatorio, `.claude/CLAUDE.md`).
- SCSS con sistema de tokens propio (`src/styles/abstracts`), sin CSS frameworks.
- `ng-apexcharts`/`apexcharts` para los gráficos del Dashboard (fase 8).
- Sin librería de estado externa: signals + servicios `providedIn: 'root'`.

## Cómo correr

```bash
npm install
npm start                # ng serve, http://localhost:4200, API en http://localhost:8080/api/v1
npm run build            # build prod (browser + server)
npm run serve:ssr:optiplant-inventarios-frontend   # sirve el build SSR (dist/.../server/server.mjs)
```

`npm test` (Karma/Jasmine) queda bloqueado en este entorno de desarrollo por falta de `CHROME_BIN`; pendiente en un entorno con navegador.

### Docker

`Dockerfile` (build multi-stage, `node:22-alpine`) construye el bundle SSR y lo sirve con Express en el puerto 4200. La API key de `countriesApiKey` (`src/environments/environment.ts`, usada por `country-directory.service.ts`) es un placeholder (`__COUNTRIES_API_KEY__`) sustituido en build time — nunca commitear el valor real:

```bash
docker build --build-arg COUNTRIES_API_KEY=<valor> -t optiplant-frontend .
docker run -p 4200:4200 optiplant-frontend
```

## Arquitectura (Clean Architecture por feature)

```
src/app/
├── core/                       # transversal: auth, HTTP, SSR, shell, guards
│   ├── domain/                 # entidades + puertos (clases abstractas), sin Angular HTTP
│   ├── application/            # casos de uso (servicios providedIn: 'root')
│   ├── infrastructure/         # DTOs, mappers DTO→dominio, repos HTTP, interceptores, cookies
│   ├── state/                  # AuthStore (signals)
│   └── guards/                 # authGuard, guestGuard, roleGuard
├── shared/ui/                  # layout (shell), paginador, patrones SCSS
└── features/<módulo>/
    ├── domain/models · ports
    ├── application/*.usecase.ts
    ├── infrastructure/datasources · mappers · repositories-impl
    └── presentation/*.page.ts + *.routes.ts (lazy)
```

Regla de dependencia: dominio no conoce HTTP/Angular; casos de uso orquestan dominio + infraestructura; presentación solo depende de casos de uso. Cada módulo de negocio enlaza su puerto (`XxxRepository` abstracto) a su implementación HTTP en `app.config.ts`.

## Autenticación y sesión

- JWT (`accessToken`/`refreshToken`) en cookies separadas (no `HttpOnly` — el backend los da en el cuerpo JSON, no en `Set-Cookie`); mitigado con `SameSite=Strict`/`Secure`. El objeto `User` vive solo en memoria (`AuthStore`), recargado vía `GET /auth/me`.
- `AuthStore.status`: `unknown | authenticated | anonymous`, resuelto una vez en `provideAppInitializer` antes de que corran los guards.
- Interceptores (orden en `app.config.ts`): `authInterceptor` (Bearer) → `errorNormalizerInterceptor` (normaliza a `ApiError`) → `refreshInterceptor` (401 → renueva vía `RefreshCoordinatorService`, deduplica refresh concurrente, reintenta una vez).
- Guards: `authGuard`, `guestGuard`, `roleGuard([...roles])` (→ `/forbidden`).
- SSR: `CookieService` lee la cookie de la petición Express entrante (`REQUEST` de `@angular/core`); `ssrAbsoluteUrlInterceptor` (solo en `app.config.server.ts`) resuelve URL absoluta de API en Node. `RenderMode.Server` (no `Prerender`, por depender de sesión por usuario).

## Módulos de negocio (por fase)

| Fase | Módulo | Resumen |
|---|---|---|
| 1 | Fundación + Auth | Clean Architecture, login/refresh/me, interceptores, guards por rol. |
| 2 | SCSS + SSR + Sucursales | Sistema de tokens SCSS, cierre de hueco SSR, shell autenticado, paginador reutilizable, CRUD Sucursales (plantilla de los módulos siguientes). |
| 3 | Catálogo organizacional | CRUD Categorías, Transportistas, Proveedores; Unidades de medida (solo lectura, sin alta/edición en la API). Mixins SCSS `responsive-table`/`_patterns.scss` extraídos. |
| 4 | Producto | CRUD Producto + gestión de presentaciones (`ProductUnit`: unidad + factor de conversión, unidad base obligatoria en alta, cambio de base como operación aparte). |
| 5 | Listas de precios | CRUD Lista de precios + consulta/fijación de precio puntual por producto+presentación (sin listado de precios, la API no lo expone). |
| 6 | Inventario | Saldos por sucursal (implícitos, sin alta/edición directa), entrada/salida manual, stock mínimo, histórico de movimientos. Selector de sucursal solo para ADMIN. |
| 7 | Ajustes y alertas | Ajustes de inventario (borrador con líneas `FormArray` + aprobación, sin listado — la API no lo expone). Alertas de stock bajo (listado + descartar/resolver). |
| 8 | Dashboard | Ventas por mes, rotación de productos, comparación de sucursales (esta última solo ADMIN, RN-12). `forkJoin` + selector de sucursal para ADMIN. |
| 9 | Ventas | Borrador → confirmación (`SALE_OUT`, descuenta stock) → cancelación (restituye stock si estaba confirmada). Precio por línea manual o resuelto por lista de precios. |
| 10 | Compras | Borrador → confirmación → recepción por línea (parcial admitida, recalcula costo promedio) → cancelación (solo antes de recibir). |
| 11 | Rutas logísticas | CRUD con origen/destino inmutables tras creación; prerrequisito de Transferencias (selector de ruta filtrado por origen+destino). |
| 12 | Transferencias entre sucursales | Ciclo completo: solicitud → aprobación (no visible para `INVENTORY_OPERATOR`) → preparación → asignación de logística → despacho (`TRANSFER_OUT`) → recepción (`TRANSFER_IN`, incidencias por faltante) → resolución de incidencias / cancelación (solo antes de despachar). |
| 13 | Usuarios + correcciones de UX | CRUD Usuarios (alta/perfil/reasignación/activación como 4 operaciones independientes, reflejando la API — no un `PUT` único), sucursal condicionalmente obligatoria según rol (RN-13). Diálogos flotantes reemplazan estado inline en tablas (presentaciones de producto, listas de precios). Migración puntual de endpoints `POST`/`PUT` → `PATCH` en Sucursales/Transportistas/Proveedores/Producto. |
| 14 | Auditoría + notificaciones | Listado de traza de auditoría (`activity-logs`, solo ADMIN, solo lectura — sin alta/edición, la API no lo expone). Pop-up no invasivo de alertas de inventario abiertas (esquina inferior derecha), alimentado por `InventoryAlertNotificationsStore`: reconsulta al iniciar sesión y cada 5 min mientras dure, sin mutar alertas. |

Detalle completo de cada fase (qué se hizo, decisiones y su porqué) en `/docs/fase-N-*.md`.

## Convenciones de UI transversales

- **Listado + formulario combinado** (alta/edición en un solo componente, modo según `:id` en ruta) en todo módulo CRUD.
- **Baja lógica** (`activate`/`deactivate`), nunca borrado, en todos los catálogos.
- **Selector de sucursal solo para ADMIN** (`User.branchId === null`); el resto opera sobre su sucursal fija, impuesta también por el backend (RN-12/13). Repetido en Inventario, Alertas, Dashboard, Ventas, Compras, Transferencias.
- **`roleGuard([Role.Admin])`** en alta/edición de catálogos maestros (Sucursales, Categorías, Transportistas, Proveedores, Productos, Listas de precios, Rutas logísticas, alta/edición de Usuarios) y en Auditoría (solo lectura); **listado de Usuarios** además visible para `BRANCH_MANAGER`; **sin guard de rol** en flujos operativos por sucursal (Inventario, Ajustes, Alertas, Ventas, Compras, Transferencias) — el backend ya impone el alcance real.
- **Sin listados que la API no expone** (precios de una lista, ajustes de inventario): se ofrece consulta puntual en vez de fabricar una tabla con llamadas N+1.
- **Campos/estados sin `enum` documentado** (`Sale.status`, `PurchaseOrder.status`, `Transfer.status`/`priority`) se tratan como texto libre, valores inferidos de la descripción de cada endpoint en `APIDOC.json`.
- **Tabla responsiva sin duplicar markup**: un único `<table>` con `data-label` + mixin `responsive-table` (SCSS) que la reapila como tarjetas en móvil.
- **`FormArray`** para líneas dinámicas (ajustes de inventario, ventas, compras, transferencias); **`FormControl[]` dinámico por línea** para las acciones de ciclo de vida de Transferencias (aprobar/despachar/recibir), reutilizado para no triplicar plantilla.

## Sistema de diseño (SCSS)

Fuente de verdad: `src/styles/abstracts/_tokens.scss` (mapas Sass). Consumo vía `@use '.../styles/abstracts' as ds;` y funciones `ds.color()`/`ds.space()`/`ds.radius()`/`ds.shadow()`/`ds.font-size()`, que fallan en build si la clave no existe. Mobile-first (`ds.respond($breakpoint)`, `min-width`). Patrones de página completos en `_patterns.scss` (`crud-list`, `crud-form`, `status-badge`, `row-actions`, etc.) para no repetir ~150 líneas de SCSS por módulo.

Paleta completa (claves, uso y variantes `-light`) documentada en `.claude/CLAUDE.md`.

## Limitaciones conocidas / pendiente

- **Pruebas unitarias**: `ng test` bloqueado en este entorno de desarrollo por falta de `CHROME_BIN`; ninguna fase pudo verificarse con Karma/Jasmine, solo con `ng build --configuration development` (browser + server, sin errores TS/SCSS).
- Sin filtro de rango de fechas en el Dashboard (la API usa un default de 6 meses; no había requisito que pidiera elegir otro rango).
- Sin pantalla de reseteo de contraseña de otro usuario (la API solo permite que el propio dueño de la cuenta la cambie, con contraseña actual).
- Migración `POST`/`PUT` → `PATCH` (fase 13) aplicada solo a los endpoints confirmados puntualmente contra el backend (Sucursales/Transportistas/Proveedores activación-baja, Producto base-unit/factor); el resto de endpoints de activación/baja quedó sin tocar por falta de confirmación.
- Revisando `APIDOC.json` al cierre de la Fase 14, no queda ningún RF/HU grande sin implementar. Queda por confirmar con el usuario si hay ajustes/refinamientos sobre lo construido o una nueva fase de requisitos.

## Documentación fuente

- `/docs/fase-1-fundacion-y-autenticacion.md` … `/docs/fase-13-usuarios-y-mejoras-de-formularios.md`: bitácora fase a fase (qué se hizo / cómo se hizo — decisiones clave / qué sigue). Fase 14 (auditoría + notificaciones) sin doc propia en `/docs`, ver tabla de módulos arriba y commit `Notifications and logs`.
- `APIDOC.json`: contrato de la API REST (fuente de verdad de entidades, DTOs y endpoints).
- `.claude/CLAUDE.md`: convenciones de Angular/TypeScript, reglas de SCSS y paleta de colores del proyecto.
