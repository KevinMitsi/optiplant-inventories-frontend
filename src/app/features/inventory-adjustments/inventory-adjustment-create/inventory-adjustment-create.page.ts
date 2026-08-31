import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateInventoryAdjustmentUseCase } from '../../../core/application/inventory-adjustments/create-inventory-adjustment.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { Product } from '../../../core/domain/models/product.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface AdjustmentItemForm {
  productId: FormControl<string>;
  quantityDelta: FormControl<number | null>;
  reason: FormControl<string>;
}

interface AdjustmentForm {
  reason: FormControl<string>;
  items: FormArray<FormGroup<AdjustmentItemForm>>;
}

/**
 * Alta de un ajuste de inventario en borrador (HU-15/RN-14: corrección
 * formal, con al menos una línea, que no mueve stock hasta su aprobación
 * posterior en `InventoryAdjustmentDetailPage`). Cada línea admite un motivo
 * propio, que sobreescribe al motivo general si difiere (`InventoryAdjustmentItemRequest`).
 */
@Component({
  selector: 'app-inventory-adjustment-create-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Nuevo ajuste de inventario</h1>

    <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label for="reason">Motivo general</label>
      <input id="reason" formControlName="reason" placeholder="Conteo físico de fin de mes" />
      @if (form.controls.reason.invalid && form.controls.reason.touched) {
        <p class="field-error" role="alert">
          {{
            form.controls.reason.hasError('required') ? 'El motivo general es obligatorio.' : 'Máximo 250 caracteres.'
          }}
        </p>
      }

      <h2>Líneas</h2>
      @for (item of form.controls.items.controls; track $index) {
        <fieldset class="item-row">
          <legend>Línea {{ $index + 1 }}</legend>
          <label [for]="'productId-' + $index">Producto</label>
          <select [id]="'productId-' + $index" [formControl]="item.controls.productId">
            <option value="" disabled>Seleccione un producto…</option>
            @for (product of products(); track product.id) {
              <option [value]="product.id">{{ product.sku }} — {{ product.name }}</option>
            }
          </select>
          @if (item.controls.productId.invalid && item.controls.productId.touched) {
            <p class="field-error" role="alert">Selecciona un producto.</p>
          }

          <label [for]="'quantityDelta-' + $index">Cantidad (con signo: positivo entra, negativo sale)</label>
          <input
            [id]="'quantityDelta-' + $index"
            type="number"
            [formControl]="item.controls.quantityDelta"
            step="any"
          />
          @if (item.controls.quantityDelta.invalid && item.controls.quantityDelta.touched) {
            <p class="field-error" role="alert">La cantidad es obligatoria.</p>
          }

          <label [for]="'itemReason-' + $index">Motivo de la línea (opcional)</label>
          <input [id]="'itemReason-' + $index" [formControl]="item.controls.reason" />
          @if (item.controls.reason.invalid && item.controls.reason.touched) {
            <p class="field-error" role="alert">Máximo 250 caracteres.</p>
          }

          @if (form.controls.items.length > 1) {
            <button type="button" class="button button--ghost" (click)="removeItem($index)">Quitar línea</button>
          }
        </fieldset>
      }
      <button type="button" class="button button--ghost" (click)="addItem()">Añadir línea</button>

      @if (errorMessage(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }

      @if (form.invalid && form.touched) {
        <p class="form-error" role="alert">Revisa los campos marcados en rojo antes de guardar.</p>
      }

      <div class="actions">
        <a routerLink="/inventory-adjustments" class="button button--ghost">Cancelar</a>
        <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Creando…' : 'Crear ajuste' }}
        </button>
      </div>
    </form>
  `,
  styleUrl: './inventory-adjustment-create.page.scss',
})
export class InventoryAdjustmentCreatePage {
  private readonly createInventoryAdjustmentUseCase = inject(CreateInventoryAdjustmentUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly products = signal<Product[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly branchId =
    this.authStore.currentUser()?.branchId ?? this.route.snapshot.queryParamMap.get('branchId');

  protected readonly form = new FormGroup<AdjustmentForm>({
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(250)] }),
    items: new FormArray<FormGroup<AdjustmentItemForm>>([this.buildItem()]),
  });

  constructor() {
    this.loadProducts();
  }

  protected addItem(): void {
    this.form.controls.items.push(this.buildItem());
  }

  protected removeItem(index: number): void {
    this.form.controls.items.removeAt(index);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting() || !this.branchId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { reason, items } = this.form.getRawValue();

    this.createInventoryAdjustmentUseCase
      .execute(this.branchId, {
        reason,
        items: items.map(({ productId, quantityDelta, reason: itemReason }) => ({
          productId,
          quantityDelta: quantityDelta!,
          reason: itemReason || undefined,
        })),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (adjustment) => void this.router.navigate(['/inventory-adjustments', adjustment.id]),
        error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo crear el ajuste.'),
      });
  }

  private buildItem(): FormGroup<AdjustmentItemForm> {
    return new FormGroup<AdjustmentItemForm>({
      productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      quantityDelta: new FormControl<number | null>(null, { validators: [Validators.required] }),
      reason: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(250)] }),
    });
  }

  private loadProducts(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchProductsUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe({ next: (page) => this.products.set(page.content) });
  }
}
