import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreatePurchaseOrderUseCase } from '../../../core/application/purchase-orders/create-purchase-order.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { SearchSuppliersUseCase } from '../../../core/application/suppliers/search-suppliers.usecase';
import { Product } from '../../../core/domain/models/product.model';
import { Supplier } from '../../../core/domain/models/supplier.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface PurchaseOrderItemForm {
  productId: FormControl<string>;
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
  discountPercentage: FormControl<number | null>;
}

interface PurchaseOrderForm {
  supplierId: FormControl<string>;
  orderNumber: FormControl<string>;
  orderDate: FormControl<string>;
  paymentTermDays: FormControl<number | null>;
  notes: FormControl<string>;
  items: FormArray<FormGroup<PurchaseOrderItemForm>>;
}

/**
 * Alta de una orden de compra en borrador (HU-17/HU-18): no afecta
 * inventario hasta que se confirma y se reciben sus líneas desde
 * `PurchaseOrderDetailPage`. A diferencia de Ventas, `unitPrice` de cada
 * línea es obligatorio (precio pactado con el proveedor, sin lista de
 * precios que lo resuelva).
 */
@Component({
  selector: 'app-purchase-order-create-page',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purchase-order-create.page.html',
  styleUrl: './purchase-order-create.page.scss',
})
export class PurchaseOrderCreatePage {
  private readonly createPurchaseOrderUseCase = inject(CreatePurchaseOrderUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly searchSuppliersUseCase = inject(SearchSuppliersUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly products = signal<Product[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly branchQueryParams = this.route.snapshot.queryParamMap.get('branchId')
    ? { branchId: this.route.snapshot.queryParamMap.get('branchId') }
    : {};

  private readonly branchId =
    this.authStore.currentUser()?.branchId ?? this.route.snapshot.queryParamMap.get('branchId');

  protected readonly form = new FormGroup<PurchaseOrderForm>({
    supplierId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    orderNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40)],
    }),
    orderDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    paymentTermDays: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    notes: new FormControl('', { nonNullable: true }),
    items: new FormArray<FormGroup<PurchaseOrderItemForm>>([this.buildItem()]),
  });

  constructor() {
    this.loadProducts();
    this.loadSuppliers();
  }

  protected addItem(): void {
    this.form.controls.items.push(this.buildItem());
  }

  protected removeItem(index: number): void {
    this.form.controls.items.removeAt(index);
  }

  /**
   * Precio de la línea ya con el descuento aplicado, solo informativo: el
   * `discountPercentage` ya viaja tal cual en el payload, esto solo evita
   * que el usuario tenga que calcularlo a mano.
   */
  protected discountedUnitPrice(item: FormGroup<PurchaseOrderItemForm>): number | null {
    const unitPrice = item.controls.unitPrice.value;
    const discountPercentage = item.controls.discountPercentage.value;
    if (unitPrice === null || unitPrice === undefined || !discountPercentage) {
      return null;
    }
    return unitPrice * (1 - discountPercentage / 100);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting() || !this.branchId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { supplierId, orderNumber, orderDate, paymentTermDays, notes, items } = this.form.getRawValue();

    this.createPurchaseOrderUseCase
      .execute(this.branchId, {
        supplierId,
        orderNumber,
        orderDate,
        paymentTermDays: paymentTermDays ?? undefined,
        notes: notes || undefined,
        items: items.map(({ productId, quantity, unitPrice, discountPercentage }) => ({
          productId,
          quantity: quantity!,
          unitPrice: unitPrice!,
          discountPercentage: discountPercentage ?? undefined,
        })),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (order) => void this.router.navigate(['/purchase-orders', order.id]),
        error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo crear la orden de compra.'),
      });
  }

  private buildItem(): FormGroup<PurchaseOrderItemForm> {
    return new FormGroup<PurchaseOrderItemForm>({
      productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      quantity: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.000001)] }),
      unitPrice: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
      discountPercentage: new FormControl<number | null>(null, {
        validators: [Validators.min(0), Validators.max(100)],
      }),
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

  private loadSuppliers(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchSuppliersUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe({ next: (page) => this.suppliers.set(page.content) });
  }
}
