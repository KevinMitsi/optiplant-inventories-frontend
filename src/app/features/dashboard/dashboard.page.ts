import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ChartComponent,
} from 'ng-apexcharts';
import { GetSalesSummaryUseCase } from '../../core/application/dashboard/get-sales-summary.usecase';
import { GetProductRotationUseCase } from '../../core/application/dashboard/get-product-rotation.usecase';
import { GetBranchComparisonUseCase } from '../../core/application/dashboard/get-branch-comparison.usecase';
import { SearchBranchesUseCase } from '../../core/application/branches/search-branches.usecase';
import { BranchComparison, ProductRotation, SalesSummary } from '../../core/domain/models/dashboard.model';
import { Branch } from '../../core/domain/models/branch.model';
import { AuthStore } from '../../core/state/auth-store.service';

// Colores de marca usados por las gráficas: `ng-apexcharts` necesita hex en
// TS (no puede leer `$colors` de `_tokens.scss`). Mantener sincronizados con
// las claves `primary`/`info`/`purple` del token map — ver `.claude/CLAUDE.md`
// § Paleta de colores.
const CHART_COLOR_PRIMARY = '#ff6000';
const CHART_COLOR_INFO = '#0284c7';
const CHART_COLOR_PURPLE = '#8b5cf6';

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
  imports: [ReactiveFormsModule, ChartComponent],
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

    <section class="charts-grid">
      <div class="panel chart-panel">
        <h2>Tendencia de ventas</h2>
        @if (loading()) {
          <p class="chart-empty">Cargando…</p>
        } @else if (salesTrend().categories.length === 0) {
          <p class="chart-empty">Sin ventas confirmadas en el período.</p>
        } @else {
          <apx-chart
            [series]="salesTrend().series"
            [chart]="areaChart"
            [xaxis]="salesTrendXaxis()"
            [stroke]="areaStroke"
            [fill]="areaFill"
            [colors]="[primaryColor]"
            [dataLabels]="hiddenDataLabels"
            [legend]="hiddenLegend"
            [grid]="chartGrid"
            [tooltip]="currencyTooltip"
          />
        }
      </div>

      <div class="panel chart-panel">
        <h2>Productos más vendidos</h2>
        @if (loading()) {
          <p class="chart-empty">Cargando…</p>
        } @else if (topProductsChart().categories.length === 0) {
          <p class="chart-empty">Sin productos en el período.</p>
        } @else {
          <apx-chart
            [series]="topProductsChart().series"
            [chart]="horizontalBarChart"
            [xaxis]="topProductsXaxis()"
            [plotOptions]="horizontalBarPlotOptions"
            [colors]="[purpleColor]"
            [dataLabels]="hiddenDataLabels"
            [legend]="hiddenLegend"
            [grid]="chartGrid"
            [tooltip]="unitsTooltip"
          />
        }
      </div>

      @if (isAdmin()) {
        <div class="panel chart-panel chart-panel--wide">
          <h2>Comparación de sucursales (últimos 30 días)</h2>
          @if (loading()) {
            <p class="chart-empty">Cargando…</p>
          } @else if (branchComparisonChart().categories.length === 0) {
            <p class="chart-empty">Sin datos de sucursales.</p>
          } @else {
            <apx-chart
              [series]="branchComparisonChart().series"
              [chart]="columnChart"
              [xaxis]="branchComparisonXaxis()"
              [plotOptions]="columnPlotOptions"
              [colors]="[infoColor]"
              [dataLabels]="hiddenDataLabels"
              [legend]="hiddenLegend"
              [grid]="chartGrid"
              [tooltip]="currencyTooltip"
            />
          }
        </div>
      }
    </section>

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

  // --- Datos de gráficas ---
  // Cada gráfica expone `{ categories, series }` en un único `computed()`
  // para que `apx-chart` solo reciba una nueva referencia (y se re-renderice)
  // cuando los datos realmente cambian.

  protected readonly salesTrend = computed(() => {
    const totals = new Map<string, number>();
    for (const row of this.salesSummary()) {
      const key = `${row.year}-${row.month.toString().padStart(2, '0')}`;
      totals.set(key, (totals.get(key) ?? 0) + row.totalAmount);
    }
    const categories = [...totals.keys()].sort();
    return {
      categories,
      series: [{ name: 'Ventas', data: categories.map((key) => totals.get(key) ?? 0) }] as ApexAxisChartSeries,
    };
  });

  protected readonly salesTrendXaxis = computed<ApexXAxis>(() => ({ categories: this.salesTrend().categories }));

  protected readonly topProductsChart = computed(() => {
    // Top 8, invertido para que la barra horizontal dibuje el más vendido arriba.
    const rows = [...this.productRotation()]
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 8)
      .reverse();
    return {
      categories: rows.map((row) => row.productName),
      series: [{ name: 'Unidades vendidas', data: rows.map((row) => row.quantitySold) }] as ApexAxisChartSeries,
    };
  });

  protected readonly topProductsXaxis = computed<ApexXAxis>(() => ({
    categories: this.topProductsChart().categories,
  }));

  protected readonly branchComparisonChart = computed(() => {
    const rows = this.branchComparison();
    return {
      categories: rows.map((row) => row.branchName),
      series: [{ name: 'Ventas (30 días)', data: rows.map((row) => row.totalSalesAmount30d) }] as ApexAxisChartSeries,
    };
  });

  protected readonly branchComparisonXaxis = computed<ApexXAxis>(() => ({
    categories: this.branchComparisonChart().categories,
  }));

  // --- Configuración estática de ApexCharts ---
  // Colores: ver constantes `CHART_COLOR_*` arriba (sincronizadas con
  // `_tokens.scss`). Una sola serie por gráfica -> sin leyenda (el título ya
  // identifica la serie) y con `dataLabels` ocultos (ya hay tooltip + tabla
  // debajo con el valor exacto).
  protected readonly primaryColor = CHART_COLOR_PRIMARY;
  protected readonly infoColor = CHART_COLOR_INFO;
  protected readonly purpleColor = CHART_COLOR_PURPLE;

  protected readonly areaChart: ApexChart = { type: 'area', height: 280, toolbar: { show: false }, fontFamily: 'inherit' };
  protected readonly horizontalBarChart: ApexChart = { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' };
  protected readonly columnChart: ApexChart = { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' };

  protected readonly areaStroke: ApexStroke = { curve: 'smooth', width: 3 };
  protected readonly areaFill: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 },
  };

  protected readonly horizontalBarPlotOptions: ApexPlotOptions = {
    bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: 'end', columnWidth: '55%' },
  };
  protected readonly columnPlotOptions: ApexPlotOptions = {
    bar: { horizontal: false, borderRadius: 4, borderRadiusApplication: 'end', columnWidth: '45%' },
  };

  protected readonly hiddenLegend: ApexLegend = { show: false };
  protected readonly hiddenDataLabels: ApexDataLabels = { enabled: false };
  protected readonly chartGrid: ApexGrid = { borderColor: '#e2e8f0', strokeDashArray: 4 };

  private readonly currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  protected readonly currencyTooltip: ApexTooltip = {
    y: { formatter: (value: number) => this.currencyFormatter.format(value) },
  };
  protected readonly unitsTooltip: ApexTooltip = {
    y: { formatter: (value: number) => `${value} unidades` },
  };

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
