import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchSuppliersUseCase } from '../../../core/application/suppliers/search-suppliers.usecase';
import { SetSupplierStatusUseCase } from '../../../core/application/suppliers/set-supplier-status.usecase';
import { Supplier, SupplierSortField } from '../../../core/domain/models/supplier.model';
import { Page } from '../../../core/domain/models/page.model';
import { SortDirection } from '../../../core/domain/models/page-query.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';

interface SupplierFilters {
  text: FormControl<string>;
  active: FormControl<'' | 'true' | 'false'>;
}

const EMPTY_PAGE: Page<Supplier> = {
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

/** Listado paginado de proveedores, mismo patrón que `BranchListPage`. */
@Component({
  selector: 'app-supplier-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Proveedores</h1>
      @if (isAdmin()) {
        <a routerLink="new" class="button button--primary">Nuevo proveedor</a>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      <input type="search" formControlName="text" placeholder="Buscar por código o nombre…" />
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
          <th>Código</th>
          <th>Nombre</th>
          <th>NIT</th>
          <th>Contacto</th>
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
            <td colspan="6">No hay proveedores que coincidan con el filtro.</td>
          </tr>
        } @else {
          @for (supplier of result().content; track supplier.id) {
            <tr>
              <td data-label="Código">{{ supplier.code }}</td>
              <td data-label="Nombre">{{ supplier.name }}</td>
              <td data-label="NIT">{{ supplier.taxId }}</td>
              <td data-label="Contacto">{{ supplier.email }} · {{ supplier.phone }}</td>
              <td data-label="Estado">
                <span class="badge" [class.badge--active]="supplier.active">
                  {{ supplier.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              @if (isAdmin()) {
                <td data-label="Acciones" class="actions">
                  <a [routerLink]="[supplier.id, 'edit']">Editar</a>
                  <button
                    type="button"
                    (click)="toggleStatus(supplier)"
                    [disabled]="togglingId() === supplier.id"
                  >
                    {{ supplier.active ? 'Dar de baja' : 'Reactivar' }}
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
  styleUrl: './supplier-list.page.scss',
})
export class SupplierListPage {
  private readonly searchSuppliersUseCase = inject(SearchSuppliersUseCase);
  private readonly setSupplierStatusUseCase = inject(SetSupplierStatusUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.role() === Role.Admin);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Supplier>>(EMPTY_PAGE);
  protected readonly togglingId = signal<string | null>(null);

  protected readonly filters = new FormGroup<SupplierFilters>({
    text: new FormControl('', { nonNullable: true }),
    active: new FormControl('', { nonNullable: true }),
  });

  private page = 0;
  private readonly sortBy: SupplierSortField = 'name';
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

  protected toggleStatus(supplier: Supplier): void {
    this.togglingId.set(supplier.id);
    this.setSupplierStatusUseCase
      .execute(supplier.id, !supplier.active)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo cambiar el estado del proveedor.'),
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

    this.searchSuppliersUseCase
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
        error: () => this.errorMessage.set('No se pudo cargar el listado de proveedores.'),
      });
  }
}
