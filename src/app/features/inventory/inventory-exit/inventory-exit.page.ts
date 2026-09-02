import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RegisterInventoryExitUseCase } from '../../../core/application/inventory/register-inventory-exit.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { Product } from '../../../core/domain/models/product.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface InventoryExitForm {
  productId: FormControl<string>;
  quantity: FormControl<number | null>;
  reason: FormControl<string>;
}

/**
 * Salida manual de inventario, sin documento de origen: merma u otra baja
 * libre (HU-13). Se postea como `LOSS_OUT`; falla con 422 si no hay stock
 * suficiente (RN-03).
 */
@Component({
  selector: 'app-inventory-exit-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-exit.page.html',
  styleUrl: './inventory-exit.page.scss',
})
export class InventoryExitPage {
  private readonly registerInventoryExitUseCase = inject(RegisterInventoryExitUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly products = signal<Product[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly branchQueryParams = this.route.snapshot.queryParamMap.get('branchId')
    ? { branchId: this.route.snapshot.queryParamMap.get('branchId') }
    : {};

  private readonly branchId =
    this.authStore.currentUser()?.branchId ?? this.route.snapshot.queryParamMap.get('branchId');

  protected readonly form = new FormGroup<InventoryExitForm>({
    productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    quantity: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.000001)] }),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(250)] }),
  });

  constructor() {
    this.loadProducts();
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting() || !this.branchId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { productId, quantity, reason } = this.form.getRawValue();

    this.registerInventoryExitUseCase
      .execute(this.branchId, { productId, quantity: quantity!, reason })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/inventory'], { queryParams: this.branchQueryParams }),
        error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo registrar la salida.'),
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
