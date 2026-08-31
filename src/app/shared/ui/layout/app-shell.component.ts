import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { fullName } from '../../../core/domain/models/user.model';
import { Role } from '../../../core/domain/enums/role.enum';
import { AuthStore } from '../../../core/state/auth-store.service';
import { LogoutUseCase } from '../../../core/application/auth/logout.usecase';

type NavIcon =
  | 'dashboard'
  | 'sales'
  | 'purchase-orders'
  | 'transfers'
  | 'inventory'
  | 'adjustments'
  | 'alerts'
  | 'branches'
  | 'products'
  | 'price-lists'
  | 'categories'
  | 'carriers'
  | 'routes'
  | 'suppliers'
  | 'units';

interface NavItem {
  label: string;
  path: string;
  icon: NavIcon;
  /** Roles que ven el enlace. Si se omite, todos los autenticados lo ven. */
  roles?: readonly Role[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: NavIcon;
  items: readonly NavItem[];
}

type NavEntry = { kind: 'link'; item: NavItem } | { kind: 'group'; group: NavGroup };

/**
 * Estructura del sidebar: un enlace suelto (Panel) seguido de categorías
 * plegables. Agrupar evita una lista plana de 15 enlaces (poco intuitiva)
 * — cada categoría se auto-expande cuando la ruta activa cae dentro de ella
 * (ver `activeGroupId`) y además se puede abrir/cerrar a mano.
 */
const NAV_STRUCTURE: readonly NavEntry[] = [
  { kind: 'link', item: { label: 'Panel', path: '/dashboard', icon: 'dashboard' } },
  {
    kind: 'group',
    group: {
      id: 'sales',
      label: 'Ventas y compras',
      icon: 'sales',
      items: [
        { label: 'Ventas', path: '/sales', icon: 'sales' },
        { label: 'Órdenes de compra', path: '/purchase-orders', icon: 'purchase-orders' },
      ],
    },
  },
  {
    kind: 'group',
    group: {
      id: 'inventory',
      label: 'Inventario',
      icon: 'inventory',
      items: [
        { label: 'Inventario', path: '/inventory', icon: 'inventory' },
        { label: 'Ajustes de inventario', path: '/inventory-adjustments', icon: 'adjustments' },
        { label: 'Alertas de inventario', path: '/inventory-alerts', icon: 'alerts' },
      ],
    },
  },
  {
    kind: 'group',
    group: {
      id: 'catalog',
      label: 'Catálogo',
      icon: 'products',
      items: [
        { label: 'Productos', path: '/products', icon: 'products' },
        { label: 'Categorías', path: '/categories', icon: 'categories' },
        { label: 'Listas de precios', path: '/price-lists', icon: 'price-lists' },
        { label: 'Unidades de medida', path: '/units-of-measure', icon: 'units' },
      ],
    },
  },
  {
    kind: 'group',
    group: {
      id: 'logistics',
      label: 'Logística',
      icon: 'routes',
      items: [
        { label: 'Transferencias', path: '/transfers', icon: 'transfers' },
        { label: 'Transportistas', path: '/carriers', icon: 'carriers' },
        { label: 'Rutas logísticas', path: '/logistics-routes', icon: 'routes' },
      ],
    },
  },
  {
    kind: 'group',
    group: {
      id: 'org',
      label: 'Organización',
      icon: 'branches',
      items: [
        { label: 'Sucursales', path: '/branches', icon: 'branches' },
        { label: 'Proveedores', path: '/suppliers', icon: 'suppliers' },
      ],
    },
  },
];

/**
 * Shell de la app autenticada: barra lateral de navegación (filtrada por
 * rol, agrupada en categorías plegables con icono) + barra superior con el
 * usuario/rol y cerrar sesión + `<router-outlet />` para la página activa.
 * Sustituye el placeholder que la Fase 1 dejó dentro de `DashboardPage`;
 * ahora cualquier feature nueva se monta como hija de esta ruta y hereda el
 * mismo layout (ver `app.routes.ts`).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #icon let-kind>
      <svg viewBox="0 0 24 24" class="nav-icon" aria-hidden="true">
        @switch (kind) {
          @case ('dashboard') {
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          }
          @case ('sales') {
            <path d="M3.5 4.5h2l2 12.5h11l1.5-8.5h-13" />
            <circle cx="9.5" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
          }
          @case ('purchase-orders') {
            <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
            <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
          }
          @case ('transfers') {
            <path d="M4 8h13M13 4l4 4-4 4" />
            <path d="M20 16H7M11 12l-4 4 4 4" />
          }
          @case ('inventory') {
            <path d="M3.5 7.5 12 3.5l8.5 4v9l-8.5 4-8.5-4v-9Z" />
            <path d="M3.5 7.5 12 11.5l8.5-4M12 11.5V20.5" />
          }
          @case ('adjustments') {
            <path d="M4 6h16M4 12h16M4 18h16" />
            <circle class="icon-dot" cx="9" cy="6" r="2" />
            <circle class="icon-dot" cx="16" cy="12" r="2" />
            <circle class="icon-dot" cx="10" cy="18" r="2" />
          }
          @case ('alerts') {
            <path d="M12 3.5c-3 0-5 2.3-5 5.5v3l-2 3.5h14l-2-3.5V9c0-3.2-2-5.5-5-5.5Z" />
            <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" />
          }
          @case ('branches') {
            <path d="M4 20.5h16M5.5 20.5V7l6.5-4 6.5 4v13.5" />
            <path d="M10 20.5v-5h4v5" />
          }
          @case ('products') {
            <path d="M3.5 7.5 12 3.5l8.5 4-8.5 4-8.5-4Z" />
            <path d="M3.5 7.5v9l8.5 4 8.5-4v-9" />
          }
          @case ('price-lists') {
            <path d="M12.5 3.5h6.5V10L10 19l-6.5-6.5L12.5 3.5Z" />
            <circle class="icon-dot" cx="16" cy="7.5" r="1.4" />
          }
          @case ('categories') {
            <rect x="3.5" y="3.5" width="8" height="8" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="12.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="14.5" width="8" height="6" rx="1.5" />
          }
          @case ('carriers') {
            <path d="M3 6.5h11v9H3v-9Z" />
            <path d="M14 10h4l3 3v2.5h-7V10Z" />
            <circle cx="7" cy="18" r="1.6" />
            <circle cx="17.5" cy="18" r="1.6" />
          }
          @case ('routes') {
            <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
            <circle cx="12" cy="9.5" r="2.2" />
          }
          @case ('suppliers') {
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
            <circle cx="17" cy="9" r="2.4" />
            <path d="M15.5 14.3c2.4.4 4 2.3 4 5.2" />
          }
          @case ('units') {
            <path d="M4 17.5 15 6.5" />
            <path d="M6 15.5l2 2M9 12.5l2 2M12 9.5l2 2" />
            <rect x="14.5" y="4" width="6" height="6" rx="1.2" transform="rotate(45 17.5 7)" />
          }
        }
      </svg>
    </ng-template>

    <div class="shell">
      @if (navOpen()) {
        <button
          type="button"
          class="backdrop"
          aria-label="Cerrar navegación"
          (click)="closeNav()"
        ></button>
      }

      <aside class="sidebar" [class.sidebar--open]="navOpen()">
        <div class="brand">
          <svg viewBox="0 0 24 24" class="brand__icon" aria-hidden="true">
            <path
              d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path d="M3 7l9 5 9-5M12 22V12" fill="none" stroke="currentColor" stroke-width="1.6" />
          </svg>
          <span>OptiPlant</span>
        </div>

        <nav>
          @for (entry of visibleStructure(); track entry.kind === 'link' ? entry.item.path : entry.group.id) {
            @if (entry.kind === 'link') {
              <a [routerLink]="entry.item.path" routerLinkActive="active" (click)="closeNav()">
                <ng-container [ngTemplateOutlet]="icon" [ngTemplateOutletContext]="{ $implicit: entry.item.icon }" />
                <span class="nav-label">{{ entry.item.label }}</span>
              </a>
            } @else {
              <div class="nav-group" [class.nav-group--open]="isGroupOpen(entry.group.id)">
                <button
                  type="button"
                  class="nav-group__header"
                  (click)="toggleGroup(entry.group.id)"
                  [attr.aria-expanded]="isGroupOpen(entry.group.id)"
                >
                  <ng-container [ngTemplateOutlet]="icon" [ngTemplateOutletContext]="{ $implicit: entry.group.icon }" />
                  <span class="nav-label">{{ entry.group.label }}</span>
                  <svg viewBox="0 0 24 24" class="nav-group__chevron" aria-hidden="true">
                    <path d="M7 9.5 12 14.5 17 9.5" />
                  </svg>
                </button>
                <div class="nav-group__panel">
                  <div class="nav-group__items">
                    @for (item of entry.group.items; track item.path) {
                      <a [routerLink]="item.path" routerLinkActive="active" (click)="closeNav()">
                        <ng-container [ngTemplateOutlet]="icon" [ngTemplateOutletContext]="{ $implicit: item.icon }" />
                        <span class="nav-label">{{ item.label }}</span>
                      </a>
                    }
                  </div>
                </div>
              </div>
            }
          }
        </nav>
      </aside>

      <div class="main">
        <header class="topbar">
          <button
            type="button"
            class="nav-toggle"
            (click)="toggleNav()"
            aria-label="Abrir navegación"
          >
            <svg viewBox="0 0 24 24" class="nav-toggle__icon" aria-hidden="true">
              <path d="M4 6.5h16M4 12h16M4 17.5h16" />
            </svg>
          </button>

          <div class="topbar__spacer"></div>

          @if (user(); as currentUser) {
            <div class="user-chip">
              <span class="user-chip__avatar">{{ initials(currentUser) }}</span>
              <span class="user-chip__text">
                <span class="user-chip__name">{{ fullName(currentUser) }}</span>
                <span class="user-chip__role">
                  <svg viewBox="0 0 24 24" class="user-chip__role-icon" aria-hidden="true">
                    <path d="M12 3 4 6.5v5c0 5 3.4 8.7 8 9.5 4.6-.8 8-4.5 8-9.5v-5L12 3Z" />
                  </svg>
                  {{ currentUser.roleName }}
                </span>
              </span>
            </div>
          }

          <button type="button" class="logout" (click)="logout()">
            <svg viewBox="0 0 24 24" class="logout__icon" aria-hidden="true">
              <path d="M9 3.5H5.5A1.5 1.5 0 0 0 4 5v14a1.5 1.5 0 0 0 1.5 1.5H9" />
              <path d="M16 16.5 21 12l-5-4.5M21 12H9" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly authStore = inject(AuthStore);
  private readonly logoutUseCase = inject(LogoutUseCase);
  private readonly router = inject(Router);

  protected readonly user = this.authStore.currentUser;
  protected readonly fullName = fullName;
  protected readonly navOpen = signal(false);

  /**
   * Override manual del usuario por grupo (true = forzado abierto, false =
   * forzado cerrado). Sin entrada aquí, el estado lo decide `activeGroupId`.
   */
  private readonly groupOverrides = signal<ReadonlyMap<string, boolean>>(new Map());

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Grupo que contiene la ruta activa: se auto-expande sin necesidad de clic. */
  private readonly activeGroupId = computed(() => {
    const url = this.currentUrl();
    for (const entry of NAV_STRUCTURE) {
      if (entry.kind === 'group' && entry.group.items.some((item) => url.startsWith(item.path))) {
        return entry.group.id;
      }
    }
    return null;
  });

  protected readonly visibleStructure = computed<readonly NavEntry[]>(() => {
    const role = this.authStore.role();
    const canSee = (item: NavItem) => !item.roles || (role !== null && item.roles.includes(role));

    return NAV_STRUCTURE.filter((entry) => entry.kind !== 'group' || entry.group.items.some(canSee))
      .map((entry) =>
        entry.kind === 'group'
          ? { kind: 'group' as const, group: { ...entry.group, items: entry.group.items.filter(canSee) } }
          : entry,
      )
      .filter((entry) => entry.kind !== 'link' || canSee(entry.item));
  });

  protected isGroupOpen(groupId: string): boolean {
    const override = this.groupOverrides().get(groupId);
    return override ?? this.activeGroupId() === groupId;
  }

  protected toggleGroup(groupId: string): void {
    const next = !this.isGroupOpen(groupId);
    this.groupOverrides.update((overrides) => new Map(overrides).set(groupId, next));
  }

  protected initials(user: { firstName: string; lastName: string }): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  protected toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected logout(): void {
    this.logoutUseCase.execute();
    void this.router.navigateByUrl('/login');
  }
}
