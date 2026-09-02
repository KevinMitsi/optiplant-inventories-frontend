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
  templateUrl: './carrier-list.page.html',
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
