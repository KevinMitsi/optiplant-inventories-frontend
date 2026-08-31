import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchPriceListsUseCase } from '../../../core/application/price-lists/search-price-lists.usecase';
import { SetPriceListStatusUseCase } from '../../../core/application/price-lists/set-price-list-status.usecase';
import { PriceList } from '../../../core/domain/models/price-list.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';

interface PriceListFilters {
  active: FormControl<'' | 'true' | 'false'>;
}

const EMPTY_PAGE: Page<PriceList> = {
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
 * Listado paginado de listas de precios de la organización. Mismo patrón
 * que `CategoryListPage`; a diferencia de los demás catálogos, la API no
 * admite búsqueda por texto ni orden para este recurso (solo `active`).
 */
@Component({
  selector: 'app-price-list-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Listas de precios</h1>
      @if (isAdmin()) {
        <a routerLink="new" class="button button--primary">Nueva lista de precios</a>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      <select formControlName="active">
        <option value="">Todas</option>
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
          <th>Código</th>
          <th>Nombre</th>
          <th>Vigencia</th>
          <th>Estado</th>
          @if (isAdmin()) {
            <th></th>
          }
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="5">Cargando…</td>
          </tr>
        } @else if (result().content.length === 0) {
          <tr>
            <td colspan="5">No hay listas de precios que coincidan con el filtro.</td>
          </tr>
        } @else {
          @for (priceList of result().content; track priceList.id) {
            <tr>
              <td data-label="Código">{{ priceList.code }}</td>
              <td data-label="Nombre">{{ priceList.name }}</td>
              <td data-label="Vigencia">{{ validityLabel(priceList) }}</td>
              <td data-label="Estado">
                <span class="badge" [class.badge--active]="priceList.active">
                  {{ priceList.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              @if (isAdmin()) {
                <td data-label="Acciones" class="actions">
                  <a [routerLink]="[priceList.id, 'edit']">Editar</a>
                  <button
                    type="button"
                    (click)="toggleStatus(priceList)"
                    [disabled]="togglingId() === priceList.id"
                  >
                    {{ priceList.active ? 'Dar de baja' : 'Reactivar' }}
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
  styleUrl: './price-list-list.page.scss',
})
export class PriceListListPage {
  private readonly searchPriceListsUseCase = inject(SearchPriceListsUseCase);
  private readonly setPriceListStatusUseCase = inject(SetPriceListStatusUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.role() === Role.Admin);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<PriceList>>(EMPTY_PAGE);
  protected readonly togglingId = signal<string | null>(null);

  protected readonly filters = new FormGroup<PriceListFilters>({
    active: new FormControl('', { nonNullable: true }),
  });

  private page = 0;

  constructor() {
    this.search();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page = 0;
        this.search();
      });
  }

  protected validityLabel(priceList: PriceList): string {
    if (!priceList.validFrom && !priceList.validUntil) {
      return 'Sin límite';
    }
    return `${priceList.validFrom ?? '…'} – ${priceList.validUntil ?? '…'}`;
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected toggleStatus(priceList: PriceList): void {
    this.togglingId.set(priceList.id);
    this.setPriceListStatusUseCase
      .execute(priceList.id, !priceList.active)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo cambiar el estado de la lista de precios.'),
      });
  }

  private search(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { active } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchPriceListsUseCase
      .execute(organizationId, {
        page: this.page,
        size: 20,
        active: active === '' ? undefined : active === 'true',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el listado de listas de precios.'),
      });
  }
}
