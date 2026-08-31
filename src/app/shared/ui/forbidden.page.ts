import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Se muestra cuando `roleGuard` bloquea el acceso por rol insuficiente. */
@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrapper">
      <h1>403</h1>
      <p>Tu rol no tiene permiso para ver esta sección.</p>
      <a routerLink="/dashboard">Volver al panel</a>
    </div>
  `,
  styles: `
    .wrapper {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      text-align: center;
      gap: 0.5rem;
    }
  `,
})
export class ForbiddenPage {}
