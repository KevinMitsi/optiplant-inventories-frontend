import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

/**
 * Puerta de entrada al módulo de ajustes: la API no expone un listado
 * (`GET /branches/{branchId}/inventory-adjustments` no existe), así que en
 * vez de fabricar una tabla que el backend no puede llenar, se ofrece
 * consultar un ajuste por su identificador (compartido al crearlo) o crear
 * uno nuevo. Mismo criterio que la consulta puntual de precio de producto en
 * `PriceListFormPage` (Fase 5).
 */
@Component({
  selector: 'app-inventory-adjustment-lookup-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Ajustes de inventario</h1>
      <a routerLink="new" class="button button--primary">Nuevo ajuste</a>
    </div>

    <p class="hint">
      No hay un listado de ajustes; consulte uno por su identificador (visible al crearlo o aprobarlo).
    </p>

    <form class="filters" [formGroup]="form" (ngSubmit)="lookup()">
      <input formControlName="adjustmentId" placeholder="Identificador del ajuste" />
      <button type="submit" class="button button--ghost" [disabled]="form.invalid">Consultar</button>
    </form>
  `,
  styleUrl: './inventory-adjustment-lookup.page.scss',
})
export class InventoryAdjustmentLookupPage {
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    adjustmentId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected lookup(): void {
    if (this.form.invalid) {
      return;
    }

    void this.router.navigate(['/inventory-adjustments', this.form.getRawValue().adjustmentId]);
  }
}
