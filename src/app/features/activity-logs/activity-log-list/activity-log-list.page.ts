import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchActivityLogsUseCase } from '../../../core/application/activity-logs/search-activity-logs.usecase';
import { ActivityLog, ActivityLogLevel, ActivityLogRole } from '../../../core/domain/models/activity-log.model';
import { Page } from '../../../core/domain/models/page.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';
import { formatDateTime } from '../../../shared/utils/formatters';

const ROLE_LABELS: Record<ActivityLogRole, string> = {
  ADMIN: 'Administrador',
  BRANCH_MANAGER: 'Gerente de sucursal',
  INVENTORY_OPERATOR: 'Operador de inventario',
  SYSTEM: 'Sistema',
};

const LEVEL_LABELS: Record<ActivityLogLevel, string> = {
  INFO: 'Info',
  WARNING: 'Advertencia',
  SEVERE: 'Grave',
};

interface ActivityLogFilters {
  username: FormControl<string>;
  role: FormControl<'' | ActivityLogRole>;
  useCase: FormControl<string>;
  level: FormControl<'' | ActivityLogLevel>;
  text: FormControl<string>;
  from: FormControl<string>;
  to: FormControl<string>;
  includeSystem: FormControl<boolean>;
}

const EMPTY_PAGE: Page<ActivityLog> = {
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
 * Traza de auditoría centralizada, solo ADMIN (ver `activity-logs.routes.ts`).
 * Solo lectura: el backend la escribe solo, no hay alta/edición que ofrecer
 * aquí. `includeSystem` arranca apagado — mezcla sucesos de arranque del
 * propio backend que no interesan en el uso diario, se deja visible solo
 * para depuración.
 */
@Component({
  selector: 'app-activity-log-list-page',
  imports: [ReactiveFormsModule, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-log-list.page.html',
  styleUrl: './activity-log-list.page.scss',
})
export class ActivityLogListPage {
  private readonly searchActivityLogsUseCase = inject(SearchActivityLogsUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<ActivityLog>>(EMPTY_PAGE);
  protected readonly formatDateTime = formatDateTime;

  protected readonly filters = new FormGroup<ActivityLogFilters>({
    username: new FormControl('', { nonNullable: true }),
    role: new FormControl('', { nonNullable: true }),
    useCase: new FormControl('', { nonNullable: true }),
    level: new FormControl('', { nonNullable: true }),
    text: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    includeSystem: new FormControl(false, { nonNullable: true }),
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

  protected roleLabel(role: ActivityLogRole): string {
    return ROLE_LABELS[role] ?? role;
  }

  protected levelLabel(level: ActivityLogLevel): string {
    return LEVEL_LABELS[level] ?? level;
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  private search(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { username, role, useCase, level, text, from, to, includeSystem } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchActivityLogsUseCase
      .execute(organizationId, {
        page: this.page,
        size: 20,
        username: username || undefined,
        role: role || undefined,
        useCase: useCase || undefined,
        level: level || undefined,
        text: text || undefined,
        // `from`/`to` de la API son `date-time`; el `<input type="date">` solo
        // da fecha, así que se acota al inicio/fin de ese día en UTC (mismo
        // criterio que `SaleListPage`).
        from: from ? `${from}T00:00:00Z` : undefined,
        to: to ? `${to}T23:59:59Z` : undefined,
        includeSystem: includeSystem || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar la traza de auditoría.'),
      });
  }
}
