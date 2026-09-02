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
  templateUrl: './price-list-form.page.html',
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
