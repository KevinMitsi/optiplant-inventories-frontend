import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Se muestra cuando `roleGuard` bloquea el acceso por rol insuficiente. */
@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forbidden.page.html',
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
