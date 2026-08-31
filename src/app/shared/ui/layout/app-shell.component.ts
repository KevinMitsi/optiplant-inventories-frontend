import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { fullName } from '../../../core/domain/models/user.model';
import { Role } from '../../../core/domain/enums/role.enum';
import { AuthStore } from '../../../core/state/auth-store.service';
import { LogoutUseCase } from '../../../core/application/auth/logout.usecase';

interface NavItem {
  label: string;
  path: string;
  /** Roles que ven el enlace. Si se omite, todos los autenticados lo ven. */
  roles?: readonly Role[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Panel', path: '/dashboard' },
  { label: 'Sucursales', path: '/branches' },
  { label: 'Productos', path: '/products' },
  { label: 'Categorías', path: '/categories' },
  { label: 'Transportistas', path: '/carriers' },
  { label: 'Proveedores', path: '/suppliers' },
  { label: 'Unidades de medida', path: '/units-of-measure' },
];

/**
 * Shell de la app autenticada: barra lateral de navegación (filtrada por
 * rol) + barra superior con el usuario y cerrar sesión + `<router-outlet />`
 * para la página activa. Sustituye el placeholder que la Fase 1 dejó dentro
 * de `DashboardPage`; ahora cualquier feature nueva se monta como hija de
 * esta ruta y hereda el mismo layout (ver `app.routes.ts`).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <aside class="sidebar" [class.sidebar--open]="navOpen()">
        <div class="brand">OptiPlant</div>
        <nav>
          @for (item of visibleNavItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" (click)="closeNav()">{{
              item.label
            }}</a>
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
            ☰
          </button>
          @if (user(); as currentUser) {
            <span class="user-chip">{{ fullName(currentUser) }} · {{ currentUser.roleName }}</span>
          }
          <button type="button" class="logout" (click)="logout()">Cerrar sesión</button>
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

  protected readonly visibleNavItems = computed(() => {
    const role = this.authStore.role();
    return NAV_ITEMS.filter((item) => !item.roles || (role !== null && item.roles.includes(role)));
  });

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
