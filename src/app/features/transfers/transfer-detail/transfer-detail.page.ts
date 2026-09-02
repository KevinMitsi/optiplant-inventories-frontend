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
  template: `
    <h1>Transferencia</h1>

    @if (loading()) {
      <p>Cargando…</p>
    } @else if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    } @else if (transfer(); as transfer) {
      <p class="hint">
        {{ transfer.transferNumber }} · {{ branchLabel(transfer.originBranchId) }} →
        {{ branchLabel(transfer.destinationBranchId) }} ·
        <span
          class="badge"
          [class.badge--warning]="transfer.status === 'REQUESTED' || transfer.status === 'IN_PREPARATION'"
          [class.badge--info]="transfer.status === 'APPROVED' || transfer.status === 'IN_TRANSIT'"
          [class.badge--active]="transfer.status === 'RECEIVED' || transfer.status === 'CLOSED'"
          [class.badge--danger]="transfer.status === 'CANCELLED' || transfer.status === 'PARTIALLY_RECEIVED'"
        >
          {{ statusLabel(transfer.status) }}
        </span>
        · Prioridad: {{ priorityLabel(transfer.priority) }}
      </p>
      @if (transfer.notes) {
        <p class="hint">{{ transfer.notes }}</p>
      }
      @if (transfer.carrierId || transfer.routeId) {
        <p class="hint">
          Logística: {{ carrierLabel(transfer.carrierId) }} · {{ routeLabel(transfer.routeId) }}
          @if (transfer.estimatedArrivalAt) {
            · Llegada estimada: {{ formatDateTime(transfer.estimatedArrivalAt) }}
          }
        </p>
      }

      <table class="data-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Unidad</th>
            <th>Solicitado</th>
            <th>Aprobado</th>
            <th>Despachado</th>
            <th>Recibido</th>
            @if (lineActionMode()) {
              <th>Cantidad</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (item of transfer.items; track item.id; let itemIndex = $index) {
            <tr>
              <td data-label="Producto">{{ productLabel(item.productId) }}</td>
              <td data-label="Unidad">{{ unitLabel(item.productId) }}</td>
              <td data-label="Solicitado">{{ item.requestedQuantity }}</td>
              <td data-label="Aprobado">{{ item.approvedQuantity }}</td>
              <td data-label="Despachado">{{ item.shippedQuantity }}</td>
              <td data-label="Recibido">{{ item.receivedQuantity }}</td>
              @if (lineActionMode()) {
                <td data-label="Cantidad">
                  <input type="number" [formControl]="lineControls()[itemIndex]" step="any" min="0" />
                </td>
              }
            </tr>
          }
        </tbody>
      </table>

      @if (lineActionMode(); as mode) {
        <div class="actions">
          <button type="button" class="button button--primary" (click)="submitLineAction(transfer)" [disabled]="acting()">
            {{ acting() ? 'Guardando…' : lineActionLabel(mode) }}
          </button>
          <button type="button" class="button button--ghost" (click)="cancelLineAction()">Cancelar</button>
        </div>
      }

      @if (canAssignLogistics(transfer)) {
        @if (assigningLogistics()) {
          <form class="entity-form" [formGroup]="logisticsForm" (ngSubmit)="submitLogistics(transfer.id)" novalidate>
            <h2>Asignar logística</h2>
            <label for="carrierId">Transportista</label>
            <select id="carrierId" formControlName="carrierId">
              <option value="" disabled>Seleccione un transportista…</option>
              @for (carrier of carriers(); track carrier.id) {
                <option [value]="carrier.id">{{ carrier.code }} — {{ carrier.name }}</option>
              }
            </select>

            <label for="routeId">Ruta</label>
            <select id="routeId" formControlName="routeId">
              <option value="" disabled>Seleccione una ruta…</option>
              @for (route of matchingRoutes(); track route.id) {
                <option [value]="route.id">{{ route.name || route.id }} ({{ route.estimatedDurationMinutes }} min)</option>
              }
            </select>
            @if (matchingRoutes().length === 0) {
              <p class="hint">No hay rutas logísticas activas entre estas dos sucursales.</p>
            }

            <label for="estimatedArrivalAt">Llegada estimada (opcional)</label>
            <input id="estimatedArrivalAt" type="datetime-local" formControlName="estimatedArrivalAt" />

            <div class="actions">
              <button type="button" class="button button--ghost" (click)="assigningLogistics.set(false)">Cancelar</button>
              <button type="submit" class="button button--primary" [disabled]="logisticsForm.invalid || acting()">
                {{ acting() ? 'Asignando…' : 'Asignar' }}
              </button>
            </div>
          </form>
        } @else {
          <div class="actions">
            <button type="button" class="button button--primary" (click)="startAssignLogistics()">Asignar logística</button>
          </div>
        }
      }

      @if (issues().length > 0) {
        <h2>Incidencias</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Línea</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Descripción</th>
              <th>Resolución</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (issue of issues(); track issue.id) {
              <tr>
                <td data-label="Línea">{{ itemLabel(transfer, issue.transferItemId) }}</td>
                <td data-label="Tipo">{{ issueTypeLabel(issue.issueType) }}</td>
                <td data-label="Cantidad">{{ issue.quantity }}</td>
                <td data-label="Descripción">{{ issueDescription(transfer, issue) }}</td>
                <td data-label="Resolución">{{ issue.resolutionType ? issueResolutionLabel(issue.resolutionType) : '—' }}</td>
                <td data-label="Acciones" class="actions">
                  @if (!issue.resolvedAt) {
                    @if (resolvingIssueId() === issue.id) {
                      <select [formControl]="resolutionTypeControl">
                        <option value="RESHIPMENT">Reenvío</option>
                        <option value="ADJUSTMENT">Ajuste</option>
                        <option value="CLAIM">Reclamación</option>
                      </select>
                      <button type="button" (click)="saveIssueResolution(transfer.id, issue.id)" [disabled]="acting()">
                        Confirmar
                      </button>
                      <button type="button" (click)="resolvingIssueId.set(null)">Cancelar</button>
                    } @else {
                      <button type="button" (click)="resolvingIssueId.set(issue.id)">Resolver</button>
                    }
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      @if (actionError(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }

      <div class="actions">
        <a routerLink="/transfers" class="button button--ghost">Volver</a>
        @if (canApprove(transfer) && !lineActionMode()) {
          <button type="button" class="button button--primary" (click)="startLineAction('approve', transfer.items)" [disabled]="acting()">
            Aprobar
          </button>
        }
        @if (canStartPreparation(transfer)) {
          <button type="button" class="button button--primary" (click)="startPreparation(transfer.id)" [disabled]="acting()">
            {{ acting() ? 'Iniciando…' : 'Iniciar preparación' }}
          </button>
        }
        @if (canDispatch(transfer) && !lineActionMode()) {
          <button type="button" class="button button--primary" (click)="startLineAction('dispatch', transfer.items)" [disabled]="acting()">
            Despachar
          </button>
        }
        @if (canReceive(transfer) && !lineActionMode()) {
          <button type="button" class="button button--primary" (click)="startLineAction('receive', transfer.items)" [disabled]="acting()">
            Recibir
          </button>
        }
        @if (canCancel(transfer)) {
          <button type="button" class="button button--ghost" (click)="cancel(transfer.id)" [disabled]="acting()">
            {{ acting() ? 'Cancelando…' : 'Cancelar transferencia' }}
          </button>
        }
      </div>
    }
  `,
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
