import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreatePriceListUseCase } from '../../../core/application/price-lists/create-price-list.usecase';
import { UpdatePriceListUseCase } from '../../../core/application/price-lists/update-price-list.usecase';
import { GetPriceListUseCase } from '../../../core/application/price-lists/get-price-list.usecase';
import { GetProductPriceUseCase } from '../../../core/application/price-lists/get-product-price.usecase';
import { SetProductPriceUseCase } from '../../../core/application/price-lists/set-product-price.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { PriceList } from '../../../core/domain/models/price-list.model';
import { Product } from '../../../core/domain/models/product.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface PriceListForm {
  code: FormControl<string>;
  name: FormControl<string>;
  description: FormControl<string>;
  validFrom: FormControl<string>;
  validUntil: FormControl<string>;
}

interface ProductPriceForm {
  productId: FormControl<string>;
  productUnitId: FormControl<string>;
  price: FormControl<number | null>;
}

/**
 * Alta/edición de lista de precios, mismo patrón que `CategoryFormPage`: el
 * código es inmutable una vez creada. En edición se añade una sección para
 * consultar/fijar el precio de un producto en la lista: la API no expone un
 * listado de precios de la lista, solo `GET`/`POST` puntuales por
 * `productId`+`productUnitId` (HU-25), así que la UI refleja esa forma en
 * vez de simular una tabla que el backend no puede llenar.
 */
@Component({
  selector: 'app-price-list-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isEditMode() ? 'Editar lista de precios' : 'Nueva lista de precios' }}</h1>

    @if (loadingPriceList()) {
      <p>Cargando…</p>
    } @else {
      <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="code">Código</label>
        <input id="code" formControlName="code" placeholder="MINORISTA" />
        @if (isEditMode()) {
          <p class="hint">El código es inmutable una vez creada la lista de precios.</p>
        }

        <label for="name">Nombre</label>
        <input id="name" formControlName="name" />

        <label for="description">Descripción</label>
        <input id="description" formControlName="description" />

        <label for="validFrom">Vigente desde</label>
        <input id="validFrom" type="date" formControlName="validFrom" />

        <label for="validUntil">Vigente hasta</label>
        <input id="validUntil" type="date" formControlName="validUntil" />

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        <div class="actions">
          <a routerLink="/price-lists" class="button button--ghost">Cancelar</a>
          <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>

      @if (isEditMode() && priceList(); as currentPriceList) {
        <section class="units-section">
          <h2>Precio de un producto</h2>

          <form class="filters" [formGroup]="priceForm" (ngSubmit)="setPrice(currentPriceList.id)">
            <select formControlName="productId">
              <option value="" disabled>Seleccione un producto…</option>
              @for (product of products(); track product.id) {
                <option [value]="product.id">{{ product.sku }} — {{ product.name }}</option>
              }
            </select>
            <select formControlName="productUnitId">
              <option value="" disabled>Presentación…</option>
              @for (unit of selectedProductUnits(); track unit.id) {
                <option [value]="unit.id">{{ unit.unit.name }} ({{ unit.unit.symbol }})</option>
              }
            </select>
            <input type="number" formControlName="price" step="any" min="0" placeholder="Precio" />
            <button
              type="button"
              class="button button--ghost"
              (click)="lookupPrice(currentPriceList.id)"
              [disabled]="lookupDisabled() || priceActionBusy()"
            >
              Consultar
            </button>
            <button
              type="submit"
              class="button button--primary"
              [disabled]="priceForm.invalid || priceActionBusy()"
            >
              Guardar precio
            </button>
          </form>

          @if (priceMessage(); as message) {
            <p class="hint">{{ message }}</p>
          }
          @if (priceErrorMessage(); as message) {
            <p class="form-error" role="alert">{{ message }}</p>
          }
        </section>
      }
    }
  `,
  styleUrl: './price-list-form.page.scss',
})
export class PriceListFormPage {
  private readonly createPriceListUseCase = inject(CreatePriceListUseCase);
  private readonly updatePriceListUseCase = inject(UpdatePriceListUseCase);
  private readonly getPriceListUseCase = inject(GetPriceListUseCase);
  private readonly getProductPriceUseCase = inject(GetProductPriceUseCase);
  private readonly setProductPriceUseCase = inject(SetProductPriceUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly priceListId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.priceListId !== null);
  protected readonly loadingPriceList = signal(this.priceListId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly priceList = signal<PriceList | null>(null);
  protected readonly products = signal<Product[]>([]);

  protected readonly priceActionBusy = signal(false);
  protected readonly priceMessage = signal<string | null>(null);
  protected readonly priceErrorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup<PriceListForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    description: new FormControl('', { nonNullable: true }),
    validFrom: new FormControl('', { nonNullable: true }),
    validUntil: new FormControl('', { nonNullable: true }),
  });

  protected readonly priceForm = new FormGroup<ProductPriceForm>({
    productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    productUnitId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
  });

  protected readonly selectedProductUnits = computed(() => {
    const selectedId = this.selectedProductId();
    return this.products().find((product) => product.id === selectedId)?.units ?? [];
  });

  protected readonly lookupDisabled = computed(
    () => !this.selectedProductId() || !this.priceForm.controls.productUnitId.value,
  );

  private readonly selectedProductId = signal('');

  constructor() {
    this.loadProducts();

    if (this.priceListId) {
      this.form.controls.code.disable();
      this.loadPriceList(this.priceListId);
    }

    this.priceForm.controls.productId.valueChanges.pipe(takeUntilDestroyed()).subscribe((productId) => {
      this.selectedProductId.set(productId);
      this.priceForm.controls.productUnitId.setValue('', { emitEvent: false });
      this.priceMessage.set(null);
      this.priceErrorMessage.set(null);
    });
  }

  protected lookupPrice(priceListId: string): void {
    const { productId, productUnitId } = this.priceForm.getRawValue();
    if (!productId || !productUnitId) {
      return;
    }

    this.priceActionBusy.set(true);
    this.priceMessage.set(null);
    this.priceErrorMessage.set(null);
    this.getProductPriceUseCase
      .execute(priceListId, productId, productUnitId)
      .pipe(finalize(() => this.priceActionBusy.set(false)))
      .subscribe({
        next: (productPrice) => {
          this.priceForm.controls.price.setValue(productPrice.price);
          this.priceMessage.set(`Precio actual: ${productPrice.price}.`);
        },
        error: () => this.priceErrorMessage.set('Ese producto no tiene precio fijado en esta lista.'),
      });
  }

  protected setPrice(priceListId: string): void {
    if (this.priceForm.invalid) {
      this.priceForm.markAllAsTouched();
      return;
    }

    const { productId, productUnitId, price } = this.priceForm.getRawValue();
    this.priceActionBusy.set(true);
    this.priceMessage.set(null);
    this.priceErrorMessage.set(null);
    this.setProductPriceUseCase
      .execute(priceListId, { productId, productUnitId, price: price! })
      .pipe(finalize(() => this.priceActionBusy.set(false)))
      .subscribe({
        next: (productPrice) => this.priceMessage.set(`Precio guardado: ${productPrice.price}.`),
        error: (error: ApiError) => this.priceErrorMessage.set(error.message ?? 'No se pudo guardar el precio.'),
      });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { code, name, description, validFrom, validUntil } = this.form.getRawValue();

    const request$ = this.priceListId
      ? this.updatePriceListUseCase.execute(this.priceListId, {
          name,
          description: description || undefined,
          validFrom: validFrom || undefined,
          validUntil: validUntil || undefined,
        })
      : this.createPriceListUseCase.execute(this.authStore.currentUser()!.organizationId, {
          code,
          name,
          description: description || undefined,
          validFrom: validFrom || undefined,
          validUntil: validUntil || undefined,
        });

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/price-lists'),
      error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo guardar la lista de precios.'),
    });
  }

  private loadPriceList(priceListId: string): void {
    this.getPriceListUseCase
      .execute(priceListId)
      .pipe(finalize(() => this.loadingPriceList.set(false)))
      .subscribe({
        next: (priceList) => {
          this.priceList.set(priceList);
          this.form.patchValue({
            code: priceList.code,
            name: priceList.name,
            description: priceList.description,
            validFrom: priceList.validFrom ?? '',
            validUntil: priceList.validUntil ?? '',
          });
        },
        error: () => this.errorMessage.set('No se pudo cargar la lista de precios.'),
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
