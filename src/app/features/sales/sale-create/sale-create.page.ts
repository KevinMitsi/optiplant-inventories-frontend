import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
  discountPercentage: FormControl<number | null>;
}

/** Impide fechas de venta futuras (una venta no puede ocurrir después de hoy). */
function notFutureDateValidator(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  return control.value > new Date().toISOString().slice(0, 10) ? { futureDate: true } : null;
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
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Nueva venta</h1>

    <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label for="saleNumber">Número</label>
      <input id="saleNumber" formControlName="saleNumber" placeholder="V-2026-0001" />
      @if (form.controls.saleNumber.invalid && form.controls.saleNumber.touched) {
        <p class="field-error" role="alert">
          {{ form.controls.saleNumber.hasError('required') ? 'El número es obligatorio.' : 'Máximo 40 caracteres.' }}
        </p>
      }

      <label for="saleDate">Fecha</label>
      <input id="saleDate" type="date" formControlName="saleDate" [max]="today" />
      @if (form.controls.saleDate.invalid && form.controls.saleDate.touched) {
        <p class="field-error" role="alert">
          {{
            form.controls.saleDate.hasError('required')
              ? 'La fecha es obligatoria.'
              : 'La fecha no puede ser posterior a hoy.'
          }}
        </p>
      }

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
          <select [id]="'productId-' + $index" [formControl]="item.controls.productId" (change)="revalidateProducts()">
            <option value="" disabled>Seleccione un producto…</option>
            @for (product of availableProducts($index); track product.id) {
              <option [value]="product.id">{{ product.sku }} — {{ product.name }}</option>
            }
          </select>
          @if (item.controls.productId.hasError('required') && item.controls.productId.touched) {
            <p class="field-error" role="alert">Selecciona un producto.</p>
          } @else if (item.controls.productId.hasError('duplicate')) {
            <p class="field-error" role="alert">Este producto ya está en otra línea. Ajusta la cantidad ahí.</p>
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

          <label [for]="'unitPrice-' + $index">Precio unitario manual (opcional)</label>
          <input [id]="'unitPrice-' + $index" type="number" [formControl]="item.controls.unitPrice" step="any" min="0" />
          @if (item.controls.unitPrice.invalid && item.controls.unitPrice.touched) {
            <p class="field-error" role="alert">No puede ser negativo.</p>
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
          } @else if (discountedUnitPrice(item) !== null) {
            <p class="hint">Precio con descuento: {{ discountedUnitPrice(item) | number: '1.2-2' }}</p>
          } @else if (item.controls.discountPercentage.value) {
            <p class="hint">Ingresa un precio unitario manual para ver el precio con descuento.</p>
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
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly branchQueryParams = this.route.snapshot.queryParamMap.get('branchId')
    ? { branchId: this.route.snapshot.queryParamMap.get('branchId') }
    : {};

  private readonly branchId =
    this.authStore.currentUser()?.branchId ?? this.route.snapshot.queryParamMap.get('branchId');

  protected readonly form = new FormGroup<SaleForm>({
    saleNumber: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
    saleDate: new FormControl('', { nonNullable: true, validators: [Validators.required, notFutureDateValidator] }),
    priceListId: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    items: new FormArray<FormGroup<SaleItemForm>>([this.buildItem()]),
  });

  constructor() {
    this.loadProducts();
    this.loadPriceLists();
  }

  protected addItem(): void {
    this.form.controls.items.push(this.buildItem());
  }

  protected removeItem(index: number): void {
    this.form.controls.items.removeAt(index);
    this.revalidateProducts();
  }

  /**
   * Precio de la línea ya con el descuento aplicado, solo informativo: el
   * `discountPercentage` ya viaja tal cual en el payload (RF de ventas/compras),
   * esto solo evita que el usuario tenga que calcularlo a mano. Sin
   * `unitPrice` manual no hay nada que calcular en el front — el precio real
   * lo resuelve el backend contra la lista de precios.
   */
  protected discountedUnitPrice(item: FormGroup<SaleItemForm>): number | null {
    const unitPrice = item.controls.unitPrice.value;
    const discountPercentage = item.controls.discountPercentage.value;
    if (unitPrice === null || unitPrice === undefined || !discountPercentage) {
      return null;
    }
    return unitPrice * (1 - discountPercentage / 100);
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
   * Marca/desmarca el error `duplicate` en cada línea según si su producto se
   * repite en otra — el filtro de `availableProducts` ya evita elegirlo, esto
   * es el resguardo por si dos líneas quedan iguales (p. ej. al quitar una
   * línea intermedia). Mismo criterio que `InventoryAdjustmentCreatePage`.
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
        // `saleDate` de la API es `date-time` (requiere offset, si no el
        // backend responde 400 "Failed to read request" al no poder parsear
        // un `LocalDateTime` sin zona); el `<input type="date">` solo da
        // fecha, así que se fija a medianoche UTC.
        saleDate: `${saleDate}T00:00:00Z`,
        priceListId: priceListId || undefined,
        notes: notes || undefined,
        items: items.map(({ productId, quantity, unitPrice, discountPercentage }) => ({
          productId,
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
