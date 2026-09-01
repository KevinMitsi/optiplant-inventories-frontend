import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchInventoryUseCase } from '../../../core/application/inventory/search-inventory.usecase';
import { SetMinimumStockUseCase } from '../../../core/application/inventory/set-minimum-stock.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { Inventory } from '../../../core/domain/models/inventory.model';
import { Branch } from '../../../core/domain/models/branch.model';
import { Product } from '../../../core/domain/models/product.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';

const EMPTY_PAGE: Page<Inventory> = {
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
 * Saldos de inventario de una sucursal (HU-11). Para ADMIN (sin `branchId`
 * propio, RN-12) se ofrece un selector de sucursal; para BRANCH_MANAGER/
 * INVENTORY_OPERATOR la sucursal es la suya, fija, sin selector — el mismo
 * criterio de alcance que usa el backend (403 si la sucursal no es la del
 * usuario).
 */
@Component({
  selector: 'app-inventory-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h1>Inventario</h1>
      @if (branchId(); as branchId) {
        <div class="actions">
          <a [routerLink]="['entries']" [queryParams]="branchQueryParams()" class="button button--ghost">
            Registrar entrada
          </a>
          <a [routerLink]="['exits']" [queryParams]="branchQueryParams()" class="button button--ghost">
            Registrar salida
          </a>
        </div>
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
      <label class="checkbox">
        <input type="checkbox" formControlName="lowStockOnly" />
        Solo stock en o por debajo del mínimo
      </label>
    </form>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    @if (!branchId()) {
      <p>Seleccione una sucursal para ver su inventario.</p>
    } @else {
      <table class="data-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Stock mínimo</th>
            <th>Costo promedio</th>
            <th>Estado</th>
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
              <td colspan="7">No hay saldos que coincidan con el filtro.</td>
            </tr>
          } @else {
            @for (item of result().content; track item.id) {
              <tr>
                <td data-label="SKU">{{ productLabel(item.productId).sku }}</td>
                <td data-label="Producto">{{ productLabel(item.productId).name }}</td>
                <td data-label="Cantidad">{{ item.quantity }}</td>
                <td data-label="Stock mínimo">
                  @if (editingMinimumId() === item.id) {
                    <input type="number" [formControl]="minimumStockControl" step="any" min="0" />
                  } @else {
                    {{ item.minimumStock }}
                  }
                </td>
                <td data-label="Costo promedio">{{ item.averageCost }}</td>
                <td data-label="Estado">
                  <span
                    class="badge"
                    [class.badge--danger]="item.outOfStock"
                    [class.badge--warning]="item.lowStock && !item.outOfStock"
                    [class.badge--active]="!item.lowStock && !item.outOfStock"
                  >
                    {{ item.outOfStock ? 'Sin stock' : item.lowStock ? 'Stock bajo' : 'Óptimo' }}
                  </span>
                </td>
                <td data-label="Acciones" class="actions">
                  @if (editingMinimumId() === item.id) {
                    <button type="button" (click)="saveMinimumStock(item)" [disabled]="savingMinimum()">
                      Guardar
                    </button>
                    <button type="button" (click)="cancelMinimumEdit()">Cancelar</button>
                  } @else {
                    <button type="button" (click)="startMinimumEdit(item)">Editar mínimo</button>
                    <a [routerLink]="[item.productId, 'movements']" [queryParams]="branchQueryParams()">
                      Movimientos
                    </a>
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
    }
  `,
  styleUrl: './inventory-list.page.scss',
})
export class InventoryListPage {
  private readonly searchInventoryUseCase = inject(SearchInventoryUseCase);
  private readonly setMinimumStockUseCase = inject(SetMinimumStockUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly isAdmin = computed(() => this.authStore.currentUser()?.branchId === null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Inventory>>(EMPTY_PAGE);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly products = signal<Map<string, Product>>(new Map());

  protected readonly editingMinimumId = signal<string | null>(null);
  protected readonly savingMinimum = signal(false);
  protected readonly minimumStockControl = new FormControl<number | null>(null);

  protected readonly filters = new FormGroup({
    branchId: new FormControl('', { nonNullable: true }),
    lowStockOnly: new FormControl(false, { nonNullable: true }),
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
    this.loadProducts();

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

  protected productLabel(productId: string): { sku: string; name: string } {
    const product = this.products().get(productId);
    return product ? { sku: product.sku, name: product.name } : { sku: '—', name: productId };
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected startMinimumEdit(item: Inventory): void {
    this.editingMinimumId.set(item.id);
    this.minimumStockControl.setValue(item.minimumStock);
  }

  protected cancelMinimumEdit(): void {
    this.editingMinimumId.set(null);
  }

  protected saveMinimumStock(item: Inventory): void {
    const branchId = this.branchId();
    const minimumStock = this.minimumStockControl.value;
    if (!branchId || minimumStock === null || minimumStock < 0) {
      return;
    }

    this.savingMinimum.set(true);
    this.setMinimumStockUseCase
      .execute(branchId, item.productId, { minimumStock })
      .pipe(finalize(() => this.savingMinimum.set(false)))
      .subscribe({
        next: () => {
          this.editingMinimumId.set(null);
          this.search();
        },
        error: () => this.errorMessage.set('No se pudo actualizar el stock mínimo.'),
      });
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
          // Al volver de "Registrar entrada/salida" el router trae de vuelta
          // `?branchId=…`: si se ignora, siempre se reselecciona la primera
          // sucursal alfabética y el saldo recién movido parece no cambiar
          // (en realidad se movió, pero en otra sucursal que la mostrada).
          const requestedBranchId = this.route.snapshot.queryParamMap.get('branchId');
          const preselected = page.content.find((branch) => branch.id === requestedBranchId);
          const targetBranch = preselected ?? page.content[0];
          if (targetBranch) {
            this.filters.controls.branchId.setValue(targetBranch.id);
          } else {
            this.loading.set(false);
          }
        },
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

  private search(): void {
    const branchId = this.branchId();
    if (!branchId) {
      return;
    }

    const { lowStockOnly } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchInventoryUseCase
      .execute(branchId, { page: this.page, size: 20, lowStockOnly: lowStockOnly || undefined })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el inventario.'),
      });
  }
}
