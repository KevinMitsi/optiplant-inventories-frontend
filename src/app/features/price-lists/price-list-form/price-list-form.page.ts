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
import { formatMoney } from '../../../shared/utils/formatters';

interface PriceListForm {
  code: FormControl<string>;
  name: FormControl<string>;
  description: FormControl<string>;
  validFrom: FormControl<string>;
  validUntil: FormControl<string>;
}

interface ProductPriceForm {
  productId: FormControl<string>;
  price: FormControl<number | null>;
}

/**
 * Alta/edición de lista de precios, mismo patrón que `CategoryFormPage`: el
 * código es inmutable una vez creada. En edición se añade una sección para
 * consultar/fijar el precio de un producto en la lista: la API no expone un
 * listado de precios de la lista, solo `GET`/`POST` puntuales por
 * `productId` (HU-25), así que la UI refleja esa forma en vez de simular una
 * tabla que el backend no puede llenar.
 */
@Component({
  selector: 'app-price-list-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isEditMode() ? 'Editar lista de precios' : 'Nueva lista de precios' }}</h1>

    @if (showInfoDialog()) {
      <div class="confirm-dialog-backdrop" (click)="dismissInfoDialog()">
        <div
          class="confirm-dialog confirm-dialog--neutral"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-labelledby]="infoDialogTitleId"
          (click)="$event.stopPropagation()"
        >
          <h2 [id]="infoDialogTitleId">¿Qué es una lista de precios?</h2>
          <p>
            Es una forma de agrupar precios distintos para los mismos productos. Por ejemplo: un precio para venta
            al por mayor y otro al detal, o precios especiales por sucursal o por cliente.
          </p>
          <p>
            Cada lista tiene un código y un nombre que la identifican (ej. "MINORISTA — Precio al detal"). Después,
            a cada producto le asignas un precio dentro de esa lista. Un mismo producto puede tener un precio
            diferente en cada lista que crees.
          </p>
          <p>
            A la hora de vender, eliges qué lista de precios usar para esa venta. Así, el mismo producto se cobra a
            un valor u otro según la lista que hayas escogido — sin tener que cambiar el precio del producto cada
            vez.
          </p>
          <div class="confirm-dialog__actions">
            <button type="button" class="button button--primary" (click)="dismissInfoDialog()">Entendido</button>
          </div>
        </div>
      </div>
    }

    @if (loadingPriceList()) {
      <p>Cargando…</p>
    } @else {
      <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="code">Código</label>
        <input id="code" formControlName="code" placeholder="MINORISTA" />
        @if (isEditMode()) {
          <p class="hint">El código es inmutable una vez creada la lista de precios.</p>
        } @else if (form.controls.code.invalid && form.controls.code.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.code.hasError('required') ? 'El código es obligatorio.' : 'Máximo 30 caracteres.'
            }}
          </p>
        }

        <label for="name">Nombre</label>
        <input id="name" formControlName="name" />
        @if (form.controls.name.invalid && form.controls.name.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.name.hasError('required') ? 'El nombre es obligatorio.' : 'Máximo 100 caracteres.'
            }}
          </p>
        }

        <label for="description">Descripción</label>
        <input id="description" formControlName="description" />

        <label for="validFrom">Vigente desde</label>
        <input id="validFrom" type="date" formControlName="validFrom" />

        <label for="validUntil">Vigente hasta</label>
        <input id="validUntil" type="date" formControlName="validUntil" />

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        @if (form.invalid && form.touched) {
          <p class="form-error" role="alert">Revisa los campos marcados en rojo antes de guardar.</p>
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
          @if (priceForm.controls.price.invalid && priceForm.controls.price.touched) {
            <p class="field-error" role="alert">
              {{
                priceForm.controls.price.hasError('required') ? 'El precio es obligatorio.' : 'No puede ser negativo.'
              }}
            </p>
          }

          @if (priceMessage(); as message) {
            <p class="price-alert price-alert--success" role="status">{{ message }}</p>
          }
          @if (priceErrorMessage(); as message) {
            <p class="form-error" role="alert">{{ message }}</p>
          }

          @if (savedPrices().length > 0) {
            <table class="data-table saved-prices-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                @for (row of savedPrices(); track row.id) {
                  <tr>
                    <td data-label="Producto">{{ row.productLabel }}</td>
                    <td data-label="Precio">{{ formatMoney(row.price) }}</td>
                  </tr>
                }
              </tbody>
            </table>
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

  // Solo al crear: en edición (incluida la redirección post-alta a
  // `/price-lists/{id}/edit`) ya se entendió qué es una lista de precios,
  // reaparecer ahí interrumpe sin aportar nada.
  protected readonly showInfoDialog = signal(this.priceListId === null);
  protected readonly infoDialogTitleId = `price-list-info-title-${crypto.randomUUID()}`;

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
    price: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
  });

  protected readonly lookupDisabled = computed(() => !this.selectedProductId());

  protected readonly savedPrices = signal<{ id: string; productLabel: string; price: number }[]>([]);
  protected readonly formatMoney = formatMoney;

  private readonly selectedProductId = signal('');

  constructor() {
    this.loadProducts();

    if (this.priceListId) {
      this.form.controls.code.disable();
      this.loadPriceList(this.priceListId);
    }

    this.priceForm.controls.productId.valueChanges.pipe(takeUntilDestroyed()).subscribe((productId) => {
      this.selectedProductId.set(productId);
      this.priceMessage.set(null);
      this.priceErrorMessage.set(null);
    });
  }

  protected dismissInfoDialog(): void {
    this.showInfoDialog.set(false);
  }

  protected lookupPrice(priceListId: string): void {
    const { productId } = this.priceForm.getRawValue();
    if (!productId) {
      return;
    }

    this.priceActionBusy.set(true);
    this.priceMessage.set(null);
    this.priceErrorMessage.set(null);
    this.getProductPriceUseCase
      .execute(priceListId, productId)
      .pipe(finalize(() => this.priceActionBusy.set(false)))
      .subscribe({
        next: (productPrice) => {
          this.priceForm.controls.price.setValue(productPrice.price);
          this.priceMessage.set(`Precio actual: ${formatMoney(productPrice.price)}.`);
        },
        error: () => this.priceErrorMessage.set('Ese producto no tiene precio fijado en esta lista.'),
      });
  }

  protected setPrice(priceListId: string): void {
    if (this.priceForm.invalid) {
      this.priceForm.markAllAsTouched();
      return;
    }

    const { productId, price } = this.priceForm.getRawValue();
    const product = this.products().find((item) => item.id === productId);
    const productLabel = product ? `${product.sku} — ${product.name}` : productId;

    this.priceActionBusy.set(true);
    this.priceMessage.set(null);
    this.priceErrorMessage.set(null);
    this.setProductPriceUseCase
      .execute(priceListId, { productId, price: price! })
      .pipe(finalize(() => this.priceActionBusy.set(false)))
      .subscribe({
        next: (productPrice) => {
          this.priceMessage.set(`Precio guardado: ${productLabel} → ${formatMoney(productPrice.price)}.`);
          this.savedPrices.update((rows) => [
            { id: crypto.randomUUID(), productLabel, price: productPrice.price },
            ...rows,
          ]);
          // Limpio el formulario para poder cargar el siguiente precio sin
          // arrastrar la selección anterior (HU-25: alta de varios precios
          // seguidos para la misma lista). `emitEvent: false` porque si no,
          // las suscripciones a `valueChanges` de arriba (que limpian los
          // mensajes al cambiar de producto) borrarían el mensaje de éxito
          // que se acaba de fijar, un instante después de mostrarlo.
          this.priceForm.reset({ productId: '', price: null }, { emitEvent: false });
          this.selectedProductId.set('');
        },
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

    const isCreate = !this.priceListId;
    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (savedPriceList) =>
        // Recién creada, la mandamos a su propia edición en vez de al listado:
        // ahí vive la sección "Precio de un producto" (HU-25) y sin este salto
        // queda escondida detrás de un link "Editar" que nada anuncia.
        void this.router.navigateByUrl(
          isCreate ? `/price-lists/${savedPriceList.id}/edit` : '/price-lists',
        ),
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
