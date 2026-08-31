import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { GetSalesSummaryUseCase } from '../../core/application/dashboard/get-sales-summary.usecase';
import { GetProductRotationUseCase } from '../../core/application/dashboard/get-product-rotation.usecase';
import { GetBranchComparisonUseCase } from '../../core/application/dashboard/get-branch-comparison.usecase';
import { SearchBranchesUseCase } from '../../core/application/branches/search-branches.usecase';
import { BranchComparison, ProductRotation, SalesSummary } from '../../core/domain/models/dashboard.model';
import { Branch } from '../../core/domain/models/branch.model';
import { AuthStore } from '../../core/state/auth-store.service';

/**
 * Panel con KPIs reales (RF-42/43/44/47, HU-38/39/42), sustituye el
 * placeholder de la Fase 1. Sin período explícito el backend usa los últimos
 * 6 meses para ventas y rotación (`getSalesSummary`, `getProductRotation`);
 * comparación de sucursales siempre son los últimos 30 días y está reservada
 * al administrador general (RN-12), así que esa sección solo se pide/pinta
 * para ADMIN, igual que el criterio ya usado en `InventoryAlertListPage`.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Panel</h1>

    @if (isAdmin()) {
      <form class="filters" [formGroup]="filters">
        <select formControlName="branchId">
          <option value="">Todas las sucursales</option>
          @for (branch of branches(); track branch.id) {
            <option [value]="branch.id">{{ branch.name }}</option>
          }
        </select>
      </form>
    }

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    <section class="panel">
      <h2>Ventas por mes</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Sucursal</th>
            <th>Mes</th>
            <th>Ventas</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr>
              <td colspan="4">Cargando…</td>
            </tr>
          } @else if (salesSummary().length === 0) {
            <tr>
              <td colspan="4">Sin ventas confirmadas en el período.</td>
            </tr>
          } @else {
            @for (row of salesSummary(); track row.branchId + '-' + row.year + '-' + row.month) {
              <tr>
                <td data-label="Sucursal">{{ row.branchName }}</td>
                <td data-label="Mes">{{ row.year }}-{{ row.month.toString().padStart(2, '0') }}</td>
                <td data-label="Ventas">{{ row.saleCount }}</td>
                <td data-label="Monto">{{ row.totalAmount }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Rotación de productos</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad vendida</th>
            <th>Ventas</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr>
              <td colspan="3">Cargando…</td>
            </tr>
          } @else if (productRotation().length === 0) {
            <tr>
              <td colspan="3">Sin productos en el período.</td>
            </tr>
          } @else {
            @for (row of productRotation(); track row.productId) {
              <tr>
                <td data-label="Producto">{{ row.productName }}</td>
                <td data-label="Cantidad vendida">{{ row.quantitySold }}</td>
                <td data-label="Ventas">{{ row.saleCount }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </section>

    @if (isAdmin()) {
      <section class="panel">
        <h2>Comparación de sucursales (últimos 30 días)</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Sucursal</th>
              <th>Ventas</th>
              <th>Monto</th>
              <th>Valor de inventario</th>
              <th>Stock crítico</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="5">Cargando…</td>
              </tr>
            } @else if (branchComparison().length === 0) {
              <tr>
                <td colspan="5">Sin datos de sucursales.</td>
              </tr>
            } @else {
              @for (row of branchComparison(); track row.branchId) {
                <tr>
                  <td data-label="Sucursal">{{ row.branchName }}</td>
                  <td data-label="Ventas">{{ row.saleCount30d }}</td>
                  <td data-label="Monto">{{ row.totalSalesAmount30d }}</td>
                  <td data-label="Valor de inventario">{{ row.inventoryValue }}</td>
                  <td data-label="Stock crítico">
                    <span class="badge" [class.badge--danger]="row.lowStockCount > 0" [class.badge--active]="row.lowStockCount === 0">
                      {{ row.lowStockCount }}
                    </span>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </section>
    }
  `,
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly getSalesSummaryUseCase = inject(GetSalesSummaryUseCase);
  private readonly getProductRotationUseCase = inject(GetProductRotationUseCase);
  private readonly getBranchComparisonUseCase = inject(GetBranchComparisonUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly isAdmin = computed(() => this.authStore.currentUser()?.branchId === null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly salesSummary = signal<SalesSummary[]>([]);
  protected readonly productRotation = signal<ProductRotation[]>([]);
  protected readonly branchComparison = signal<BranchComparison[]>([]);
  protected readonly branches = signal<Branch[]>([]);

  protected readonly filters = new FormGroup({
    branchId: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    if (this.isAdmin()) {
      this.loadBranches();
    }

    this.load();

    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.load());
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

  private load(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const branchId = this.filters.getRawValue().branchId || undefined;
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      salesSummary: this.getSalesSummaryUseCase.execute(organizationId, { branchId }),
      productRotation: this.getProductRotationUseCase.execute(organizationId, { branchId }),
      branchComparison: this.isAdmin()
        ? this.getBranchComparisonUseCase.execute(organizationId)
        : of<BranchComparison[]>([]),
    }).subscribe({
      next: (result) => {
        this.salesSummary.set(result.salesSummary);
        this.productRotation.set(result.productRotation);
        this.branchComparison.set(result.branchComparison);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el panel.');
        this.loading.set(false);
      },
    });
  }
}
