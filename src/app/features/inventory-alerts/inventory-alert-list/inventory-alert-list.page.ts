import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SearchInventoryAlertsUseCase } from '../../../core/application/inventory-alerts/search-inventory-alerts.usecase';
import { DismissInventoryAlertUseCase } from '../../../core/application/inventory-alerts/dismiss-inventory-alert.usecase';
import { ResolveInventoryAlertUseCase } from '../../../core/application/inventory-alerts/resolve-inventory-alert.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { InventoryAlert } from '../../../core/domain/models/inventory-alert.model';
import { Branch } from '../../../core/domain/models/branch.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';

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
  template: `
    <div class="header">
      <h1>Alertas de inventario</h1>
    </div>

    <form class="filters" [formGroup]="filters">
      @if (isAdmin()) {
        <select formControlName="branchId">
          <option value="">Todas las sucursales</option>
          @for (branch of branches(); track branch.id) {
            <option [value]="branch.id">{{ branch.name }}</option>
          }
        </select>
      }
      <select formControlName="status">
        <option value="OPEN">Abiertas</option>
        <option value="DISMISSED">Descartadas</option>
        <option value="RESOLVED">Resueltas</option>
      </select>
    </form>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    <table class="data-table">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Mensaje</th>
          <th>Cantidad</th>
          <th>Mínimo</th>
          <th>Estado</th>
          <th>Creada</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="7">Cargando…</td>
          </tr>
        } @else if (result().content.length === 0) {
          <tr>
            <td colspan="7">No hay alertas que coincidan con el filtro.</td>
          </tr>
        } @else {
          @for (alert of result().content; track alert.id) {
            <tr>
              <td data-label="Tipo">{{ alert.alertType }}</td>
              <td data-label="Mensaje">{{ alert.message }}</td>
              <td data-label="Cantidad">{{ alert.triggeredQuantity }}</td>
              <td data-label="Mínimo">{{ alert.minimumStock }}</td>
              <td data-label="Estado">
                <span
                  class="badge"
                  [class.badge--danger]="alert.status === 'OPEN'"
                  [class.badge--active]="alert.status !== 'OPEN'"
                >
                  {{ alert.status }}
                </span>
              </td>
              <td data-label="Creada">{{ alert.createdAt }}</td>
              <td data-label="Acciones" class="actions">
                @if (alert.status === 'OPEN') {
                  <button type="button" (click)="resolve(alert.id)" [disabled]="actioningId() === alert.id">
                    Resolver
                  </button>
                  <button type="button" (click)="dismiss(alert.id)" [disabled]="actioningId() === alert.id">
                    Descartar
                  </button>
                }
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
  `,
  styleUrl: './inventory-alert-list.page.scss',
})
export class InventoryAlertListPage {
  private readonly searchInventoryAlertsUseCase = inject(SearchInventoryAlertsUseCase);
  private readonly dismissInventoryAlertUseCase = inject(DismissInventoryAlertUseCase);
  private readonly resolveInventoryAlertUseCase = inject(ResolveInventoryAlertUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.currentUser()?.branchId === null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<InventoryAlert>>(EMPTY_PAGE);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly actioningId = signal<string | null>(null);

  protected readonly filters = new FormGroup({
    branchId: new FormControl('', { nonNullable: true }),
    status: new FormControl('OPEN', { nonNullable: true }),
  });

  private page = 0;

  constructor() {
    if (this.isAdmin()) {
      this.loadBranches();
    }

    this.search();

    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.page = 0;
      this.search();
    });
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
