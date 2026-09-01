import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { CreateProductUseCase } from '../../../core/application/products/create-product.usecase';
import { UpdateProductUseCase } from '../../../core/application/products/update-product.usecase';
import { GetProductUseCase } from '../../../core/application/products/get-product.usecase';
import { ListProductVariantsUseCase } from '../../../core/application/products/list-product-variants.usecase';
import { AddProductVariantUseCase } from '../../../core/application/products/add-product-variant.usecase';
import { SearchCategoriesUseCase } from '../../../core/application/categories/search-categories.usecase';
import { ListUnitsOfMeasureUseCase } from '../../../core/application/units-of-measure/list-units-of-measure.usecase';
import { Product, ProductFamily } from '../../../core/domain/models/product.model';
import { Category } from '../../../core/domain/models/category.model';
import { UnitOfMeasure } from '../../../core/domain/models/unit-of-measure.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface ProductForm {
  sku: FormControl<string>;
  name: FormControl<string>;
  categoryId: FormControl<string>;
  barcode: FormControl<string>;
  description: FormControl<string>;
  unitOfMeasureId: FormControl<string>;
}

interface AddVariantForm {
  sku: FormControl<string>;
  name: FormControl<string>;
  barcode: FormControl<string>;
  description: FormControl<string>;
  unitOfMeasureId: FormControl<string>;
}

/**
 * Alta/edición de producto, mismo patrón que `CategoryFormPage`: el modo lo
 * decide la presencia de `:id` en la ruta; SKU y unidad son inmutables una
 * vez creado el producto (APIDOC.json). En edición se añade la gestión de
 * variantes: cada variante es un producto autónomo, con su propio SKU,
 * inventario y precio — no comparte stock con el principal ni se convierte a
 * su unidad. Solo disponible con el producto ya creado, porque cuelga de su
 * `id`.
 */
@Component({
  selector: 'app-product-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isEditMode() ? 'Editar producto' : 'Nuevo producto' }}</h1>

    @if (loadingProduct()) {
      <p>Cargando…</p>
    } @else {
      <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="sku">SKU</label>
        <input id="sku" formControlName="sku" placeholder="BEB-AGUA-600" />
        @if (isEditMode()) {
          <p class="hint">El SKU es inmutable una vez creado el producto.</p>
        } @else if (form.controls.sku.invalid && form.controls.sku.touched) {
          <p class="field-error" role="alert">
            {{ form.controls.sku.hasError('required') ? 'El SKU es obligatorio.' : 'Máximo 60 caracteres.' }}
          </p>
        }

        <label for="name">Nombre</label>
        <input id="name" formControlName="name" />
        @if (form.controls.name.invalid && form.controls.name.touched) {
          <p class="field-error" role="alert">
            {{ form.controls.name.hasError('required') ? 'El nombre es obligatorio.' : 'Máximo 180 caracteres.' }}
          </p>
        }

        <label for="categoryId">Categoría</label>
        <select id="categoryId" formControlName="categoryId">
          <option value="">Sin categoría</option>
          @for (category of categories(); track category.id) {
            <option [value]="category.id">{{ category.name }}</option>
          }
        </select>

        <label for="barcode">Código de barras</label>
        <input id="barcode" formControlName="barcode" />
        @if (form.controls.barcode.invalid && form.controls.barcode.touched) {
          <p class="field-error" role="alert">Máximo 100 caracteres.</p>
        }

        <label for="description">Descripción</label>
        <input id="description" formControlName="description" />

        @if (!isEditMode()) {
          <label for="unitOfMeasureId">Unidad</label>
          <select id="unitOfMeasureId" formControlName="unitOfMeasureId">
            <option value="" disabled>Seleccione una unidad…</option>
            @for (unit of unitsOfMeasure(); track unit.id) {
              <option [value]="unit.id">{{ unit.name }} ({{ unit.symbol }})</option>
            }
          </select>
          <p class="hint">Unidad en la que se contabiliza el stock. No se puede cambiar después de crear el producto.</p>
          @if (form.controls.unitOfMeasureId.invalid && form.controls.unitOfMeasureId.touched) {
            <p class="field-error" role="alert">Selecciona la unidad.</p>
          }
        } @else if (product(); as currentProduct) {
          <p class="hint">Unidad: {{ currentProduct.unit.name }} ({{ currentProduct.unit.symbol }}).</p>
        }

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        @if (form.invalid && form.touched) {
          <p class="form-error" role="alert">Revisa los campos marcados en rojo antes de guardar.</p>
        }

        <div class="actions">
          <a routerLink="/products" class="button button--ghost">Cancelar</a>
          <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>

      @if (isEditMode() && product(); as currentProduct) {
        <section class="units-section">
          <h2>Variantes</h2>
          <p class="hint">
            Una variante NO es otra presentación del mismo stock: es un producto aparte, con su propio SKU, su
            propio inventario y su propio precio. Solo un producto principal admite variantes.
          </p>

          @if (variants().length > 0) {
            <table class="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nombre</th>
                  <th>Unidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (variant of variants(); track variant.id) {
                  <tr>
                    <td data-label="SKU">{{ variant.sku }}</td>
                    <td data-label="Nombre">{{ variant.name }}</td>
                    <td data-label="Unidad">{{ variant.unit.name }} ({{ variant.unit.symbol }})</td>
                    <td data-label="Estado">
                      <span class="badge" [class.badge--active]="variant.active">
                        {{ variant.active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="hint">Este producto todavía no tiene variantes.</p>
          }

          <form class="filters" [formGroup]="addVariantForm" (ngSubmit)="addVariant(currentProduct.id)">
            <input formControlName="sku" placeholder="SKU de la variante" />
            <input formControlName="name" placeholder="Nombre de la variante" />
            <input formControlName="barcode" placeholder="Código de barras (opcional)" />
            <input formControlName="description" placeholder="Descripción (opcional)" />
            <select formControlName="unitOfMeasureId">
              <option value="">Hereda la unidad del principal</option>
              @for (unit of unitsOfMeasure(); track unit.id) {
                <option [value]="unit.id">{{ unit.name }} ({{ unit.symbol }})</option>
              }
            </select>
            <button
              type="submit"
              class="button button--primary"
              [disabled]="addVariantForm.invalid || variantActionBusy()"
            >
              Añadir variante
            </button>
          </form>
          @if (addVariantForm.controls.sku.invalid && addVariantForm.controls.sku.touched) {
            <p class="field-error" role="alert">El SKU de la variante es obligatorio.</p>
          }
          @if (addVariantForm.controls.name.invalid && addVariantForm.controls.name.touched) {
            <p class="field-error" role="alert">El nombre de la variante es obligatorio.</p>
          }
          @if (variantsErrorMessage(); as message) {
            <p class="form-error" role="alert">{{ message }}</p>
          }
        </section>
      }
    }
  `,
  styleUrl: './product-form.page.scss',
})
export class ProductFormPage {
  private readonly createProductUseCase = inject(CreateProductUseCase);
  private readonly updateProductUseCase = inject(UpdateProductUseCase);
  private readonly getProductUseCase = inject(GetProductUseCase);
  private readonly listProductVariantsUseCase = inject(ListProductVariantsUseCase);
  private readonly addProductVariantUseCase = inject(AddProductVariantUseCase);
  private readonly searchCategoriesUseCase = inject(SearchCategoriesUseCase);
  private readonly listUnitsOfMeasureUseCase = inject(ListUnitsOfMeasureUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly productId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.productId !== null);
  protected readonly loadingProduct = signal(this.productId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly product = signal<Product | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly unitsOfMeasure = signal<UnitOfMeasure[]>([]);

  protected readonly variants = signal<Product[]>([]);
  protected readonly variantActionBusy = signal(false);
  protected readonly variantsErrorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup<ProductForm>({
    sku: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
    categoryId: new FormControl('', { nonNullable: true }),
    barcode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    description: new FormControl('', { nonNullable: true }),
    unitOfMeasureId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly addVariantForm = new FormGroup<AddVariantForm>({
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
    barcode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    description: new FormControl('', { nonNullable: true }),
    unitOfMeasureId: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.loadCategories();
    this.loadUnitsOfMeasure();

    if (this.productId) {
      this.form.controls.sku.disable();
      this.form.controls.unitOfMeasureId.disable();
      this.loadProduct(this.productId);
      this.loadVariants(this.productId);
    }
  }

  protected addVariant(productId: string): void {
    if (this.addVariantForm.invalid) {
      this.addVariantForm.markAllAsTouched();
      return;
    }

    const { sku, name, barcode, description, unitOfMeasureId } = this.addVariantForm.getRawValue();
    this.variantActionBusy.set(true);
    this.variantsErrorMessage.set(null);
    this.addProductVariantUseCase
      .execute(productId, {
        sku,
        name,
        barcode: barcode || undefined,
        description: description || undefined,
        unitOfMeasureId: unitOfMeasureId || undefined,
      })
      .pipe(finalize(() => this.variantActionBusy.set(false)))
      .subscribe({
        next: (variant) => {
          this.variants.update((rows) => [...rows, variant]);
          this.addVariantForm.reset({ sku: '', name: '', barcode: '', description: '', unitOfMeasureId: '' });
        },
        error: (error: ApiError) => this.variantsErrorMessage.set(error.message ?? 'No se pudo añadir la variante.'),
      });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { sku, name, categoryId, barcode, description, unitOfMeasureId } = this.form.getRawValue();

    const request$: Observable<Product | ProductFamily> = this.productId
      ? this.updateProductUseCase.execute(this.productId, {
          name,
          categoryId: categoryId || undefined,
          barcode: barcode || undefined,
          description: description || undefined,
        })
      : this.createProductUseCase.execute(this.authStore.currentUser()!.organizationId, {
          sku,
          name,
          categoryId: categoryId || undefined,
          barcode: barcode || undefined,
          description: description || undefined,
          unitOfMeasureId,
        });

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/products'),
      error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo guardar el producto.'),
    });
  }

  private loadProduct(productId: string): void {
    this.getProductUseCase
      .execute(productId)
      .pipe(finalize(() => this.loadingProduct.set(false)))
      .subscribe({
        next: (product) => {
          this.product.set(product);
          this.form.patchValue({
            sku: product.sku,
            name: product.name,
            categoryId: product.categoryId ?? '',
            barcode: product.barcode,
            description: product.description,
          });
        },
        error: () => this.errorMessage.set('No se pudo cargar el producto.'),
      });
  }

  private loadVariants(productId: string): void {
    this.listProductVariantsUseCase.execute(productId).subscribe({ next: (variants) => this.variants.set(variants) });
  }

  private loadCategories(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchCategoriesUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe({ next: (page) => this.categories.set(page.content) });
  }

  private loadUnitsOfMeasure(): void {
    this.listUnitsOfMeasureUseCase.execute().subscribe({ next: (units) => this.unitsOfMeasure.set(units) });
  }
}
