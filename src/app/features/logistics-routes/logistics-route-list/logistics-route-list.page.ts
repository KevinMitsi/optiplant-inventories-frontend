import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchLogisticsRoutesUseCase } from '../../../core/application/logistics-routes/search-logistics-routes.usecase';
import { SetLogisticsRouteStatusUseCase } from '../../../core/application/logistics-routes/set-logistics-route-status.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { LogisticsRoute } from '../../../core/domain/models/logistics-route.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';

interface LogisticsRouteFilters {
  originBranchId: FormControl<string>;
  destinationBranchId: FormControl<string>;
  active: FormControl<'' | 'true' | 'false'>;
}

const EMPTY_PAGE: Page<LogisticsRoute> = {
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
 * Listado paginado de rutas logísticas, mismo patrón que `CarrierListPage`.
 * Los selectores de sucursal filtran por origen/destino (RF-45): son las
 * mismas rutas que luego se ofrecen en `assignTransferLogistics`.
 */
@Component({
  selector: 'app-logistics-route-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Rutas logísticas</h1>
      @if (isAdmin()) {
        <a routerLink="new" class="button button--primary">Nueva ruta</a>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      <select formControlName="originBranchId">
        <option value="">Cualquier origen</option>
        @for (branch of branches(); track branch.id) {
          <option [value]="branch.id">{{ branch.name }}</option>
        }
      </select>
      <select formControlName="destinationBranchId">
        <option value="">Cualquier destino</option>
        @for (branch of branches(); track branch.id) {
          <option [value]="branch.id">{{ branch.name }}</option>
        }
      </select>
      <select formControlName="active">
        <option value="">Todos</option>
        <option value="true">Activas</option>
        <option value="false">Inactivas</option>
      </select>
    </form>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    <table class="data-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Origen</th>
          <th>Destino</th>
          <th>Duración estimada</th>
          <th>Costo estimado</th>
          <th>Prioridad</th>
          <th>Estado</th>
          @if (isAdmin()) {
            <th></th>
          }
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="8">Cargando…</td>
          </tr>
        } @else if (result().content.length === 0) {
          <tr>
            <td colspan="8">No hay rutas que coincidan con el filtro.</td>
          </tr>
        } @else {
          @for (route of result().content; track route.id) {
            <tr>
              <td data-label="Nombre">{{ route.name || '—' }}</td>
              <td data-label="Origen">{{ branchName(route.originBranchId) }}</td>
              <td data-label="Destino">{{ branchName(route.destinationBranchId) }}</td>
              <td data-label="Duración estimada">{{ route.estimatedDurationMinutes }} min</td>
              <td data-label="Costo estimado">{{ route.estimatedCost }}</td>
              <td data-label="Prioridad">{{ route.priority }}</td>
              <td data-label="Estado">
                <span class="badge" [class.badge--active]="route.active">
                  {{ route.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              @if (isAdmin()) {
                <td data-label="Acciones" class="actions">
                  <a [routerLink]="[route.id, 'edit']">Editar</a>
                  <button
                    type="button"
                    (click)="toggleStatus(route)"
                    [disabled]="togglingId() === route.id"
                  >
                    {{ route.active ? 'Dar de baja' : 'Reactivar' }}
                  </button>
                </td>
              }
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
  styleUrl: './logistics-route-list.page.scss',
})
export class LogisticsRouteListPage {
  private readonly searchLogisticsRoutesUseCase = inject(SearchLogisticsRoutesUseCase);
  private readonly setLogisticsRouteStatusUseCase = inject(SetLogisticsRouteStatusUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.role() === Role.Admin);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<LogisticsRoute>>(EMPTY_PAGE);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly branches = signal<{ id: string; name: string }[]>([]);

  protected readonly filters = new FormGroup<LogisticsRouteFilters>({
    originBranchId: new FormControl('', { nonNullable: true }),
    destinationBranchId: new FormControl('', { nonNullable: true }),
    active: new FormControl('', { nonNullable: true }),
  });

  private page = 0;

  constructor() {
    this.loadBranches();
    this.search();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page = 0;
        this.search();
      });
  }

  protected branchName(branchId: string): string {
    return this.branches().find((branch) => branch.id === branchId)?.name ?? branchId;
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected toggleStatus(route: LogisticsRoute): void {
    this.togglingId.set(route.id);
    this.setLogisticsRouteStatusUseCase
      .execute(route.id, !route.active)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo cambiar el estado de la ruta.'),
      });
  }

  private loadBranches(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }
    this.searchBranchesUseCase
      .execute(organizationId, { page: 0, size: 100, sortBy: 'name', sortDirection: 'ASC' })
      .subscribe((page) => this.branches.set(page.content.map(({ id, name }) => ({ id, name }))));
  }

  private search(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { originBranchId, destinationBranchId, active } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchLogisticsRoutesUseCase
      .execute(organizationId, {
        page: this.page,
        size: 20,
        originBranchId: originBranchId || undefined,
        destinationBranchId: destinationBranchId || undefined,
        active: active === '' ? undefined : active === 'true',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el listado de rutas logísticas.'),
      });
  }
}
