import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SearchInventoryAlertsUseCase } from '../../../core/application/inventory-alerts/search-inventory-alerts.usecase';
import { DismissInventoryAlertUseCase } from '../../../core/application/inventory-alerts/dismiss-inventory-alert.usecase';
import { ResolveInventoryAlertUseCase } from '../../../core/application/inventory-alerts/resolve-inventory-alert.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { InventoryAlert } from '../../../core/domain/models/inventory-alert.model';
import { Branch } from '../../../core/domain/models/branch.model';
import { Product } from '../../../core/domain/models/product.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';
import { inventoryAlertStatusLabel, inventoryAlertTypeLabel } from '../../../shared/utils/status-labels';
import { formatDateTime, formatQuantity } from '../../../shared/utils/formatters';

const EMPTY_PAGE: Page<InventoryAlert> = {
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
 * Avisos automáticos de stock bajo/agotado (HU-16, RF-16). Sin `branchId` un
 * ADMIN ve las de toda la organización (RN-12, mismo criterio documentado en
 * `searchInventoryAlerts`); BRANCH_MANAGER/INVENTORY_OPERATOR solo pueden
 * operar sobre la suya, así que no se les ofrece el selector. Por defecto el
 * backend solo devuelve las abiertas (`status=OPEN`).
 */
@Component({
  selector: 'app-inventory-alert-list-page',
  imports: [ReactiveFormsModule, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-alert-list.page.html',
  styleUrl: './inventory-alert-list.page.scss',
})
export class InventoryAlertListPage {
  private readonly searchInventoryAlertsUseCase = inject(SearchInventoryAlertsUseCase);
  private readonly dismissInventoryAlertUseCase = inject(DismissInventoryAlertUseCase);
  private readonly resolveInventoryAlertUseCase = inject(ResolveInventoryAlertUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.currentUser()?.branchId === null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<InventoryAlert>>(EMPTY_PAGE);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly products = signal<Map<string, Product>>(new Map());
  protected readonly actioningId = signal<string | null>(null);
  protected readonly alertStatusLabel = inventoryAlertStatusLabel;
  protected readonly alertTypeLabel = inventoryAlertTypeLabel;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatQuantity = formatQuantity;
  protected readonly alertColspan = computed(() => (this.isAdmin() ? 8 : 7));

  protected readonly filters = new FormGroup({
    branchId: new FormControl('', { nonNullable: true }),
    status: new FormControl('OPEN', { nonNullable: true }),
  });

  private page = 0;

  constructor() {
    this.loadProducts();

    if (this.isAdmin()) {
      this.loadBranches();
    }

    this.search();

    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.page = 0;
      this.search();
    });
  }

  protected productLabel(productId: string): string {
    const product = this.products().get(productId);
    return product ? `${product.sku} — ${product.name}` : productId;
  }

  protected branchLabel(branchId: string): string {
    const branch = this.branches().find((candidate) => candidate.id === branchId);
    return branch ? branch.name : branchId;
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected resolve(alertId: string): void {
    this.actioningId.set(alertId);
    this.resolveInventoryAlertUseCase
      .execute(alertId)
      .pipe(finalize(() => this.actioningId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo resolver la alerta.'),
      });
  }

  protected dismiss(alertId: string): void {
    this.actioningId.set(alertId);
    this.dismissInventoryAlertUseCase
      .execute(alertId)
      .pipe(finalize(() => this.actioningId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo descartar la alerta.'),
      });
  }

  private loadProducts(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchProductsUseCase.execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC' }).subscribe({
      next: (page) => this.products.set(new Map(page.content.map((product) => [product.id, product]))),
    });
  }

  private loadBranches(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchBranchesUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe({ next: (page) => this.branches.set(page.content) });
  }

  private search(): void {
    const { branchId, status } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchInventoryAlertsUseCase
      .execute({ page: this.page, size: 20, branchId: branchId || undefined, status: status || undefined })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudieron cargar las alertas.'),
      });
  }
}
