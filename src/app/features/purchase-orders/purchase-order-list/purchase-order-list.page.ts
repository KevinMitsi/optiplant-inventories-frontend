import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SearchPurchaseOrdersUseCase } from '../../../core/application/purchase-orders/search-purchase-orders.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { SearchSuppliersUseCase } from '../../../core/application/suppliers/search-suppliers.usecase';
import { PurchaseOrder } from '../../../core/domain/models/purchase-order.model';
import { Branch } from '../../../core/domain/models/branch.model';
import { Supplier } from '../../../core/domain/models/supplier.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';
import { purchaseOrderStatusLabel } from '../../../shared/utils/status-labels';
import { formatDate } from '../../../shared/utils/formatters';

const EMPTY_PAGE: Page<PurchaseOrder> = {
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
 * Histórico de órdenes de compra de una sucursal (HU-20, RF-22). Igual
 * criterio que `SaleListPage`: la sucursal es obligatoria en la ruta del
 * backend, así que ADMIN elige una con el selector y el resto ve la suya
 * fija, sin selector.
 */
@Component({
  selector: 'app-purchase-order-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Órdenes de compra</h1>
      @if (branchId(); as branchId) {
        <a routerLink="new" [queryParams]="branchQueryParams()" class="button button--primary">Nueva orden</a>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      @if (isAdmin()) {
        <select formControlName="branchId">
          <option value="" disabled>Seleccione una sucursal…</option>
          @for (branch of branches(); track branch.id) {
            <option [value]="branch.id">{{ branch.name }}</option>
          }
        </select>
      }
      <select formControlName="supplierId">
        <option value="">Todos los proveedores</option>
        @for (supplier of suppliers(); track supplier.id) {
          <option [value]="supplier.id">{{ supplier.code }} — {{ supplier.name }}</option>
        }
      </select>
      <select formControlName="status">
        <option value="">Todos los estados</option>
        <option value="DRAFT">Borrador</option>
        <option value="CONFIRMED">Confirmada</option>
        <option value="CANCELLED">Cancelada</option>
      </select>
    </form>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    @if (!branchId()) {
      <p>Seleccione una sucursal para ver sus órdenes de compra.</p>
    } @else {
      <table class="data-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Proveedor</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr>
              <td colspan="5">Cargando…</td>
            </tr>
          } @else if (result().content.length === 0) {
            <tr>
              <td colspan="5">No hay órdenes que coincidan con el filtro.</td>
            </tr>
          } @else {
            @for (order of result().content; track order.id) {
              <tr>
                <td data-label="Número">{{ order.orderNumber }}</td>
                <td data-label="Proveedor">{{ supplierLabel(order.supplierId) }}</td>
                <td data-label="Fecha">{{ formatDate(order.orderDate) }}</td>
                <td data-label="Estado">
                  <span
                    class="badge"
                    [class.badge--warning]="order.status === 'DRAFT'"
                    [class.badge--active]="order.status === 'CONFIRMED'"
                    [class.badge--danger]="order.status === 'CANCELLED'"
                  >
                    {{ statusLabel(order.status) }}
                  </span>
                </td>
                <td data-label="Acciones" class="actions">
                  <a [routerLink]="[order.id]">Ver</a>
                </td>
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
    }
  `,
  styleUrl: './purchase-order-list.page.scss',
})
export class PurchaseOrderListPage {
  private readonly searchPurchaseOrdersUseCase = inject(SearchPurchaseOrdersUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly searchSuppliersUseCase = inject(SearchSuppliersUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.currentUser()?.branchId === null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<PurchaseOrder>>(EMPTY_PAGE);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly statusLabel = purchaseOrderStatusLabel;
  protected readonly formatDate = formatDate;

  protected readonly filters = new FormGroup({
    branchId: new FormControl('', { nonNullable: true }),
    supplierId: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
  });

  private readonly adminBranchId = signal<string | null>(null);

  protected readonly branchId = computed(() => {
    const ownBranchId = this.authStore.currentUser()?.branchId;
    return ownBranchId ?? this.adminBranchId();
  });

  protected readonly branchQueryParams = computed(() =>
    this.isAdmin() && this.branchId() ? { branchId: this.branchId() } : {},
  );

  private page = 0;

  constructor() {
    this.loadSuppliers();

    if (this.isAdmin()) {
      this.loadBranches();
    } else {
      this.search();
    }

    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(({ branchId }) => {
      this.adminBranchId.set(branchId || null);
      this.page = 0;
      this.search();
    });
  }

  protected supplierLabel(supplierId: string): string {
    const supplier = this.suppliers().find((candidate) => candidate.id === supplierId);
    return supplier ? `${supplier.code} — ${supplier.name}` : supplierId;
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  private loadBranches(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchBranchesUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe({
        next: (page) => {
          this.branches.set(page.content);
          const firstBranch = page.content[0];
          if (firstBranch) {
            this.filters.controls.branchId.setValue(firstBranch.id);
          } else {
            this.loading.set(false);
          }
        },
      });
  }

  private loadSuppliers(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchSuppliersUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe({ next: (page) => this.suppliers.set(page.content) });
  }

  private search(): void {
    const branchId = this.branchId();
    if (!branchId) {
      return;
    }

    const { supplierId, status } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchPurchaseOrdersUseCase
      .execute(branchId, {
        page: this.page,
        size: 20,
        supplierId: supplierId || undefined,
        status: status || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudieron cargar las órdenes de compra.'),
      });
  }
}
