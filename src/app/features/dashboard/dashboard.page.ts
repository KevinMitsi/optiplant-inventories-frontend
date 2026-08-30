import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { fullName } from '../../core/domain/models/user.model';
import { AuthStore } from '../../core/state/auth-store.service';
import { LogoutUseCase } from '../../core/application/auth/logout.usecase';
import { Router } from '@angular/router';

/**
 * Placeholder de aterrizaje tras iniciar sesión. Las fases siguientes lo
 * sustituirán por el panel real (resumen de ventas, alertas de inventario...)
 * definido en `/api/v1/organizations/{organizationId}/dashboard/*`.
 */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div>
        <strong>OptiPlant</strong>
        @if (user(); as currentUser) {
          <span class="user-chip">{{ fullName(currentUser) }} · {{ currentUser.roleName }}</span>
        }
      </div>
      <button type="button" (click)="logout()">Cerrar sesión</button>
    </header>
    <main class="content">
      <p>Fase 1 completada: autenticación, guards y modelado de dominio en pie.</p>
      <p>Las siguientes fases irán añadiendo aquí cada módulo de negocio.</p>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: #101828;
      color: white;
    }

    .user-chip {
      margin-left: 0.75rem;
      font-size: 0.875rem;
      color: #d0d5dd;
    }

    button {
      border: 1px solid #344054;
      background: transparent;
      color: white;
      padding: 0.5rem 0.9rem;
      border-radius: 0.5rem;
      cursor: pointer;
    }

    .content {
      padding: 1.5rem;
    }
  `,
})
export class DashboardPage {
  private readonly authStore = inject(AuthStore);
  private readonly logoutUseCase = inject(LogoutUseCase);
  private readonly router = inject(Router);

  protected readonly user = this.authStore.currentUser;
  protected readonly fullName = fullName;

  protected logout(): void {
    this.logoutUseCase.execute();
    void this.router.navigateByUrl('/login');
  }
}
