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
  template: `
    <div class="header">
      <h1>Categorías</h1>
      @if (isAdmin()) {
        <a routerLink="new" class="button button--primary">Nueva categoría</a>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      <input type="search" formControlName="text" placeholder="Buscar por código o nombre…" />
      <select formControlName="active">
        <option value="">Todas</option>
        <option value="true">Activas</option>
        <option value="false">Inactivas</option>
      </select>
    </form>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    <table class="data-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Estado</th>
          @if (isAdmin()) {
            <th></th>
          }
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="5">Cargando…</td>
          </tr>
        } @else if (result().content.length === 0) {
          <tr>
            <td colspan="5">No hay categorías que coincidan con el filtro.</td>
          </tr>
        } @else {
          @for (category of result().content; track category.id) {
            <tr>
              <td data-label="Código">{{ category.code }}</td>
              <td data-label="Nombre">{{ category.name }}</td>
              <td data-label="Descripción">{{ category.description }}</td>
              <td data-label="Estado">
                <span class="badge" [class.badge--active]="category.active">
                  {{ category.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              @if (isAdmin()) {
                <td data-label="Acciones" class="actions">
                  <a [routerLink]="[category.id, 'edit']">Editar</a>
                  <button
                    type="button"
                    (click)="toggleStatus(category)"
                    [disabled]="togglingId() === category.id"
                  >
                    {{ category.active ? 'Dar de baja' : 'Reactivar' }}
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
