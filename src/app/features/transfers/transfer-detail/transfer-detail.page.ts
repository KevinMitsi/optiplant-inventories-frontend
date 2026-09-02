import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { GetTransferUseCase } from '../../../core/application/transfers/get-transfer.usecase';
import { ApproveTransferUseCase } from '../../../core/application/transfers/approve-transfer.usecase';
import { StartTransferPreparationUseCase } from '../../../core/application/transfers/start-transfer-preparation.usecase';
import { AssignTransferLogisticsUseCase } from '../../../core/application/transfers/assign-transfer-logistics.usecase';
import { DispatchTransferUseCase } from '../../../core/application/transfers/dispatch-transfer.usecase';
import { ReceiveTransferUseCase } from '../../../core/application/transfers/receive-transfer.usecase';
import { CancelTransferUseCase } from '../../../core/application/transfers/cancel-transfer.usecase';
import { ListTransferIssuesUseCase } from '../../../core/application/transfers/list-transfer-issues.usecase';
import { ResolveTransferIssueUseCase } from '../../../core/application/transfers/resolve-transfer-issue.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { SearchCarriersUseCase } from '../../../core/application/carriers/search-carriers.usecase';
import { SearchLogisticsRoutesUseCase } from '../../../core/application/logistics-routes/search-logistics-routes.usecase';
import { Transfer, TransferIssue, TransferIssueResolutionType, TransferItem } from '../../../core/domain/models/transfer.model';
import { Product } from '../../../core/domain/models/product.model';
import { Branch } from '../../../core/domain/models/branch.model';
import { Carrier } from '../../../core/domain/models/carrier.model';
import { LogisticsRoute } from '../../../core/domain/models/logistics-route.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import {
  transferStatusLabel,
  transferPriorityLabel,
  transferIssueTypeLabel,
  transferIssueResolutionLabel,
} from '../../../shared/utils/status-labels';
import { formatDateTime } from '../../../shared/utils/formatters';

type LineActionMode = 'approve' | 'dispatch' | 'receive' | null;

/**
 * Comprobante de una transferencia (RF-46) con su ciclo de vida completo:
 * solicitud → aprobación (HU-29, ajusta cantidades por línea) → preparación
 * → asignación de transportista y ruta (solo antes de despachar) →
 * despacho (descuenta inventario de origen, RN-08) → recepción (aumenta
 * inventario de destino por lo realmente recibido, RN-09; faltante abre
 * incidencia, RN-10) → resolución de incidencias (HU-33) o cancelación
 * (solo antes de despachar).
 */
@Component({
  selector: 'app-transfer-detail-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transfer-detail.page.html',
  styleUrl: './transfer-detail.page.scss',
})
export class TransferDetailPage {
  private readonly getTransferUseCase = inject(GetTransferUseCase);
  private readonly approveTransferUseCase = inject(ApproveTransferUseCase);
  private readonly startTransferPreparationUseCase = inject(StartTransferPreparationUseCase);
  private readonly assignTransferLogisticsUseCase = inject(AssignTransferLogisticsUseCase);
  private readonly dispatchTransferUseCase = inject(DispatchTransferUseCase);
  private readonly receiveTransferUseCase = inject(ReceiveTransferUseCase);
  private readonly cancelTransferUseCase = inject(CancelTransferUseCase);
  private readonly listTransferIssuesUseCase = inject(ListTransferIssuesUseCase);
  private readonly resolveTransferIssueUseCase = inject(ResolveTransferIssueUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly searchCarriersUseCase = inject(SearchCarriersUseCase);
  private readonly searchLogisticsRoutesUseCase = inject(SearchLogisticsRoutesUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly transfer = signal<Transfer | null>(null);
  protected readonly products = signal<Map<string, Product>>(new Map());
  protected readonly branches = signal<Map<string, Branch>>(new Map());
  protected readonly carriers = signal<Carrier[]>([]);
  protected readonly routes = signal<LogisticsRoute[]>([]);
  protected readonly issues = signal<TransferIssue[]>([]);
  protected readonly acting = signal(false);
  protected readonly actionError = signal<string | null>(null);

  /** No es INVENTORY_OPERATOR: aprobar compromete stock de origen, "fuera del alcance del operador" (APIDOC.json). */
  protected readonly canSupervise = computed(() => this.authStore.role() !== Role.InventoryOperator);

  protected readonly lineActionMode = signal<LineActionMode>(null);
  protected readonly lineControls = signal<FormControl<number | null>[]>([]);

  protected readonly assigningLogistics = signal(false);
  protected readonly logisticsForm = new FormGroup({
    carrierId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    routeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    estimatedArrivalAt: new FormControl('', { nonNullable: true }),
  });

  protected readonly matchingRoutes = computed(() => {
    const transfer = this.transfer();
    if (!transfer) {
      return [];
    }
    return this.routes().filter(
      (route) =>
        route.originBranchId === transfer.originBranchId && route.destinationBranchId === transfer.destinationBranchId,
    );
  });

  protected readonly resolvingIssueId = signal<string | null>(null);
  protected readonly resolutionTypeControl = new FormControl<TransferIssueResolutionType>('RESHIPMENT', {
    nonNullable: true,
  });

  protected readonly statusLabel = transferStatusLabel;
  protected readonly priorityLabel = transferPriorityLabel;
  protected readonly issueTypeLabel = transferIssueTypeLabel;
  protected readonly issueResolutionLabel = transferIssueResolutionLabel;
  protected readonly formatDateTime = formatDateTime;

  constructor() {
    this.loadProducts();
    this.loadBranches();
    this.loadCarriers();
    this.loadRoutes();
    this.load();
  }

  protected productLabel(productId: string): string {
    const product = this.products().get(productId);
    return product ? `${product.sku} — ${product.name}` : productId;
  }

  protected branchLabel(branchId: string): string {
    return this.branches().get(branchId)?.name ?? branchId;
  }

  protected unitLabel(productId: string): string {
    const unit = this.products().get(productId)?.unit;
    return unit ? `${unit.symbol} — ${unit.name}` : '—';
  }

  protected carrierLabel(carrierId: string | null): string {
    if (!carrierId) {
      return '—';
    }
    const carrier = this.carriers().find((candidate) => candidate.id === carrierId);
    return carrier ? `${carrier.code} — ${carrier.name}` : carrierId;
  }

  protected routeLabel(routeId: string | null): string {
    if (!routeId) {
      return '—';
    }
    const route = this.routes().find((candidate) => candidate.id === routeId);
    return route ? route.name || route.id : routeId;
  }

  protected itemLabel(transfer: Transfer, transferItemId: string): string {
    const item = transfer.items.find((candidate) => candidate.id === transferItemId);
    return item ? this.productLabel(item.productId) : transferItemId;
  }

  /**
   * El `description` que manda el backend incluye el UUID crudo del producto
   * ("Faltante al recibir la transferencia TR-2026-0002: producto
   * 1f9120f2-...") en vez de su nombre — se arma acá una descripción legible
   * a partir de datos que ya tenemos (línea + producto), ignorando ese texto.
   */
  protected issueDescription(transfer: Transfer, issue: TransferIssue): string {
    return `${this.issueTypeLabel(issue.issueType)} de ${issue.quantity} · ${this.itemLabel(transfer, issue.transferItemId)}`;
  }

  protected canApprove(transfer: Transfer): boolean {
    return transfer.status === 'REQUESTED' && this.canSupervise();
  }

  protected canStartPreparation(transfer: Transfer): boolean {
    return transfer.status === 'APPROVED';
  }

  protected canAssignLogistics(transfer: Transfer): boolean {
    return transfer.status === 'IN_PREPARATION' && !transfer.routeId;
  }

  protected canDispatch(transfer: Transfer): boolean {
    return transfer.status === 'IN_PREPARATION' && !!transfer.routeId;
  }

  protected canReceive(transfer: Transfer): boolean {
    // El backend nombra este estado `IN_TRANSIT` (no `DISPATCHED`, como se
    // asumió originalmente): sin este ajuste el botón "Recibir" no aparecía
    // nunca tras despachar, en ninguna sucursal.
    return transfer.status === 'IN_TRANSIT';
  }

  protected canCancel(transfer: Transfer): boolean {
    return !transfer.shippedAt && transfer.status !== 'CANCELLED' && transfer.status !== 'CLOSED';
  }

  protected lineActionLabel(mode: LineActionMode): string {
    if (this.acting()) {
      return 'Guardando…';
    }
    switch (mode) {
      case 'approve':
        return 'Confirmar aprobación';
      case 'dispatch':
        return 'Confirmar despacho';
      case 'receive':
        return 'Confirmar recepción';
      default:
        return 'Confirmar';
    }
  }

  protected startLineAction(mode: LineActionMode, items: TransferItem[]): void {
    this.lineActionMode.set(mode);
    this.lineControls.set(
      items.map((item) => {
        // Recepción: por defecto lo que falta por recibir (despachado menos
        // ya recibido), no 0 — así una segunda recepción parcial no obliga a
        // recalcular el pendiente a mano, igual que ya hace la recepción de
        // órdenes de compra (`PurchaseOrderDetailPage.startReceiptEdit`).
        const defaultQuantity =
          mode === 'approve'
            ? item.requestedQuantity
            : mode === 'dispatch'
              ? item.approvedQuantity
              : item.shippedQuantity - item.receivedQuantity;
        return new FormControl<number | null>(defaultQuantity, { validators: [Validators.min(0)] });
      }),
    );
  }

  protected cancelLineAction(): void {
    this.lineActionMode.set(null);
    this.lineControls.set([]);
  }

  protected submitLineAction(transfer: Transfer): void {
    const mode = this.lineActionMode();
    if (!mode) {
      return;
    }

    const controls = this.lineControls();
    const quantities = transfer.items.map((item, index) => ({
      itemId: item.id,
      quantity: controls[index]?.value ?? 0,
    }));

    this.acting.set(true);
    this.actionError.set(null);

    const request$ =
      mode === 'approve'
        ? this.approveTransferUseCase.execute(transfer.id, { approvedQuantities: quantities })
        : mode === 'dispatch'
          ? this.dispatchTransferUseCase.execute(transfer.id, { shippedQuantities: quantities })
          : this.receiveTransferUseCase.execute(transfer.id, { receivedQuantities: quantities });

    request$.pipe(finalize(() => this.acting.set(false))).subscribe({
      next: (updated) => {
        this.transfer.set(updated);
        this.cancelLineAction();
        if (mode === 'receive') {
          this.loadIssues(updated.id);
        }
      },
      error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo completar la acción.'),
    });
  }

  protected startAssignLogistics(): void {
    this.assigningLogistics.set(true);
    this.logisticsForm.reset({ carrierId: '', routeId: '', estimatedArrivalAt: '' });
  }

  protected submitLogistics(transferId: string): void {
    if (this.logisticsForm.invalid || this.acting()) {
      this.logisticsForm.markAllAsTouched();
      return;
    }

    const { carrierId, routeId, estimatedArrivalAt } = this.logisticsForm.getRawValue();
    this.acting.set(true);
    this.actionError.set(null);

    this.assignTransferLogisticsUseCase
      .execute(transferId, {
        carrierId,
        routeId,
        estimatedArrivalAt: estimatedArrivalAt ? `${estimatedArrivalAt}:00` : undefined,
      })
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (updated) => {
          this.transfer.set(updated);
          this.assigningLogistics.set(false);
        },
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo asignar la logística.'),
      });
  }

  protected startPreparation(transferId: string): void {
    this.acting.set(true);
    this.actionError.set(null);
    this.startTransferPreparationUseCase
      .execute(transferId)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (updated) => this.transfer.set(updated),
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo iniciar la preparación.'),
      });
  }

  protected cancel(transferId: string): void {
    this.acting.set(true);
    this.actionError.set(null);
    this.cancelTransferUseCase
      .execute(transferId)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (updated) => this.transfer.set(updated),
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo cancelar la transferencia.'),
      });
  }

  protected saveIssueResolution(transferId: string, issueId: string): void {
    this.acting.set(true);
    this.actionError.set(null);
    this.resolveTransferIssueUseCase
      .execute(transferId, issueId, { resolutionType: this.resolutionTypeControl.value })
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: () => {
          this.resolvingIssueId.set(null);
          this.loadIssues(transferId);
          this.getTransferUseCase.execute(transferId).subscribe({ next: (updated) => this.transfer.set(updated) });
        },
        error: (error: ApiError) => this.actionError.set(error.message ?? 'No se pudo resolver la incidencia.'),
      });
  }

  private load(): void {
    const transferId = this.route.snapshot.paramMap.get('id');
    if (!transferId) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de transferencia inválido.');
      return;
    }

    this.getTransferUseCase
      .execute(transferId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (transfer) => {
          this.transfer.set(transfer);
          this.loadIssues(transferId);
        },
        error: () => this.errorMessage.set('No existe una transferencia con ese identificador.'),
      });
  }

  private loadIssues(transferId: string): void {
    this.listTransferIssuesUseCase.execute(transferId).subscribe({ next: (issues) => this.issues.set(issues) });
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

    this.searchBranchesUseCase.execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC' }).subscribe({
      next: (page) => this.branches.set(new Map(page.content.map((branch) => [branch.id, branch]))),
    });
  }

  private loadCarriers(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchCarriersUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe({ next: (page) => this.carriers.set(page.content) });
  }

  private loadRoutes(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchLogisticsRoutesUseCase.execute(organizationId, { size: 100, active: true }).subscribe({
      next: (page) => this.routes.set(page.content),
    });
  }
}
