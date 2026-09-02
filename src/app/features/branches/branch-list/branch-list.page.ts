import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { SetBranchStatusUseCase } from '../../../core/application/branches/set-branch-status.usecase';
import { Branch, BranchSortField } from '../../../core/domain/models/branch.model';
import { Page } from '../../../core/domain/models/page.model';
import { SortDirection } from '../../../core/domain/models/page-query.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ColombiaLocationDirectoryService } from '../../../shared/data/colombia-location-directory.service';

interface BranchFilters {
  text: FormControl<string>;
  city: FormControl<string>;
  active: FormControl<'' | 'true' | 'false'>;
}

const EMPTY_PAGE: Page<Branch> = {
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
 * Listado paginado de sucursales de la organización del usuario (HU-05/06).
 * Visible para cualquier rol autenticado; crear/editar/dar de baja queda
 * reservado a ADMIN (ver `branches.routes.ts` y los botones condicionados
 * más abajo).
 */
@Component({
  selector: 'app-branch-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branch-list.page.html',
  styleUrl: './branch-list.page.scss',
})
export class BranchListPage {
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly setBranchStatusUseCase = inject(SetBranchStatusUseCase);
  private readonly authStore = inject(AuthStore);
  protected readonly locationDirectory = inject(ColombiaLocationDirectoryService);

  protected readonly isAdmin = computed(() => this.authStore.role() === Role.Admin);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Branch>>(EMPTY_PAGE);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly branchToDeactivate = signal<Branch | null>(null);

  protected readonly filters = new FormGroup<BranchFilters>({
    text: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    active: new FormControl('', { nonNullable: true }),
  });

  /** Departamento es solo filtro de UI para acotar el select de ciudad — mismo patrón que branch-form. */
  protected readonly departmentControl = new FormControl('', { nonNullable: true });
  private readonly selectedDepartmentCode = signal('');
  protected readonly departments = this.locationDirectory.departments;
  protected readonly cities = computed(() =>
    this.locationDirectory.municipalitiesForDepartment(this.selectedDepartmentCode()),
  );

  private page = 0;
  private readonly sortBy: BranchSortField = 'code';
  private readonly sortDirection: SortDirection = 'ASC';

  constructor() {
    this.locationDirectory.ensureLoaded();
    this.search();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page = 0;
        this.search();
      });
  }

  protected onDepartmentChange(): void {
    this.selectedDepartmentCode.set(this.departmentControl.value);
    this.filters.controls.city.setValue('');
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected toggleStatus(branch: Branch): void {
    if (branch.active) {
      // Dar de baja es la operación sensible: pide confirmación antes de ejecutarla.
      this.branchToDeactivate.set(branch);
      return;
    }
    this.applyStatusChange(branch, true);
  }

  protected confirmDeactivate(): void {
    const branch = this.branchToDeactivate();
    if (!branch) {
      return;
    }
    this.branchToDeactivate.set(null);
    this.applyStatusChange(branch, false);
  }

  private applyStatusChange(branch: Branch, active: boolean): void {
    this.togglingId.set(branch.id);
    this.setBranchStatusUseCase
      .execute(branch.id, active)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo cambiar el estado de la sucursal.'),
      });
  }

  private search(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { text, city, active } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchBranchesUseCase
      .execute(organizationId, {
        page: this.page,
        size: 20,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        text: text || undefined,
        city: city || undefined,
        active: active === '' ? undefined : active === 'true',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el listado de sucursales.'),
      });
  }
}
