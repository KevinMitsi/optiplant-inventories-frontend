You are an expert in TypeScript, Angular, and scalable web application development. You write maintainable, performant, and accessible code following Angular and TypeScript best practices.

YOU MUST ALWAYS USE REACTIVEFORMS for creating forms

## TypeScript Best Practices  

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Architecture

src/
├── app/
│   ├── core/                  # Singleton globales de la app (interceptores, guards, layouts base)
│   ├── shared/                # Componentes UI reutilizables genéricos (botones, modales, diseño base)
│   └── features/              # Módulos de negocio (ej. gestión de usuarios)
│       └── users/
│           ├── domain/        # 1. Reglas de negocio puras (independientes de Angular)
│           │   ├── models/    # Entidades einterfaces de TypeScript (ej. user.model.ts)
│           │   └── ports/     # Interfaces/Abstracciones de repositorios (ej. user.repository.ts)
│           ├── application/   # 2. Casos de uso (Orquestación de la lógica)
│           │   └── get-users.use-case.ts
│           ├── infrastructure/# 3. Detalles externos (APIs, mappers, persistencia)
│           │   ├── datasources/ # Llamadas HTTP con HttpClient
│           │   ├── mappers/   # Transformadores de DTO a Entidades de Dominio
│           │   └── repositories-impl/ # Implementación de los puertos del dominio
│           └── presentation/  # 4. Interfaz de usuario (Angular puro)
│               ├── components/# Componentes visuales y contenedores (Standalone)
│               └── user.routes.ts # Rutas específicas del feature con carga perezosa (lazy load)
