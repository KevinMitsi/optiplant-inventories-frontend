import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchUsersUseCase } from '../../../core/application/users/search-users.usecase';
import { SetUserStatusUseCase } from '../../../core/application/users/set-user-status.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { User, UserSortField, fullName } from '../../../core/domain/models/user.model';
import { Page } from '../../../core/domain/models/page.model';
import { SortDirection } from '../../../core/domain/models/page-query.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { Role } from '../../../core/domain/enums/role.enum';
import { PaginatorComponent } from '../../../shared/ui/table/paginator.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

interface UserFilters {
  text: FormControl<string>;
  role: FormControl<'' | Role>;
  branchId: FormControl<string>;
  active: FormControl<'' | 'true' | 'false'>;
}

const EMPTY_PAGE: Page<User> = {
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
 * Listado paginado de usuarios de la organización (HU-02/03). Visible para
 * ADMIN y BRANCH_MANAGER (APIDOC.json: el operador de inventario no tiene
 * motivo para consultar el directorio de cuentas — ver `users.routes.ts`);
 * dar de alta, editar rol/sucursal y activar/desactivar quedan reservados a
 * ADMIN, igual que en `BranchListPage`.
 */
@Component({
  selector: 'app-user-list-page',
  imports: [ReactiveFormsModule, RouterLink, PaginatorComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.page.html',
  styleUrl: './user-list.page.scss',
})
export class UserListPage {
  private readonly searchUsersUseCase = inject(SearchUsersUseCase);
  private readonly setUserStatusUseCase = inject(SetUserStatusUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly fullName = fullName;
  protected readonly isAdmin = computed(() => this.authStore.role() === Role.Admin);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<User>>(EMPTY_PAGE);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly userToDeactivate = signal<User | null>(null);
  protected readonly branches = signal<{ id: string; name: string }[]>([]);

  protected readonly filters = new FormGroup<UserFilters>({
    text: new FormControl('', { nonNullable: true }),
    role: new FormControl('', { nonNullable: true }),
    branchId: new FormControl('', { nonNullable: true }),
    active: new FormControl('', { nonNullable: true }),
  });

  private page = 0;
  private readonly sortBy: UserSortField = 'lastName';
  private readonly sortDirection: SortDirection = 'ASC';

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

  protected branchName(branchId: string | null): string {
    if (!branchId) {
      return '—';
    }
    return this.branches().find((branch) => branch.id === branchId)?.name ?? branchId;
  }

  protected goToPage(nextPage: number): void {
    this.page = nextPage;
    this.search();
  }

  protected toggleStatus(user: User): void {
    if (user.active) {
      // Dar de baja es la operación sensible: pide confirmación antes de ejecutarla.
      this.userToDeactivate.set(user);
      return;
    }
    this.applyStatusChange(user, true);
  }

  protected confirmDeactivate(): void {
    const user = this.userToDeactivate();
    if (!user) {
      return;
    }
    this.userToDeactivate.set(null);
    this.applyStatusChange(user, false);
  }

  private applyStatusChange(user: User, active: boolean): void {
    this.togglingId.set(user.id);
    this.setUserStatusUseCase
      .execute(user.id, active)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: () => this.search(),
        error: () => this.errorMessage.set('No se pudo cambiar el estado del usuario.'),
      });
  }

  private loadBranches(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchBranchesUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe((page) => this.branches.set(page.content.map(({ id, name }) => ({ id, name }))));
  }

  private search(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { text, role, branchId, active } = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.searchUsersUseCase
      .execute(organizationId, {
        page: this.page,
        size: 20,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        text: text || undefined,
        role: role || undefined,
        branchId: branchId || undefined,
        active: active === '' ? undefined : active === 'true',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.result.set(page),
        error: () => this.errorMessage.set('No se pudo cargar el listado de usuarios.'),
      });
  }
}
