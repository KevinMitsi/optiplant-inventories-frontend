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
  templateUrl: './dashboard.page.html',
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
