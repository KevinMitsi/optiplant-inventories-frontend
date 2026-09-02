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
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

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
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.page.html',
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
  protected readonly productToDeactivate = signal<Product | null>(null);

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
    return product.unit.symbol;
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected toggleStatus(product: Product): void {
    if (product.active) {
      // Dar de baja es la operación sensible: pide confirmación antes de ejecutarla.
      this.productToDeactivate.set(product);
      return;
    }
    this.applyStatusChange(product, true);
  }

  protected confirmDeactivate(): void {
    const product = this.productToDeactivate();
    if (!product) {
      return;
    }
    this.productToDeactivate.set(null);
    this.applyStatusChange(product, false);
  }

  private applyStatusChange(product: Product, active: boolean): void {
    this.togglingId.set(product.id);
    this.setProductStatusUseCase
      .execute(product.id, active)
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
