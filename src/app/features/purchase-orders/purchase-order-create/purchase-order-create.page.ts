import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  productUnitId: FormControl<string>;
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
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Nueva orden de compra</h1>

    <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label for="supplierId">Proveedor</label>
      <select id="supplierId" formControlName="supplierId">
        <option value="" disabled>Seleccione un proveedor…</option>
        @for (supplier of suppliers(); track supplier.id) {
          <option [value]="supplier.id">{{ supplier.code }} — {{ supplier.name }}</option>
        }
      </select>
      @if (form.controls.supplierId.invalid && form.controls.supplierId.touched) {
        <p class="field-error" role="alert">Selecciona un proveedor.</p>
      }

      <label for="orderNumber">Número</label>
      <input id="orderNumber" formControlName="orderNumber" placeholder="OC-2026-0001" />
      @if (form.controls.orderNumber.invalid && form.controls.orderNumber.touched) {
        <p class="field-error" role="alert">
          {{
            form.controls.orderNumber.hasError('required') ? 'El número es obligatorio.' : 'Máximo 40 caracteres.'
          }}
        </p>
      }

      <label for="orderDate">Fecha</label>
      <input id="orderDate" type="date" formControlName="orderDate" />
      @if (form.controls.orderDate.invalid && form.controls.orderDate.touched) {
        <p class="field-error" role="alert">La fecha es obligatoria.</p>
      }

      <label for="paymentTermDays">Plazo de pago, en días (opcional)</label>
      <input id="paymentTermDays" type="number" formControlName="paymentTermDays" step="1" min="0" />
      @if (form.controls.paymentTermDays.invalid && form.controls.paymentTermDays.touched) {
        <p class="field-error" role="alert">No puede ser negativo.</p>
      }

      <label for="notes">Notas (opcional)</label>
      <input id="notes" formControlName="notes" />

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

          <label [for]="'productUnitId-' + $index">Presentación</label>
          <select [id]="'productUnitId-' + $index" [formControl]="item.controls.productUnitId">
            <option value="" disabled>Seleccione una presentación…</option>
            @for (unit of unitsForProduct(item.controls.productId.value); track unit.id) {
              <option [value]="unit.id">{{ unit.unit.symbol }} — {{ unit.unit.name }}</option>
            }
          </select>
          @if (item.controls.productUnitId.invalid && item.controls.productUnitId.touched) {
            <p class="field-error" role="alert">Selecciona una presentación.</p>
          }

          <label [for]="'quantity-' + $index">Cantidad</label>
          <input [id]="'quantity-' + $index" type="number" [formControl]="item.controls.quantity" step="any" min="0" />
          @if (item.controls.quantity.invalid && item.controls.quantity.touched) {
            <p class="field-error" role="alert">
              {{
                item.controls.quantity.hasError('required') ? 'La cantidad es obligatoria.' : 'Debe ser mayor que 0.'
              }}
            </p>
          }

          <label [for]="'unitPrice-' + $index">Precio unitario pactado</label>
          <input [id]="'unitPrice-' + $index" type="number" [formControl]="item.controls.unitPrice" step="any" min="0" />
          @if (item.controls.unitPrice.invalid && item.controls.unitPrice.touched) {
            <p class="field-error" role="alert">
              {{
                item.controls.unitPrice.hasError('required')
                  ? 'El precio unitario es obligatorio.'
                  : 'No puede ser negativo.'
              }}
            </p>
          }

          <label [for]="'discountPercentage-' + $index">Descuento % (opcional)</label>
          <input
            [id]="'discountPercentage-' + $index"
            type="number"
            [formControl]="item.controls.discountPercentage"
            step="any"
            min="0"
            max="100"
          />
          @if (item.controls.discountPercentage.invalid && item.controls.discountPercentage.touched) {
            <p class="field-error" role="alert">Debe estar entre 0 y 100.</p>
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
        <a routerLink="/purchase-orders" [queryParams]="branchQueryParams" class="button button--ghost">Cancelar</a>
        <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Creando…' : 'Crear orden' }}
        </button>
      </div>
    </form>
  `,
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

  protected unitsForProduct(productId: string) {
    return this.products().find((product) => product.id === productId)?.units ?? [];
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
    const { supplierId, orderNumber, orderDate, paymentTermDays, notes, items } = this.form.getRawValue();

    this.createPurchaseOrderUseCase
      .execute(this.branchId, {
        supplierId,
        orderNumber,
        orderDate,
        paymentTermDays: paymentTermDays ?? undefined,
        notes: notes || undefined,
        items: items.map(({ productId, productUnitId, quantity, unitPrice, discountPercentage }) => ({
          productId,
          productUnitId,
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
      productUnitId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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
