# Fase 1 — Fundación de arquitectura limpia y autenticación

## Qué se hizo

1. **Estructura de Clean Architecture** bajo `src/app/core` y `src/app/features`:
   - `core/domain`: entidades (`User`, `AuthSession`, `Credentials`, `ApiError`, `Page<T>`), el enum `Role` y el puerto `AuthRepository` (clase abstracta). No importa nada de infraestructura ni de Angular HTTP.
   - `core/application`: casos de uso (`LoginUseCase`, `LogoutUseCase`, `RefreshSessionUseCase`, `BootstrapSessionUseCase`) que orquestan el dominio con los efectos de infraestructura y de estado.
   - `core/infrastructure`: DTOs (`http/dtos`), mappers DTO→dominio (`mappers`), la implementación HTTP del repositorio (`repositories/auth-http.repository.ts`), interceptores (`http/*.interceptor.ts`) y almacenamiento (`storage/cookie.service.ts`, `storage/token-storage.service.ts`).
   - `core/state`: `AuthStore`, estado de sesión en memoria basado en signals.
   - `core/guards`: `authGuard`, `guestGuard`, `roleGuard`.
   - `features/auth` y `features/dashboard`: páginas standalone, cargadas de forma diferida (lazy).
2. **Modelado de entidades** a partir de `APIDOC.json` (schemas `UserResponse`, `AuthenticationResponse`, `LoginRequest`, `RefreshTokenRequest`, `ApiError`, `ValidationError`, `PageResponse`). Los DTOs quedan aislados en infraestructura; el resto de la app trabaja con los tipos de `core/domain/models`.
3. **Autenticación completa contra `/api/v1/auth/*`**:
   - `POST /auth/login` → `LoginUseCase`.
   - `POST /auth/refresh` → `RefreshSessionUseCase`, coordinado por `RefreshCoordinatorService` para deduplicar renovaciones concurrentes.
   - `GET /auth/me` → usado por `BootstrapSessionUseCase` al arrancar la app (vía `provideAppInitializer`), para resolver si hay sesión válida antes de que el router evalúe cualquier guard.
4. **JWT en cookies**: `TokenStorageService` guarda `accessToken` y `refreshToken` en cookies separadas (vidas distintas, acorde a `expiresIn` del backend y una vida larga de 30 días para el refresh), usando `CookieService` (seguro para SSR: no toca `document` en el servidor). El usuario (`User`) **no** se guarda en cookie: vive en memoria (`AuthStore`) y se recarga con `/auth/me`, siguiendo la recomendación explícita del backend en APIDOC.json (evita operar con un rol o sucursal ya caducados).
5. **Interceptores HTTP** (`app.config.ts`, orden explicado ahí mismo):
   - `authInterceptor`: adjunta `Authorization: Bearer <token>` a toda petición a la API salvo login/refresh.
   - `refreshInterceptor`: ante un 401, renueva la sesión una vez (vía `RefreshCoordinatorService`) y reintenta la petición original; si la renovación falla, cierra sesión local y redirige a `/login`.
   - `errorNormalizerInterceptor`: convierte cualquier error HTTP a `ApiError` (forma documentada en APIDOC.json) o `UnknownApiError` (fallo de red), para que ninguna feature lea un `HttpErrorResponse` crudo.
6. **Guards por rol**: `authGuard` (exige sesión), `guestGuard` (solo para anónimos, p. ej. `/login`), `roleGuard(rolesPermitidos)` (exige sesión + rol permitido, redirige a `/forbidden` si el rol no alcanza). Se apoyan en `AuthStore`, que ya está resuelto para cuando el router los evalúa.
7. **Login funcional de punta a punta**: formulario reactivo (`LoginPage`, standalone, `OnPush`, signals para `submitting`/`errorMessage`), `DashboardPage` placeholder protegido por `authGuard`, `ForbiddenPage` para el 403 de rol.
8. **Entornos**: `src/environments/environment.ts` (prod, `apiBaseUrl: '/api/v1'`) y `environment.development.ts` (`http://localhost:8080/api/v1`), enlazados en `angular.json` vía `fileReplacements`.
9. Limpieza del scaffold inicial de Angular CLI (`app.html`, `app.ts`, `app.spec.ts`) para dejar solo `<router-outlet />`.

## Cómo se hizo (decisiones clave)

- **Puerto de dominio como clase abstracta, no `interface`**: TypeScript borra las interfaces en tiempo de compilación, y Angular necesita un token de inyección real. `AuthRepository` es una clase abstracta que actúa de contrato; `AuthHttpRepository` la implementa y se enlaza en `app.config.ts` con `{ provide: AuthRepository, useClass: AuthHttpRepository }`. Esto es lo que hace cumplir la regla de dependencia de Clean Architecture: el dominio no conoce `HttpClient`.
- **Casos de uso como servicios `providedIn: 'root'`**, no como funciones sueltas: mantiene inyección de dependencias idiomática de Angular y permite que los componentes solo dependan de un caso de uso concreto, no de repositorios ni de `TokenStorageService` directamente.
- **Cookies no-`HttpOnly`**: el backend devuelve los tokens en el **cuerpo JSON** de la respuesta (`AuthenticationResponse`), no en cabeceras `Set-Cookie`. Por tanto es el cliente quien debe persistirlos, lo que obliga a que sean legibles por JavaScript. Se mitiga con `SameSite=Strict` y `Secure` (fuera de `localhost`). Queda documentado como trade-off, no como descuido.
- **`AuthStore.status` con tres estados** (`unknown` | `authenticated` | `anonymous`) en vez de un simple booleano: evita que un guard decida antes de que se sepa si hay sesión. Se resuelve una única vez en `provideAppInitializer`, que bloquea el bootstrap de la app hasta tener respuesta — así los guards nunca ven `unknown`.
- **Deduplicación de refresh concurrente**: si 3 peticiones en paralelo reciben 401 a la vez, sin coordinación dispararían 3 llamadas a `/auth/refresh` con el mismo refresh token, lo cual el backend no garantiza que sea seguro. `RefreshCoordinatorService` comparte una única llamada en curso (`share()` + `finalize()`).
- **Orden de interceptores** (`authInterceptor → errorNormalizerInterceptor → refreshInterceptor`): en la petición saliente pasan en ese orden; en la respuesta de error ocurre al revés (el interceptor registrado último es el más cercano al backend), así que `refreshInterceptor` ve el `HttpErrorResponse` crudo primero (necesita el `status` real para detectar 401) y solo lo que sobrevive a su reintento llega a `errorNormalizerInterceptor` para normalizarse a `ApiError`.
- **`RenderMode.Server` en vez de `Prerender`** (`app.routes.server.ts`): esta app depende de cookies de sesión por usuario; pre-renderizar en build time congelaría una respuesta sin sesión para todo el mundo. Se renderiza en el servidor por petición.
- **Zoneless + Signals**: la app ya traía `provideZonelessChangeDetection()`; todo el estado nuevo (`AuthStore`, señales de los componentes) se apoya en signals, sin `Zone.js` ni `BehaviorSubject` para estado local, conforme a `CLAUDE.md`.

## Limitación conocida (para la Fase 2)

- El *forwarding* de cookies en SSR (leer la cookie de la petición HTTP entrante en el servidor Express y usarla para las llamadas a la API hechas durante el render) **no está implementado todavía**. Hoy, en el servidor, `CookieService` no tiene acceso a las cookies del navegador del visitante (solo existen en el `Request` de Express), así que el primer render SSR de una página protegida siempre parte de `anonymous` y el guard redirige a `/login`; la hidratación en el cliente sí lee la cookie real y corrige el estado. Para una app típica esto se nota como un parpadeo o una redirección server→client en la primera carga. Pendiente: introducir un token de inyección con la cookie de la petición entrante (usando el contexto de request del `AngularNodeAppEngine`/`REQUEST` de `@angular/ssr`) y una URL base absoluta para `HttpClient` en el servidor (hoy `environment.apiBaseUrl` es relativa en producción, lo cual falla en Node sin origen).

## Qué sigue (Fase 2 propuesta)

1. Resolver el forwarding de cookies + URL base absoluta en SSR (limitación de arriba).
2. Modelar el resto de entidades de `APIDOC.json` (Organization/Branch, Product + ProductUnit, UnitOfMeasure, Category, Supplier, Carrier, LogisticsRoute, PriceList) como se hizo con `User`/`AuthSession`: DTOs, mappers, puertos de dominio, implementaciones HTTP.
3. Capa compartida de listados paginados: un `PageRepositoryPort` genérico o un mixin/composable sobre `Page<T>`, más un componente de tabla/paginación reutilizable en `shared/ui`.
4. CRUD de **Sucursales** (`/organizations/{id}/branches`, `/branches/{id}`, activación/desactivación) como primer módulo de negocio completo, protegido con `roleGuard([Role.Admin])` donde corresponda — sirve de plantilla para los módulos siguientes (productos, proveedores, categorías...).
5. Layout de aplicación autenticada (barra lateral de navegación por rol, breadcrumbs) en `shared/ui`, reemplazando el placeholder de `DashboardPage`.
