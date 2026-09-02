import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { GetInventoryUseCase } from '../../../core/application/inventory/get-inventory.usecase';
import { GetMovementHistoryUseCase } from '../../../core/application/inventory/get-movement-history.usecase';
import { GetProductUseCase } from '../../../core/application/products/get-product.usecase';
import { Inventory, InventoryMovement } from '../../../core/domain/models/inventory.model';
import { Product } from '../../../core/domain/models/product.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';
import { inventoryMovementTypeLabel } from '../../../shared/utils/status-labels';
import { formatDateTime, formatMoney, formatQuantity } from '../../../shared/utils/formatters';

const EMPTY_PAGE: Page<InventoryMovement> = {
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
 * Histórico de movimientos de un saldo, del más reciente al más antiguo
 * (HU-14, RN-11): quién movió cuánto, cuándo y por qué. Cabecera con el
 * saldo actual (`Inventory`) para dar contexto sin obligar a volver al
 * listado.
 */
@Component({
  selector: 'app-inventory-movements-page',
  imports: [RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-movements.page.html',
  styleUrl: './inventory-movements.page.scss',
})
export class InventoryMovementsPage {
  private readonly getInventoryUseCase = inject(GetInventoryUseCase);
  private readonly getMovementHistoryUseCase = inject(GetMovementHistoryUseCase);
  private readonly getProductUseCase = inject(GetProductUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly loadingHeader = signal(true);
  protected readonly headerErrorMessage = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly inventory = signal<Inventory | null>(null);
  protected readonly product = signal<Product | null>(null);
  protected readonly result = signal<Page<InventoryMovement>>(EMPTY_PAGE);
  protected readonly movementTypeLabel = inventoryMovementTypeLabel;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatMoney = formatMoney;
  protected readonly formatQuantity = formatQuantity;

  protected readonly branchQueryParams = this.route.snapshot.queryParamMap.get('branchId')
    ? { branchId: this.route.snapshot.queryParamMap.get('branchId') }
    : {};

  private readonly branchId =
    this.authStore.currentUser()?.branchId ?? this.route.snapshot.queryParamMap.get('branchId');
  private readonly productId = this.route.snapshot.paramMap.get('productId')!;
  private page = 0;

  constructor() {
    if (!this.branchId) {
      this.loadingHeader.set(false);
      this.headerErrorMessage.set('No se pudo determinar la sucursal.');
      return;
    }

    forkJoin({
      inventory: this.getInventoryUseCase.execute(this.branchId, this.productId),
      product: this.getProductUseCase.execute(this.productId),
    })
      .pipe(finalize(() => this.loadingHeader.set(false)))
      .subscribe({
        next: ({ inventory, product }) => {
          this.inventory.set(inventory);
          this.product.set(product);
        },
        error: () => this.headerErrorMessage.set('No se pudo cargar el saldo del producto.'),
      });

    this.search();
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  private search(): void {
    if (!this.branchId) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.getMovementHistoryUseCase
      .execute(this.branchId, this.productId, { page: this.page, size: 20 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el histórico de movimientos.'),
      });
  }
}
