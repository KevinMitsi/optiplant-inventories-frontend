import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { SetProductStatusUseCase } from '../../../core/application/products/set-product-status.usecase';
import { SearchCategoriesUseCase } from '../../../core/application/categories/search-categories.usecase';
import { Product, ProductSortField } from '../../../core/domain/models/product.model';
import { Category } from '../../../core/domain/models/category.model';
import { Page } from '../../../core/domain/models/page.model';
import { SortDirection } from '../../../core/domain/models/page-query.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';

interface ProductFilters {
  text: FormControl<string>;
  categoryId: FormControl<string>;
  active: FormControl<'' | 'true' | 'false'>;
}

const EMPTY_PAGE: Page<Product> = {
  content: [],
  page: 0,
  size: 20,
  numberOfElements: 0,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  hasNext: false,
};

/**
 * Listado paginado del catálogo de productos. Mismo patrón que
 * `CategoryListPage`: visible a cualquier rol autenticado (hace falta para
 * operar inventario); alta/edición/baja reservadas a ADMIN, por ser maestro
 * de catálogo.
 */
@Component({
  selector: 'app-product-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Productos</h1>
      @if (isAdmin()) {
        <a routerLink="new" class="button button--primary">Nuevo producto</a>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      <input type="search" formControlName="text" placeholder="Buscar por SKU, nombre o código de barras…" />
      <select formControlName="categoryId">
        <option value="">Todas las categorías</option>
        @for (category of categories(); track category.id) {
          <option [value]="category.id">{{ category.name }}</option>
        }
      </select>
      <select formControlName="active">
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Inactivos</option>
      </select>
    </form>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    <table class="data-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Nombre</th>
          <th>Código de barras</th>
          <th>Unidad base</th>
          <th>Estado</th>
          @if (isAdmin()) {
            <th></th>
          }
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="6">Cargando…</td>
          </tr>
        } @else if (result().content.length === 0) {
          <tr>
            <td colspan="6">No hay productos que coincidan con el filtro.</td>
          </tr>
        } @else {
          @for (product of result().content; track product.id) {
            <tr>
              <td data-label="SKU">{{ product.sku }}</td>
              <td data-label="Nombre">{{ product.name }}</td>
              <td data-label="Código de barras">{{ product.barcode || '—' }}</td>
              <td data-label="Unidad base">{{ baseUnitLabel(product) }}</td>
              <td data-label="Estado">
                <span class="badge" [class.badge--active]="product.active">
                  {{ product.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              @if (isAdmin()) {
                <td data-label="Acciones" class="actions">
                  <a [routerLink]="[product.id, 'edit']">Editar</a>
                  <button
                    type="button"
                    (click)="toggleStatus(product)"
                    [disabled]="togglingId() === product.id"
                  >
                    {{ product.active ? 'Dar de baja' : 'Reactivar' }}
                  </button>
                </td>
              }
            </tr>
          }
        }
      </tbody>
    </table>

    <app-paginator
      [page]="result().page"
      [totalPages]="result().totalPages"
      [totalElements]="result().totalElements"
      [hasNext]="result().hasNext"
      (pageChange)="goToPage($event)"
    />
  `,
  styleUrl: './product-list.page.scss',
})
export class ProductListPage {
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly setProductStatusUseCase = inject(SetProductStatusUseCase);
  private readonly searchCategoriesUseCase = inject(SearchCategoriesUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.role() === Role.Admin);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Product>>(EMPTY_PAGE);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly categories = signal<Category[]>([]);

  protected readonly filters = new FormGroup<ProductFilters>({
    text: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    active: new FormControl('', { nonNullable: true }),
  });

  private page = 0;
  private readonly sortBy: ProductSortField = 'name';
  private readonly sortDirection: SortDirection = 'ASC';

  constructor() {
    this.search();
    this.loadCategories();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page = 0;
        this.search();
      });
  }

  protected baseUnitLabel(product: Product): string {
    return product.units.find((unit) => unit.baseUnit)?.unit.symbol ?? '—';
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected toggleStatus(product: Product): void {
    this.togglingId.set(product.id);
    this.setProductStatusUseCase
      .execute(product.id, !product.active)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo cambiar el estado del producto.'),
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

  private search(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { text, categoryId, active } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchProductsUseCase
      .execute(organizationId, {
        page: this.page,
        size: 20,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        text: text || undefined,
        categoryId: categoryId || undefined,
        active: active === '' ? undefined : active === 'true',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el catálogo de productos.'),
      });
  }
}
