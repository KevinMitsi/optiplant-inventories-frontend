import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SearchTransfersUseCase } from '../../../core/application/transfers/search-transfers.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { Transfer } from '../../../core/domain/models/transfer.model';
import { Branch } from '../../../core/domain/models/branch.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';

const EMPTY_PAGE: Page<Transfer> = {
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
 * Transferencias vistas desde una sucursal (RF-46, HU-35, HU-41): incluye
 * tanto lo que la sucursal solicitó como origen como lo que le están por
 * enviar como destino — `GET /branches/{branchId}/transfers` no distingue
 * el rol, solo filtra por sucursal + estado. Igual criterio de sucursal
 * obligatoria que `PurchaseOrderListPage`: ADMIN elige sucursal con
 * selector, el resto ve la suya fija.
 */
@Component({
  selector: 'app-transfer-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Transferencias entre sucursales</h1>
      @if (branchId(); as branchId) {
        <a routerLink="new" [queryParams]="branchQueryParams()" class="button button--primary">Nueva transferencia</a>
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
      <select formControlName="status">
        <option value="">Todos los estados</option>
        <option value="REQUESTED">Solicitada</option>
        <option value="APPROVED">Aprobada</option>
        <option value="IN_PREPARATION">En preparación</option>
        <option value="DISPATCHED">Despachada</option>
        <option value="RECEIVED">Recibida</option>
        <option value="PARTIALLY_RECEIVED">Recibida parcialmente</option>
        <option value="CLOSED">Cerrada</option>
        <option value="CANCELLED">Cancelada</option>
      </select>
    </form>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    @if (!branchId()) {
      <p>Seleccione una sucursal para ver sus transferencias.</p>
    } @else {
      <table class="data-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Origen</th>
            <th>Destino</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr>
              <td colspan="6">Cargando…</td>
            </tr>
          } @else if (result().content.length === 0) {
            <tr>
              <td colspan="6">No hay transferencias que coincidan con el filtro.</td>
            </tr>
          } @else {
            @for (transfer of result().content; track transfer.id) {
              <tr>
                <td data-label="Número">{{ transfer.transferNumber }}</td>
                <td data-label="Origen">{{ branchLabel(transfer.originBranchId) }}</td>
                <td data-label="Destino">{{ branchLabel(transfer.destinationBranchId) }}</td>
                <td data-label="Prioridad">{{ transfer.priority }}</td>
                <td data-label="Estado">
                  <span
                    class="badge"
                    [class.badge--warning]="transfer.status === 'REQUESTED' || transfer.status === 'IN_PREPARATION'"
                    [class.badge--info]="transfer.status === 'APPROVED' || transfer.status === 'DISPATCHED'"
                    [class.badge--active]="transfer.status === 'RECEIVED' || transfer.status === 'CLOSED'"
                    [class.badge--danger]="transfer.status === 'CANCELLED' || transfer.status === 'PARTIALLY_RECEIVED'"
                  >
                    {{ transfer.status }}
                  </span>
                </td>
                <td data-label="Acciones" class="actions">
                  <a [routerLink]="[transfer.id]">Ver</a>
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
  styleUrl: './transfer-list.page.scss',
})
export class TransferListPage {
  private readonly searchTransfersUseCase = inject(SearchTransfersUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.currentUser()?.branchId === null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Transfer>>(EMPTY_PAGE);
  protected readonly branches = signal<Branch[]>([]);

  protected readonly filters = new FormGroup({
    branchId: new FormControl('', { nonNullable: true }),
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

  protected branchLabel(branchId: string): string {
    const branch = this.branches().find((candidate) => candidate.id === branchId);
    return branch ? branch.name : branchId;
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

    if (!this.isAdmin()) {
      this.loadBranchesForLabels();
    }

    const { status } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchTransfersUseCase
      .execute(branchId, { page: this.page, size: 20, status: status || undefined })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudieron cargar las transferencias.'),
      });
  }

  private loadBranchesForLabels(): void {
    if (this.branches().length > 0) {
      return;
    }

    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchBranchesUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC' })
      .subscribe({ next: (page) => this.branches.set(page.content) });
  }
}
