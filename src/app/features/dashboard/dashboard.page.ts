import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder de aterrizaje tras iniciar sesión. Fases siguientes lo
 * sustituirán por el panel real (resumen de ventas, alertas de inventario...)
 * definido en `/api/v1/organizations/{organizationId}/dashboard/*`. El
 * topbar/nav ahora vive en `AppShellComponent` (ver `app.routes.ts`).
 */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Panel</h1>
    <p>Fase 2: gestión de sucursales disponible en el menú.</p>
  `,
})
export class DashboardPage {}
