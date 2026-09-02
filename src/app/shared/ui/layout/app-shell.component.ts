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
  | 'units'
  | 'users';

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
        { label: 'Usuarios', path: '/users', icon: 'users', roles: [Role.Admin, Role.BranchManager] },
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
  templateUrl: './app-shell.component.html',
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
