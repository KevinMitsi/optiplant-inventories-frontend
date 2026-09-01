import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { GetSaleUseCase } from '../../../core/application/sales/get-sale.usecase';
import { ConfirmSaleUseCase } from '../../../core/application/sales/confirm-sale.usecase';
import { CancelSaleUseCase } from '../../../core/application/sales/cancel-sale.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { Sale } from '../../../core/domain/models/sale.model';
import { Product } from '../../../core/domain/models/product.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

/**
 * Comprobante de una venta (HU-26) con sus acciones de ciclo de vida:
 * confirmarla (`POST /sales/{id}/confirmation`, descuenta inventario vía
 * `SALE_OUT`, RN-03) o cancelarla (`POST /sales/{id}/cancellation`, restituye
 * con `RETURN_IN` si ya estaba confirmada). Una vez cancelada no queda
 * ninguna acción disponible.
 */
@Component({
  selector: 'app-sale-detail-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Venta</h1>

    @if (loading()) {
      <p>Cargando…</p>
    } @else if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    } @else if (sale(); as sale) {
      <p class="hint">
        {{ sale.saleNumber }} ·
        <span
          class="badge"
          [class.badge--warning]="sale.status === 'DRAFT'"
          [class.badge--active]="sale.status === 'CONFIRMED'"
          [class.badge--danger]="sale.status === 'CANCELLED'"
        >
          {{ sale.status }}
        </span>
        · Fecha: {{ sale.saleDate }} · Total: {{ sale.total }}
      </p>
      @if (sale.notes) {
        <p class="hint">{{ sale.notes }}</p>
      }

      <table class="data-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Unidad</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>Descuento %</th>
          </tr>
        </thead>
        <tbody>
          @for (item of sale.items; track item.id) {
            <tr>
              <td data-label="Producto">{{ productLabel(item.productId) }}</td>
              <td data-label="Unidad">{{ unitLabel(item.productId) }}</td>
              <td data-label="Cantidad">{{ item.quantity }}</td>
              <td data-label="Precio unitario">{{ item.unitPrice }}</td>
              <td data-label="Descuento %">{{ item.discountPercentage }}</td>
            </tr>
          }
        </tbody>
      </table>

      @if (actionError(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }

      <div class="actions">
        <a routerLink="/sales" class="button button--ghost">Volver</a>
        @if (sale.status === 'DRAFT') {
          <button type="button" class="button button--primary" (click)="confirm(sale.id)" [disabled]="acting()">
            {{ acting() ? 'Confirmando…' : 'Confirmar venta' }}
          </button>
        }
        @if (sale.status === 'DRAFT' || sale.status === 'CONFIRMED') {
          <button type="button" class="button button--ghost" (click)="cancel(sale.id)" [disabled]="acting()">
            {{ acting() ? 'Cancelando…' : 'Cancelar venta' }}
          </button>
        }
      </div>
    }
  `,
  styleUrl: './sale-detail.page.scss',
})
export class SaleDetailPage {
  private readonly getSaleUseCase = inject(GetSaleUseCase);
  private readonly confirmSaleUseCase = inject(ConfirmSaleUseCase);
  private readonly cancelSaleUseCase = inject(CancelSaleUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly sale = signal<Sale | null>(null);
  protected readonly products = signal<Map<string, Product>>(new Map());
  protected readonly acting = signal(false);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    this.loadProducts();
    this.load();
  }

  protected productLabel(productId: string): string {
    const product = this.products().get(productId);
    return product ? `${product.sku} — ${product.name}` : productId;
  }

  protected unitLabel(productId: string): string {
    const unit = this.products().get(productId)?.unit;
    return unit ? `${unit.symbol} — ${unit.name}` : '—';
  }

  protected confirm(saleId: string): void {
    this.acting.set(true);
    this.actionError.set(null);
    this.confirmSaleUseCase
      .execute(saleId)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (sale) => this.sale.set(sale),
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo confirmar la venta.'),
      });
  }

  protected cancel(saleId: string): void {
    this.acting.set(true);
    this.actionError.set(null);
    this.cancelSaleUseCase
      .execute(saleId)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (sale) => this.sale.set(sale),
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo cancelar la venta.'),
      });
  }

  private load(): void {
    const saleId = this.route.snapshot.paramMap.get('id');
    if (!saleId) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de venta inválido.');
      return;
    }

    this.getSaleUseCase
      .execute(saleId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (sale) => this.sale.set(sale),
        error: () => this.errorMessage.set('No existe una venta con ese identificador.'),
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
