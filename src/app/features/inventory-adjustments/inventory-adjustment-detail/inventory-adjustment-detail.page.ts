import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { GetInventoryAdjustmentUseCase } from '../../../core/application/inventory-adjustments/get-inventory-adjustment.usecase';
import { ApproveInventoryAdjustmentUseCase } from '../../../core/application/inventory-adjustments/approve-inventory-adjustment.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { InventoryAdjustment } from '../../../core/domain/models/inventory-adjustment.model';
import { Product } from '../../../core/domain/models/product.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { formatDateTime, formatQuantity } from '../../../shared/utils/formatters';

/**
 * Consulta de un ajuste por identificador y su aprobación (HU-15/RN-14). No
 * existe un listado de ajustes en la API (`GET /branches/{branchId}/inventory-adjustments`
 * no está documentado), así que llegar aquí requiere el id devuelto al
 * crearlo o compartido por otra vía — mismo criterio que la consulta puntual
 * de precio de producto en `PriceListFormPage` (Fase 5).
 */
@Component({
  selector: 'app-inventory-adjustment-detail-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-adjustment-detail.page.html',
  styleUrl: './inventory-adjustment-detail.page.scss',
})
export class InventoryAdjustmentDetailPage {
  private readonly getInventoryAdjustmentUseCase = inject(GetInventoryAdjustmentUseCase);
  private readonly approveInventoryAdjustmentUseCase = inject(ApproveInventoryAdjustmentUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly adjustment = signal<InventoryAdjustment | null>(null);
  protected readonly products = signal<Map<string, Product>>(new Map());
  protected readonly approving = signal(false);
  protected readonly approveError = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatQuantity = formatQuantity;

  constructor() {
    this.loadProducts();
    this.load();
  }

  protected productLabel(productId: string): string {
    const product = this.products().get(productId);
    return product ? `${product.sku} — ${product.name}` : productId;
  }

  protected approve(adjustmentId: string): void {
    this.approving.set(true);
    this.approveError.set(null);
    this.approveInventoryAdjustmentUseCase
      .execute(adjustmentId)
      .pipe(finalize(() => this.approving.set(false)))
      .subscribe({
        next: (adjustment) => this.adjustment.set(adjustment),
        error: (error: ApiError) => this.approveError.set(error.message ?? 'No se pudo aprobar el ajuste.'),
      });
  }

  private load(): void {
    const adjustmentId = this.route.snapshot.paramMap.get('id');
    if (!adjustmentId) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de ajuste inválido.');
      return;
    }

    this.getInventoryAdjustmentUseCase
      .execute(adjustmentId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (adjustment) => this.adjustment.set(adjustment),
        error: () => this.errorMessage.set('No existe un ajuste con ese identificador.'),
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
}
