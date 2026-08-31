import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateSaleUseCase } from '../../../core/application/sales/create-sale.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { SearchPriceListsUseCase } from '../../../core/application/price-lists/search-price-lists.usecase';
import { Product } from '../../../core/domain/models/product.model';
import { PriceList } from '../../../core/domain/models/price-list.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface SaleItemForm {
  productId: FormControl<string>;
  productUnitId: FormControl<string>;
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
  discountPercentage: FormControl<number | null>;
}

interface SaleForm {
  saleNumber: FormControl<string>;
  saleDate: FormControl<string>;
  priceListId: FormControl<string>;
  notes: FormControl<string>;
  items: FormArray<FormGroup<SaleItemForm>>;
}

/**
 * Alta de una venta en borrador (HU-22): no descuenta inventario hasta que
 * se confirma desde `SaleDetailPage`. `unitPrice` de cada línea es opcional
 * — si se omite, el backend lo resuelve contra `priceListId` (HU-25); por
 * eso el campo se deja vacío por defecto en vez de forzar un valor.
 */
@Component({
  selector: 'app-sale-create-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Nueva venta</h1>

    <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label for="saleNumber">Número</label>
      <input id="saleNumber" formControlName="saleNumber" placeholder="V-2026-0001" />

      <label for="saleDate">Fecha</label>
      <input id="saleDate" type="date" formControlName="saleDate" />

      <label for="priceListId">Lista de precios (opcional)</label>
      <select id="priceListId" formControlName="priceListId">
        <option value="">Sin lista — precio manual por línea</option>
        @for (priceList of priceLists(); track priceList.id) {
          <option [value]="priceList.id">{{ priceList.code }} — {{ priceList.name }}</option>
        }
      </select>

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

          <label [for]="'productUnitId-' + $index">Presentación</label>
          <select [id]="'productUnitId-' + $index" [formControl]="item.controls.productUnitId">
            <option value="" disabled>Seleccione una presentación…</option>
            @for (unit of unitsForProduct(item.controls.productId.value); track unit.id) {
              <option [value]="unit.id">{{ unit.unit.symbol }} — {{ unit.unit.name }}</option>
            }
          </select>

          <label [for]="'quantity-' + $index">Cantidad</label>
          <input [id]="'quantity-' + $index" type="number" [formControl]="item.controls.quantity" step="any" min="0" />

          <label [for]="'unitPrice-' + $index">Precio unitario manual (opcional)</label>
          <input [id]="'unitPrice-' + $index" type="number" [formControl]="item.controls.unitPrice" step="any" min="0" />

          <label [for]="'discountPercentage-' + $index">Descuento % (opcional)</label>
          <input
            [id]="'discountPercentage-' + $index"
            type="number"
            [formControl]="item.controls.discountPercentage"
            step="any"
            min="0"
            max="100"
          />

          @if (form.controls.items.length > 1) {
            <button type="button" class="button button--ghost" (click)="removeItem($index)">Quitar línea</button>
          }
        </fieldset>
      }
      <button type="button" class="button button--ghost" (click)="addItem()">Añadir línea</button>

      @if (errorMessage(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }

      <div class="actions">
        <a routerLink="/sales" [queryParams]="branchQueryParams" class="button button--ghost">Cancelar</a>
        <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Creando…' : 'Crear venta' }}
        </button>
      </div>
    </form>
  `,
  styleUrl: './sale-create.page.scss',
})
export class SaleCreatePage {
  private readonly createSaleUseCase = inject(CreateSaleUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly searchPriceListsUseCase = inject(SearchPriceListsUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly products = signal<Product[]>([]);
  protected readonly priceLists = signal<PriceList[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly branchQueryParams = this.route.snapshot.queryParamMap.get('branchId')
    ? { branchId: this.route.snapshot.queryParamMap.get('branchId') }
    : {};

  private readonly branchId =
    this.authStore.currentUser()?.branchId ?? this.route.snapshot.queryParamMap.get('branchId');

  protected readonly form = new FormGroup<SaleForm>({
    saleNumber: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
    saleDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    priceListId: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    items: new FormArray<FormGroup<SaleItemForm>>([this.buildItem()]),
  });

  constructor() {
    this.loadProducts();
    this.loadPriceLists();
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
    const { saleNumber, saleDate, priceListId, notes, items } = this.form.getRawValue();

    this.createSaleUseCase
      .execute(this.branchId, {
        saleNumber,
        // `saleDate` de la API es `date-time`; el `<input type="date">` solo da fecha.
        saleDate: `${saleDate}T00:00:00`,
        priceListId: priceListId || undefined,
        notes: notes || undefined,
        items: items.map(({ productId, productUnitId, quantity, unitPrice, discountPercentage }) => ({
          productId,
          productUnitId,
          quantity: quantity!,
          unitPrice: unitPrice ?? undefined,
          discountPercentage: discountPercentage ?? undefined,
        })),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (sale) => void this.router.navigate(['/sales', sale.id]),
        error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo crear la venta.'),
      });
  }

  private buildItem(): FormGroup<SaleItemForm> {
    return new FormGroup<SaleItemForm>({
      productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      productUnitId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      quantity: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.000001)] }),
      unitPrice: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
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

  private loadPriceLists(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchPriceListsUseCase.execute(organizationId, { size: 100, active: true }).subscribe({
      next: (page) => this.priceLists.set(page.content),
    });
  }
}
