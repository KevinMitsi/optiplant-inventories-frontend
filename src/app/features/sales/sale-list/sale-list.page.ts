import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SearchSalesUseCase } from '../../../core/application/sales/search-sales.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { Sale } from '../../../core/domain/models/sale.model';
import { Branch } from '../../../core/domain/models/branch.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';
import { saleStatusLabel } from '../../../shared/utils/status-labels';
import { formatDate, formatMoney } from '../../../shared/utils/formatters';

const EMPTY_PAGE: Page<Sale> = {
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
 * Histórico de ventas de una sucursal (HU-26, RF-30). Igual criterio que
 * `InventoryListPage` (Fase 6): la sucursal es obligatoria en la ruta del
 * backend, así que ADMIN elige una con el selector y el resto ve la suya
 * fija, sin selector.
 */
@Component({
  selector: 'app-sale-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sale-list.page.html',
  styleUrl: './sale-list.page.scss',
})
export class SaleListPage {
  private readonly searchSalesUseCase = inject(SearchSalesUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.currentUser()?.branchId === null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Sale>>(EMPTY_PAGE);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly statusLabel = saleStatusLabel;
  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;

  protected readonly filters = new FormGroup({
    branchId: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    fromDate: new FormControl('', { nonNullable: true }),
    toDate: new FormControl('', { nonNullable: true }),
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

  private search(): void {
    const branchId = this.branchId();
    if (!branchId) {
      return;
    }

    const { status, fromDate, toDate } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    // `fromDate`/`toDate` de la API son `date-time` (requiere offset, si no
    // el backend responde 400 al no poder parsear un `LocalDateTime` sin
    // zona); el `<input type="date">` solo da fecha, así que se acota al
    // inicio/fin de ese día en UTC.
    this.searchSalesUseCase
      .execute(branchId, {
        page: this.page,
        size: 20,
        status: status || undefined,
        fromDate: fromDate ? `${fromDate}T00:00:00Z` : undefined,
        toDate: toDate ? `${toDate}T23:59:59Z` : undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudieron cargar las ventas.'),
      });
  }
}
