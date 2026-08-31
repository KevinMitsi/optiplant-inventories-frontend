import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchCarriersUseCase } from '../../../core/application/carriers/search-carriers.usecase';
import { SetCarrierStatusUseCase } from '../../../core/application/carriers/set-carrier-status.usecase';
import { Carrier, CarrierSortField } from '../../../core/domain/models/carrier.model';
import { Page } from '../../../core/domain/models/page.model';
import { SortDirection } from '../../../core/domain/models/page-query.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

interface CarrierFilters {
  text: FormControl<string>;
  active: FormControl<'' | 'true' | 'false'>;
}

const EMPTY_PAGE: Page<Carrier> = {
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

/** Listado paginado de transportistas, mismo patrón que `BranchListPage`. */
@Component({
  selector: 'app-carrier-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Transportistas</h1>
      @if (isAdmin()) {
        <a routerLink="new" class="button button--primary">Nuevo transportista</a>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      <input type="search" formControlName="text" placeholder="Buscar por código o nombre…" />
      <select formControlName="active">
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Inactivos</option>
      </select>
    </form>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    <table class="data-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Teléfono</th>
          <th>Correo</th>
          <th>Estado</th>
          @if (isAdmin()) {
            <th></th>
          }
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="6">Cargando…</td>
          </tr>
        } @else if (result().content.length === 0) {
          <tr>
            <td colspan="6">No hay transportistas que coincidan con el filtro.</td>
          </tr>
        } @else {
          @for (carrier of result().content; track carrier.id) {
            <tr>
              <td data-label="Código">{{ carrier.code }}</td>
              <td data-label="Nombre">{{ carrier.name }}</td>
              <td data-label="Teléfono">{{ carrier.phone }}</td>
              <td data-label="Correo">{{ carrier.email }}</td>
              <td data-label="Estado">
                <span class="badge" [class.badge--active]="carrier.active">
                  {{ carrier.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              @if (isAdmin()) {
                <td data-label="Acciones" class="actions">
                  <a [routerLink]="[carrier.id, 'edit']">Editar</a>
                  <button
                    type="button"
                    (click)="toggleStatus(carrier)"
                    [disabled]="togglingId() === carrier.id"
                  >
                    {{ carrier.active ? 'Dar de baja' : 'Reactivar' }}
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

    <app-confirm-dialog
      [open]="!!carrierToDeactivate()"
      title="Dar de baja transportista"
      [message]="
        '¿Seguro que deseas dar de baja a ' + (carrierToDeactivate()?.name ?? '') + '? Podrás reactivarlo luego.'
      "
      confirmLabel="Dar de baja"
      (confirm)="confirmDeactivate()"
      (cancel)="carrierToDeactivate.set(null)"
    />
  `,
  styleUrl: './carrier-list.page.scss',
})
export class CarrierListPage {
  private readonly searchCarriersUseCase = inject(SearchCarriersUseCase);
  private readonly setCarrierStatusUseCase = inject(SetCarrierStatusUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.role() === Role.Admin);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Carrier>>(EMPTY_PAGE);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly carrierToDeactivate = signal<Carrier | null>(null);

  protected readonly filters = new FormGroup<CarrierFilters>({
    text: new FormControl('', { nonNullable: true }),
    active: new FormControl('', { nonNullable: true }),
  });

  private page = 0;
  private readonly sortBy: CarrierSortField = 'name';
  private readonly sortDirection: SortDirection = 'ASC';

  constructor() {
    this.search();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page = 0;
        this.search();
      });
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected toggleStatus(carrier: Carrier): void {
    if (carrier.active) {
      // Dar de baja es la operación sensible: pide confirmación antes de ejecutarla.
      this.carrierToDeactivate.set(carrier);
      return;
    }
    this.applyStatusChange(carrier, true);
  }

  protected confirmDeactivate(): void {
    const carrier = this.carrierToDeactivate();
    if (!carrier) {
      return;
    }
    this.carrierToDeactivate.set(null);
    this.applyStatusChange(carrier, false);
  }

  private applyStatusChange(carrier: Carrier, active: boolean): void {
    this.togglingId.set(carrier.id);
    this.setCarrierStatusUseCase
      .execute(carrier.id, active)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo cambiar el estado del transportista.'),
      });
  }

  private search(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { text, active } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchCarriersUseCase
      .execute(organizationId, {
        page: this.page,
        size: 20,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        text: text || undefined,
        active: active === '' ? undefined : active === 'true',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el listado de transportistas.'),
      });
  }
}
