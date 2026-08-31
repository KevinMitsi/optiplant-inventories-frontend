import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateProductUseCase } from '../../../core/application/products/create-product.usecase';
import { UpdateProductUseCase } from '../../../core/application/products/update-product.usecase';
import { GetProductUseCase } from '../../../core/application/products/get-product.usecase';
import { AddProductUnitUseCase } from '../../../core/application/products/add-product-unit.usecase';
import { ChangeProductUnitFactorUseCase } from '../../../core/application/products/change-product-unit-factor.usecase';
import { SetProductUnitStatusUseCase } from '../../../core/application/products/set-product-unit-status.usecase';
import { ChangeBaseUnitUseCase } from '../../../core/application/products/change-base-unit.usecase';
import { SearchCategoriesUseCase } from '../../../core/application/categories/search-categories.usecase';
import { ListUnitsOfMeasureUseCase } from '../../../core/application/units-of-measure/list-units-of-measure.usecase';
import { Product, ProductUnit } from '../../../core/domain/models/product.model';
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
  baseUnitId: FormControl<string>;
}

interface AddUnitForm {
  unitOfMeasureId: FormControl<string>;
  conversionFactor: FormControl<number | null>;
}

/**
 * Alta/edición de producto, mismo patrón que `CategoryFormPage`: el modo lo
 * decide la presencia de `:id` en la ruta; SKU y unidad base son inmutables
 * una vez creado el producto (APIDOC.json). En edición se añade la gestión
 * de presentaciones (`ProductUnit`): añadir, cambiar factor, activar/
 * desactivar y designar unidad base — solo disponible con el producto ya
 * creado, porque todas esas operaciones cuelgan de su `id`.
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
          <label for="baseUnitId">Unidad base</label>
          <select id="baseUnitId" formControlName="baseUnitId">
            <option value="" disabled>Seleccione una unidad…</option>
            @for (unit of unitsOfMeasure(); track unit.id) {
              <option [value]="unit.id">{{ unit.name }} ({{ unit.symbol }})</option>
            }
          </select>
          <p class="hint">Unidad en la que se contabiliza el stock. No se puede cambiar después de crear el producto.</p>
          @if (form.controls.baseUnitId.invalid && form.controls.baseUnitId.touched) {
            <p class="field-error" role="alert">Selecciona la unidad base.</p>
          }
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
          <h2>Presentaciones</h2>
          <p class="hint">
            Una presentación es cada forma en la que se maneja el producto (unidad, caja, paquete…). El
            <strong>Factor</strong> indica cuántas unidades base equivalen a una de esa presentación — por ejemplo, si la
            base es "Unidad" y la presentación es "Caja de 24", el factor es 24. La presentación marcada como
            <strong>Base</strong> es en la que se contabiliza el stock del producto.
          </p>

          <table class="data-table">
            <thead>
              <tr>
                <th>Unidad</th>
                <th title="Unidades base que equivalen a una unidad de esta presentación">Factor ⓘ</th>
                <th>Base</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (unit of currentProduct.units; track unit.id) {
                <tr>
                  <td data-label="Unidad">{{ unit.unit.name }} ({{ unit.unit.symbol }})</td>
                  <td data-label="Factor">
                    @if (editingFactorId() === unit.id) {
                      <input
                        type="number"
                        [formControl]="factorControl"
                        step="any"
                        min="0.000001"
                      />
                    } @else {
                      {{ unit.conversionFactor }}
                    }
                  </td>
                  <td data-label="Base">
                    <span class="badge" [class.badge--active]="unit.baseUnit">
                      {{ unit.baseUnit ? 'Sí' : 'No' }}
                    </span>
                  </td>
                  <td data-label="Estado">
                    <span class="badge" [class.badge--active]="unit.active">
                      {{ unit.active ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                  <td data-label="Acciones" class="actions">
                    @if (editingFactorId() === unit.id) {
                      <button type="button" (click)="saveFactor(currentProduct.id, unit)" [disabled]="unitActionBusy()">
                        Guardar
                      </button>
                      <button type="button" (click)="cancelFactorEdit()">Cancelar</button>
                    } @else {
                      @if (!unit.baseUnit) {
                        <button type="button" (click)="startFactorEdit(unit)" [disabled]="unitActionBusy()">
                          Cambiar factor
                        </button>
                        @if (unit.active) {
                          <button type="button" (click)="startSetBase(unit)" [disabled]="unitActionBusy()">
                            Fijar como base
                          </button>
                        }
                        <button
                          type="button"
                          (click)="toggleUnitStatus(currentProduct.id, unit)"
                          [disabled]="unitActionBusy()"
                        >
                          {{ unit.active ? 'Dar de baja' : 'Reactivar' }}
                        </button>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <form class="filters" [formGroup]="addUnitForm" (ngSubmit)="addUnit(currentProduct.id)">
            <select formControlName="unitOfMeasureId">
              <option value="" disabled>Añadir presentación…</option>
              @for (unit of availableUnitsOfMeasure(currentProduct); track unit.id) {
                <option [value]="unit.id">{{ unit.name }} ({{ unit.symbol }})</option>
              }
            </select>
            <input
              type="number"
              formControlName="conversionFactor"
              step="any"
              min="0.000001"
              placeholder="Factor (unidades base por presentación)"
            />
            <button type="submit" class="button button--primary" [disabled]="addUnitForm.invalid || unitActionBusy()">
              Añadir
            </button>
          </form>
          <p class="hint">
            El factor de la nueva presentación se expresa en unidades base: cuántas unidades base contiene una unidad de
            esta presentación (ej.: una "Caja de 24" con base "Unidad" lleva factor 24).
          </p>
          @if (addUnitForm.controls.unitOfMeasureId.invalid && addUnitForm.controls.unitOfMeasureId.touched) {
            <p class="field-error" role="alert">Selecciona una presentación.</p>
          }
          @if (addUnitForm.controls.conversionFactor.invalid && addUnitForm.controls.conversionFactor.touched) {
            <p class="field-error" role="alert">
              {{
                addUnitForm.controls.conversionFactor.hasError('required')
                  ? 'El factor de conversión es obligatorio.'
                  : 'Debe ser mayor que 0.'
              }}
            </p>
          }
        </section>

        @if (settingBaseUnit(); as targetUnit) {
          <div class="units-modal-backdrop" (click)="cancelSetBase()">
            <div
              class="units-modal"
              role="alertdialog"
              aria-modal="true"
              [attr.aria-labelledby]="setBaseDialogTitleId"
              (click)="$event.stopPropagation()"
            >
              <h3 [id]="setBaseDialogTitleId">Cambiar unidad base</h3>
              <p>
                Vas a designar <strong>{{ targetUnit.unit.name }} ({{ targetUnit.unit.symbol }})</strong> como la nueva
                unidad base del producto. El stock se seguirá contabilizando en la nueva base a partir de este momento.
              </p>
              @if (currentBaseUnit(); as currentBase) {
                <p>
                  <strong>{{ currentBase.unit.name }}</strong> deja de ser la base. El sistema no puede calcular sola su
                  nueva equivalencia — indica cuántas unidades de <strong>{{ targetUnit.unit.name }}</strong> equivalen
                  ahora a una <strong>{{ currentBase.unit.name }}</strong>.
                </p>
                <p class="hint">
                  Ejemplo: si la base pasa de "Botella" a "Caja de 24", una Botella pasa a valer 1/24 (≈0.0417) cajas.
                </p>
                <label for="previousBaseFactor">Nuevo factor de "{{ currentBase.unit.name }}"</label>
              } @else {
                <label for="previousBaseFactor">Nuevo factor de la base anterior</label>
              }
              <input
                id="previousBaseFactor"
                type="number"
                [formControl]="previousBaseFactorControl"
                step="any"
                min="0.000001"
              />
              @if (previousBaseFactorControl.invalid && previousBaseFactorControl.touched) {
                <p class="field-error" role="alert">Indica un factor mayor que 0.</p>
              }
              <div class="units-modal__actions">
                <button type="button" class="button button--ghost" (click)="cancelSetBase()">Cancelar</button>
                <button
                  type="button"
                  class="button button--primary"
                  [disabled]="unitActionBusy()"
                  (click)="confirmSetBase(currentProduct, targetUnit)"
                >
                  {{ unitActionBusy() ? 'Guardando…' : 'Confirmar' }}
                </button>
              </div>
            </div>
          </div>
        }
      }

      @if (unitsErrorMessage(); as message) {
        <div class="units-modal-backdrop" (click)="dismissUnitsError()">
          <div
            class="units-modal units-modal--error"
            role="alertdialog"
            aria-modal="true"
            [attr.aria-labelledby]="unitsErrorDialogTitleId"
            (click)="$event.stopPropagation()"
          >
            <h3 [id]="unitsErrorDialogTitleId">No se pudo completar la acción</h3>
            <p>{{ message }}</p>
            <div class="units-modal__actions">
              <button type="button" class="button button--primary" (click)="dismissUnitsError()">Entendido</button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styleUrl: './product-form.page.scss',
})
export class ProductFormPage {
  private readonly createProductUseCase = inject(CreateProductUseCase);
  private readonly updateProductUseCase = inject(UpdateProductUseCase);
  private readonly getProductUseCase = inject(GetProductUseCase);
  private readonly addProductUnitUseCase = inject(AddProductUnitUseCase);
  private readonly changeProductUnitFactorUseCase = inject(ChangeProductUnitFactorUseCase);
  private readonly setProductUnitStatusUseCase = inject(SetProductUnitStatusUseCase);
  private readonly changeBaseUnitUseCase = inject(ChangeBaseUnitUseCase);
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

  protected readonly unitsErrorMessage = signal<string | null>(null);
  protected readonly unitActionBusy = signal(false);
  protected readonly editingFactorId = signal<string | null>(null);
  protected readonly settingBaseId = signal<string | null>(null);
  /** Presentación marcada como base en el producto cargado, para explicar el cambio en el diálogo. */
  protected readonly currentBaseUnit = computed(() => this.product()?.units.find((unit) => unit.baseUnit) ?? null);
  /** Presentación objetivo del diálogo flotante "Fijar como base" — `null` cuando está cerrado. */
  protected readonly settingBaseUnit = computed(() => {
    const id = this.settingBaseId();
    return id ? (this.product()?.units.find((unit) => unit.id === id) ?? null) : null;
  });
  protected readonly setBaseDialogTitleId = `set-base-dialog-title-${crypto.randomUUID()}`;
  protected readonly unitsErrorDialogTitleId = `units-error-dialog-title-${crypto.randomUUID()}`;
  protected readonly factorControl = new FormControl<number | null>(null, {
    validators: [Validators.required, Validators.min(0.000001)],
  });
  protected readonly previousBaseFactorControl = new FormControl<number | null>(null, {
    validators: [Validators.required, Validators.min(0.000001)],
  });

  protected readonly form = new FormGroup<ProductForm>({
    sku: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
    categoryId: new FormControl('', { nonNullable: true }),
    barcode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    description: new FormControl('', { nonNullable: true }),
    baseUnitId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly addUnitForm = new FormGroup<AddUnitForm>({
    unitOfMeasureId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    conversionFactor: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.000001)],
    }),
  });

  constructor() {
    this.loadCategories();
    this.loadUnitsOfMeasure();

    if (this.productId) {
      this.form.controls.sku.disable();
      this.form.controls.baseUnitId.disable();
      this.loadProduct(this.productId);
    }
  }

  protected availableUnitsOfMeasure(currentProduct: Product): UnitOfMeasure[] {
    const usedIds = new Set(currentProduct.units.map((unit) => unit.unit.id));
    return this.unitsOfMeasure().filter((unit) => !usedIds.has(unit.id));
  }

  protected startFactorEdit(unit: ProductUnit): void {
    this.settingBaseId.set(null);
    this.editingFactorId.set(unit.id);
    this.factorControl.setValue(unit.conversionFactor);
  }

  protected cancelFactorEdit(): void {
    this.editingFactorId.set(null);
  }

  protected saveFactor(productId: string, unit: ProductUnit): void {
    if (this.factorControl.invalid) {
      this.factorControl.markAsTouched();
      return;
    }

    this.unitActionBusy.set(true);
    this.unitsErrorMessage.set(null);
    this.changeProductUnitFactorUseCase
      .execute(productId, unit.id, { conversionFactor: this.factorControl.value! })
      .pipe(finalize(() => this.unitActionBusy.set(false)))
      .subscribe({
        next: (updated) => {
          this.product.set(updated);
          this.editingFactorId.set(null);
        },
        error: (error: ApiError) =>
          this.unitsErrorMessage.set(error.message ?? 'No se pudo cambiar el factor de la presentación.'),
      });
  }

  protected startSetBase(unit: ProductUnit): void {
    this.editingFactorId.set(null);
    this.settingBaseId.set(unit.id);
    this.previousBaseFactorControl.setValue(null);
  }

  protected cancelSetBase(): void {
    this.settingBaseId.set(null);
  }

  protected dismissUnitsError(): void {
    this.unitsErrorMessage.set(null);
  }

  protected confirmSetBase(currentProduct: Product, unit: ProductUnit): void {
    if (this.previousBaseFactorControl.invalid) {
      this.previousBaseFactorControl.markAsTouched();
      return;
    }

    this.unitActionBusy.set(true);
    this.unitsErrorMessage.set(null);
    this.changeBaseUnitUseCase
      .execute(currentProduct.id, {
        newBaseProductUnitId: unit.id,
        previousBaseNewFactor: this.previousBaseFactorControl.value!,
      })
      .pipe(finalize(() => this.unitActionBusy.set(false)))
      .subscribe({
        next: (updated) => {
          this.product.set(updated);
          this.settingBaseId.set(null);
        },
        error: (error: ApiError) => {
          this.settingBaseId.set(null);
          this.unitsErrorMessage.set(error.message ?? 'No se pudo cambiar la unidad base.');
        },
      });
  }

  protected toggleUnitStatus(productId: string, unit: ProductUnit): void {
    this.unitActionBusy.set(true);
    this.unitsErrorMessage.set(null);
    this.setProductUnitStatusUseCase
      .execute(productId, unit.id, !unit.active)
      .pipe(finalize(() => this.unitActionBusy.set(false)))
      .subscribe({
        next: (updated) => this.product.set(updated),
        error: (error: ApiError) =>
          this.unitsErrorMessage.set(error.message ?? 'No se pudo cambiar el estado de la presentación.'),
      });
  }

  protected addUnit(productId: string): void {
    if (this.addUnitForm.invalid) {
      this.addUnitForm.markAllAsTouched();
      return;
    }

    const { unitOfMeasureId, conversionFactor } = this.addUnitForm.getRawValue();
    this.unitActionBusy.set(true);
    this.unitsErrorMessage.set(null);
    this.addProductUnitUseCase
      .execute(productId, { unitOfMeasureId, conversionFactor: conversionFactor! })
      .pipe(finalize(() => this.unitActionBusy.set(false)))
      .subscribe({
        next: (updated) => {
          this.product.set(updated);
          this.addUnitForm.reset({ unitOfMeasureId: '', conversionFactor: null });
        },
        error: (error: ApiError) =>
          this.unitsErrorMessage.set(error.message ?? 'No se pudo añadir la presentación.'),
      });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { sku, name, categoryId, barcode, description, baseUnitId } = this.form.getRawValue();

    const request$ = this.productId
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
          baseUnitId,
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
