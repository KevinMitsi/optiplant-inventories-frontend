import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchCategoriesUseCase } from '../../../core/application/categories/search-categories.usecase';
import { SetCategoryStatusUseCase } from '../../../core/application/categories/set-category-status.usecase';
import { Category, CategorySortField } from '../../../core/domain/models/category.model';
import { Page } from '../../../core/domain/models/page.model';
import { SortDirection } from '../../../core/domain/models/page-query.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';

interface CategoryFilters {
  text: FormControl<string>;
  active: FormControl<'' | 'true' | 'false'>;
}

const EMPTY_PAGE: Page<Category> = {
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
 * Listado paginado de categorías de la organización del usuario. Mismo
 * patrón que `BranchListPage`: visible a cualquier rol autenticado (hace
 * falta para clasificar productos); alta/edición/baja reservadas a ADMIN.
 */
@Component({
  selector: 'app-category-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-list.page.html',
  styleUrl: './category-list.page.scss',
})
export class CategoryListPage {
  private readonly searchCategoriesUseCase = inject(SearchCategoriesUseCase);
  private readonly setCategoryStatusUseCase = inject(SetCategoryStatusUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.role() === Role.Admin);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Category>>(EMPTY_PAGE);
  protected readonly togglingId = signal<string | null>(null);

  protected readonly filters = new FormGroup<CategoryFilters>({
    text: new FormControl('', { nonNullable: true }),
    active: new FormControl('', { nonNullable: true }),
  });

  private page = 0;
  private readonly sortBy: CategorySortField = 'name';
  private readonly sortDirection: SortDirection = 'ASC';

  constructor() {
    this.search();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page = 0;
        this.search();
      });
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected toggleStatus(category: Category): void {
    this.togglingId.set(category.id);
    this.setCategoryStatusUseCase
      .execute(category.id, !category.active)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo cambiar el estado de la categoría.'),
      });
  }

  private search(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { text, active } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchCategoriesUseCase
      .execute(organizationId, {
        page: this.page,
        size: 20,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        text: text || undefined,
        active: active === '' ? undefined : active === 'true',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el listado de categorías.'),
      });
  }
}
