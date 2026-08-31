import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { GetPurchaseOrderUseCase } from '../../../core/application/purchase-orders/get-purchase-order.usecase';
import { ConfirmPurchaseOrderUseCase } from '../../../core/application/purchase-orders/confirm-purchase-order.usecase';
import { CancelPurchaseOrderUseCase } from '../../../core/application/purchase-orders/cancel-purchase-order.usecase';
import { ReceivePurchaseOrderItemUseCase } from '../../../core/application/purchase-orders/receive-purchase-order-item.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { SearchSuppliersUseCase } from '../../../core/application/suppliers/search-suppliers.usecase';
import { PurchaseOrder, PurchaseOrderItem } from '../../../core/domain/models/purchase-order.model';
import { Product } from '../../../core/domain/models/product.model';
import { Supplier } from '../../../core/domain/models/supplier.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

/**
 * Comprobante de una orden de compra (HU-20) con su ciclo de vida:
 * confirmarla (`POST /purchase-orders/{id}/confirmation`, a partir de ahí
 * puede empezar a recibirse mercancía), cancelarla (`POST /purchase-orders/{id}/cancellation`,
 * "solo antes de recibir cualquier mercancía" según su propia descripción en
 * APIDOC.json) y recibir cada línea por separado (`POST /purchase-orders/{id}/items/{itemId}/receipt`,
 * admite recepción parcial — HU-19, RF-21/RF-23).
 */
@Component({
  selector: 'app-purchase-order-detail-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Orden de compra</h1>

    @if (loading()) {
      <p>Cargando…</p>
    } @else if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    } @else if (order(); as order) {
      <p class="hint">
        {{ order.orderNumber }} · {{ supplierLabel(order.supplierId) }} ·
        <span
          class="badge"
          [class.badge--warning]="order.status === 'DRAFT'"
          [class.badge--active]="order.status === 'CONFIRMED'"
          [class.badge--danger]="order.status === 'CANCELLED'"
        >
          {{ order.status }}
        </span>
        · Fecha: {{ order.orderDate }} · Plazo de pago: {{ order.paymentTermDays }} días
      </p>
      @if (order.notes) {
        <p class="hint">{{ order.notes }}</p>
      }

      <table class="data-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Presentación</th>
            <th>Cantidad</th>
            <th>Recibido</th>
            <th>Precio unitario</th>
            <th>Descuento %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (item of order.items; track item.id) {
            <tr>
              <td data-label="Producto">{{ productLabel(item.productId) }}</td>
              <td data-label="Presentación">{{ unitLabel(item.productId, item.productUnitId) }}</td>
              <td data-label="Cantidad">{{ item.quantity }}</td>
              <td data-label="Recibido">
                @if (receivingItemId() === item.id) {
                  <input type="number" [formControl]="quantityReceivedControl" step="any" min="0" />
                } @else {
                  {{ item.receivedQuantity }}
                }
              </td>
              <td data-label="Precio unitario">{{ item.unitPrice }}</td>
              <td data-label="Descuento %">{{ item.discountPercentage }}</td>
              <td data-label="Acciones" class="actions">
                @if (canReceive(order, item)) {
                  @if (receivingItemId() === item.id) {
                    <button type="button" (click)="saveReceipt(order.id, item)" [disabled]="receiving()">
                      Confirmar recepción
                    </button>
                    <button type="button" (click)="cancelReceiptEdit()">Cancelar</button>
                  } @else {
                    <button type="button" (click)="startReceiptEdit(item)">Recibir</button>
                  }
                }
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (actionError(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }

      <div class="actions">
        <a routerLink="/purchase-orders" class="button button--ghost">Volver</a>
        @if (order.status === 'DRAFT') {
          <button type="button" class="button button--primary" (click)="confirm(order.id)" [disabled]="acting()">
            {{ acting() ? 'Confirmando…' : 'Confirmar orden' }}
          </button>
        }
        @if (canCancel(order)) {
          <button type="button" class="button button--ghost" (click)="cancel(order.id)" [disabled]="acting()">
            {{ acting() ? 'Cancelando…' : 'Cancelar orden' }}
          </button>
        }
      </div>
    }
  `,
  styleUrl: './purchase-order-detail.page.scss',
})
export class PurchaseOrderDetailPage {
  private readonly getPurchaseOrderUseCase = inject(GetPurchaseOrderUseCase);
  private readonly confirmPurchaseOrderUseCase = inject(ConfirmPurchaseOrderUseCase);
  private readonly cancelPurchaseOrderUseCase = inject(CancelPurchaseOrderUseCase);
  private readonly receivePurchaseOrderItemUseCase = inject(ReceivePurchaseOrderItemUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly searchSuppliersUseCase = inject(SearchSuppliersUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly order = signal<PurchaseOrder | null>(null);
  protected readonly products = signal<Map<string, Product>>(new Map());
  protected readonly suppliers = signal<Map<string, Supplier>>(new Map());
  protected readonly acting = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly receivingItemId = signal<string | null>(null);
  protected readonly receiving = signal(false);
  protected readonly quantityReceivedControl = new FormControl<number | null>(null);

  protected readonly hasAnyReceipt = computed(() =>
    (this.order()?.items ?? []).some((item) => item.receivedQuantity > 0),
  );

  constructor() {
    this.loadProducts();
    this.loadSuppliers();
    this.load();
  }

  protected productLabel(productId: string): string {
    const product = this.products().get(productId);
    return product ? `${product.sku} — ${product.name}` : productId;
  }

  protected supplierLabel(supplierId: string): string {
    const supplier = this.suppliers().get(supplierId);
    return supplier ? `${supplier.code} — ${supplier.name}` : supplierId;
  }

  protected unitLabel(productId: string, productUnitId: string): string {
    const unit = this.products().get(productId)?.units.find((productUnit) => productUnit.id === productUnitId);
    return unit ? `${unit.unit.symbol} — ${unit.unit.name}` : productUnitId;
  }

  protected canCancel(order: PurchaseOrder): boolean {
    return (order.status === 'DRAFT' || order.status === 'CONFIRMED') && !this.hasAnyReceipt();
  }

  protected canReceive(order: PurchaseOrder, item: PurchaseOrderItem): boolean {
    return order.status === 'CONFIRMED' && item.receivedQuantity < item.quantity;
  }

  protected startReceiptEdit(item: PurchaseOrderItem): void {
    this.receivingItemId.set(item.id);
    this.quantityReceivedControl.setValue(item.quantity - item.receivedQuantity);
  }

  protected cancelReceiptEdit(): void {
    this.receivingItemId.set(null);
  }

  protected saveReceipt(orderId: string, item: PurchaseOrderItem): void {
    const quantityReceived = this.quantityReceivedControl.value;
    if (quantityReceived === null || quantityReceived <= 0) {
      return;
    }

    this.receiving.set(true);
    this.actionError.set(null);
    this.receivePurchaseOrderItemUseCase
      .execute(orderId, item.id, { quantityReceived })
      .pipe(finalize(() => this.receiving.set(false)))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.receivingItemId.set(null);
        },
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo registrar la recepción.'),
      });
  }

  protected confirm(orderId: string): void {
    this.acting.set(true);
    this.actionError.set(null);
    this.confirmPurchaseOrderUseCase
      .execute(orderId)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (order) => this.order.set(order),
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo confirmar la orden.'),
      });
  }

  protected cancel(orderId: string): void {
    this.acting.set(true);
    this.actionError.set(null);
    this.cancelPurchaseOrderUseCase
      .execute(orderId)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (order) => this.order.set(order),
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo cancelar la orden.'),
      });
  }

  private load(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de orden inválido.');
      return;
    }

    this.getPurchaseOrderUseCase
      .execute(orderId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (order) => this.order.set(order),
        error: () => this.errorMessage.set('No existe una orden de compra con ese identificador.'),
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

  private loadSuppliers(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchSuppliersUseCase.execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC' }).subscribe({
      next: (page) => this.suppliers.set(new Map(page.content.map((supplier) => [supplier.id, supplier]))),
    });
  }
}
