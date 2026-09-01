# Fase 13 — Módulo de usuarios y correcciones de UX en formularios

## Qué se hizo

1. **Formulario de producto (`product-form.page.ts`), sección "Presentaciones"**:
   - El input de "Factor" y el select de "Añadir presentación" quedaban cortados/invisibles en el contenedor angosto (`.units-section` de 48rem). Se amplió el contenedor a 64rem, se fijó `max-width`/`min-width:0` en los inputs numéricos de la tabla, y se redistribuyó el `flex` del formulario de alta (`select`/`input`/`button`) para que el placeholder largo "Factor (unidades base por presentación)" quepa completo.
   - Al pulsar botones de la tabla (cambiar factor, fijar base, dar de baja), el contenido de la fila cambiaba de forma y la tabla "saltaba". Se pasó a `table-layout: fixed` con anchos de columna fijos en escritorio, `min-height` fijo en la celda de acciones y botones más pequeños (`padding`/`font-size` reducidos, sin `box-shadow`).
   - "Fijar como base" dejó de inyectar inputs dentro de la fila de la tabla (causa del salto de layout) y ahora abre un **diálogo flotante** centrado que explica en español llano qué es el Factor, qué va a pasar (qué presentación deja de ser base y por qué hace falta un nuevo factor para ella) y pide ese valor con ejemplo numérico.
   - Los errores de las acciones de presentaciones (cambiar factor, fijar base, dar de alta/baja, añadir presentación) dejaron de imprimirse como texto plano dentro de la tabla — ahora se muestran en el mismo tipo de diálogo flotante, con el mensaje real que envía el backend (`ApiError.message`), que antes se descartaba en favor de un texto genérico fijo.
   - Encabezado de tabla y párrafo introductorio explican en la propia pantalla qué es una "presentación", qué es el "Factor" y qué es la "Base".

2. **Endpoints migrados de `POST`/`PUT` a `PATCH`** en los repositorios HTTP, siguiendo el cambio hecho en el backend:
   - `branch-http.repository.ts`: `activate`/`deactivate`.
   - `carrier-http.repository.ts`: `activate`/`deactivate`.
   - `supplier-http.repository.ts`: `activate`/`deactivate`.
   - `product-http.repository.ts`: `changeBaseUnit` (era `POST`) y `changeUnitFactor` (era `PUT`).

3. **Listas de precios (`price-list-form.page.ts`)**:
   - Modal flotante informativo al cargar la pantalla (`/price-lists/new` y edición) explicando en lenguaje no técnico qué es una lista de precios, cómo se le asigna precio a un producto dentro de ella, y cómo `sale.price_list_id` permite vender el mismo producto a valores distintos según la lista elegida al facturar.
   - Corregida la navegación tras crear una lista: antes volvía al listado (`/price-lists`) y la sección "Precio de un producto" —ya existente, pero solo visible en modo edición— quedaba escondida detrás de un link "Editar" sin ninguna pista de que ahí se fijan los precios. Ahora, al crear, redirige directo a `/price-lists/{id}/edit`.

4. **Módulo de usuarios, nuevo por completo** (no existía ninguna pantalla; el backend ya lo soportaba):
   - Dominio: `core/domain/models/user.model.ts` ampliado (`UserQuery`, `CreateUserInput`, `UpdateUserProfileInput`, `ReassignUserInput`; `User` ya existía y se reutilizó) y `core/domain/repositories/user.repository.ts`.
   - Infraestructura: `core/infrastructure/repositories/user-http.repository.ts` contra `GET/POST /organizations/{organizationId}/users`, `GET /users/{id}`, `PUT /users/{id}/profile`, `PUT /users/{id}/assignment`, `POST /users/{id}/activation`, `POST /users/{id}/deactivation`. DTOs propios en `user.dto.ts`, reutilizando `UserResponseDto` de `auth.dto.ts`.
   - Aplicación: `SearchUsersUseCase`, `GetUserUseCase`, `CreateUserUseCase`, `UpdateUserProfileUseCase`, `ReassignUserUseCase`, `SetUserStatusUseCase`.
   - Presentación: `UserListPage` (`/users`) con filtros por texto/rol/sucursal/estado y confirmación antes de dar de baja; `UserFormPage` para alta (`/users/new`) y edición (`/users/:id/edit`).
   - `UserRepository` registrado en `app.config.ts`; rutas `USERS_ROUTES` montadas en `app.routes.ts`; enlace "Usuarios" añadido al grupo "Organización" del sidebar, con icono nuevo.
   - Verificado con `npx tsc --noEmit` y `ng build --configuration development`: sin errores.

## Cómo se hizo (decisiones clave)

- **Diálogos flotantes en vez de estado inline en la tabla**: tanto "Fijar como base" como los errores de acciones de presentaciones pasaron de mutar el DOM dentro de la fila (causa del salto de layout reportado) a un overlay `position: fixed` centrado, mismo patrón visual que `app-confirm-dialog` (fondo semitransparente + tarjeta con borde superior de color). Mantiene la tabla estable sin importar cuántos textos largos meta la explicación.
- **Tres operaciones separadas en la edición de usuario, no un formulario único**: el backend expone `updateUserProfile`, `reassignUser` y `activateUser`/`deactivateUser` como endpoints independientes con reglas propias (rol+sucursal van acoplados y no se pueden separar; no se puede degradar/dar de baja al último administrador activo). `UserFormPage` refleja esa forma con tres secciones y tres botones de guardado independientes, en vez de simular un único `PUT` que el backend no ofrece — mismo criterio que ya usaba `PriceListFormPage` con "Precio de un producto".
- **Validación dinámica de sucursal obligatoria según el rol**: tanto en alta como en reasignación, el campo "Sucursal" solo aparece y se vuelve `required` cuando el rol elegido es `BRANCH_MANAGER` u `INVENTORY_OPERATOR` (RN-13); se sincroniza con `valueChanges` del control de rol en vez de dejarlo siempre visible u opcional.
- **Cambio de contraseña de otro usuario, fuera de alcance a propósito**: `changePassword` en APIDOC.json es explícito en que solo el propio dueño de la cuenta puede cambiarla (exige la contraseña actual); no existe una operación de "resetear contraseña" para el administrador, así que no se construyó pantalla para eso.
- **Cambio de método HTTP hecho por búsqueda puntual, no por auditoría completa del backend**: solo se migraron a `PATCH` los endpoints que el usuario confirmó explícitamente con el código Java del controlador (`branches`, `carriers`, `suppliers` activación/baja; `products` base-unit y factor de presentación). Otros endpoints de activación/baja (`categories`, `products`, `price-lists`, `logistics-routes`, presentaciones de producto) no se tocaron por no tener confirmación de que también cambiaron.

## Qué sigue

Pruebas unitarias pendientes en todo el proyecto (bloqueadas por falta de Chrome/`CHROME_BIN` en este entorno, arrastrado de fases anteriores). Quedaría por confirmar con el usuario si el resto de endpoints de activación/baja también migraron a `PATCH` en el backend, y si el bug de backend descrito en el turno anterior (`ux_product_unit_single_base`, cambio de unidad base) ya se corrigió del lado del servidor.
