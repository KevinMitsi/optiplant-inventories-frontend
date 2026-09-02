import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateInventoryAdjustmentUseCase } from '../../../core/application/inventory-adjustments/create-inventory-adjustment.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { Product } from '../../../core/domain/models/product.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

type AdjustmentDirection = 'IN' | 'OUT';

interface AdjustmentItemForm {
  productId: FormControl<string>;
  direction: FormControl<AdjustmentDirection>;
  quantity: FormControl<number | null>;
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
  templateUrl: './inventory-adjustment-create.page.html',
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
    this.revalidateProducts();
  }

  /** Productos disponibles para la línea `index`: excluye los ya elegidos en otras líneas. */
  protected availableProducts(index: number): Product[] {
    const selectedElsewhere = new Set(
      this.form.controls.items.controls
        .filter((_, i) => i !== index)
        .map((control) => control.controls.productId.value)
        .filter((id): id is string => !!id),
    );
    return this.products().filter((product) => !selectedElsewhere.has(product.id));
  }

  /**
   * Marca/desmarca el error `duplicate` en cada línea según si su producto
   * se repite en otra — el filtro de `availableProducts` ya evita elegirlo,
   * esto es el resguardo por si dos líneas quedan iguales (p. ej. al quitar
   * una línea intermedia).
   */
  protected revalidateProducts(): void {
    const controls = this.form.controls.items.controls;
    const counts = new Map<string, number>();
    for (const control of controls) {
      const id = control.controls.productId.value;
      if (id) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    for (const control of controls) {
      const productControl = control.controls.productId;
      const id = productControl.value;
      const isDuplicate = !!id && (counts.get(id) ?? 0) > 1;
      const { duplicate, ...rest } = productControl.errors ?? {};

      if (isDuplicate) {
        productControl.setErrors({ ...rest, duplicate: true });
      } else if (duplicate) {
        productControl.setErrors(Object.keys(rest).length ? rest : null);
      }
    }
  }

  protected setDirection(index: number, direction: AdjustmentDirection): void {
    this.form.controls.items.at(index).controls.direction.setValue(direction);
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
        items: items.map(({ productId, direction, quantity, reason: itemReason }) => ({
          productId,
          quantityDelta: direction === 'OUT' ? -quantity! : quantity!,
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
      direction: new FormControl<AdjustmentDirection>('IN', { nonNullable: true }),
      quantity: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.000001)] }),
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
