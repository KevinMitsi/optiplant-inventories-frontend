import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { Branch } from '../../../core/domain/models/branch.model';
import { AuthStore } from '../../../core/state/auth-store.service';

/**
 * Puerta de entrada al módulo de ajustes: la API no expone un listado
 * (`GET /branches/{branchId}/inventory-adjustments` no existe), así que en
 * vez de fabricar una tabla que el backend no puede llenar, se ofrece
 * consultar un ajuste por su identificador (compartido al crearlo) o crear
 * uno nuevo. Mismo criterio que la consulta puntual de precio de producto en
 * `PriceListFormPage` (Fase 5).
 *
 * La sucursal es obligatoria para crear un ajuste (RN-14): ADMIN elige una
 * con el selector antes de habilitar "Nuevo ajuste" — mismo criterio que
 * `SaleListPage` — y el resto ve la suya fija, sin selector.
 */
@Component({
  selector: 'app-inventory-adjustment-lookup-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-adjustment-lookup.page.html',
  styleUrl: './inventory-adjustment-lookup.page.scss',
})
export class InventoryAdjustmentLookupPage {
  private readonly router = inject(Router);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);

  protected readonly form = new FormGroup({
    adjustmentId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly isAdmin = computed(() => this.authStore.currentUser()?.branchId === null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly branchSelect = new FormControl('', { nonNullable: true });

  private readonly adminBranchId = signal<string | null>(null);

  protected readonly branchId = computed(() => {
    const ownBranchId = this.authStore.currentUser()?.branchId;
    return ownBranchId ?? this.adminBranchId();
  });

  protected readonly branchQueryParams = computed(() =>
    this.isAdmin() && this.branchId() ? { branchId: this.branchId() } : {},
  );

  constructor() {
    if (this.isAdmin()) {
      this.loadBranches();
    }

    this.branchSelect.valueChanges.subscribe((value) => this.adminBranchId.set(value || null));
  }

  protected lookup(): void {
    if (this.form.invalid) {
      return;
    }

    void this.router.navigate(['/inventory-adjustments', this.form.getRawValue().adjustmentId]);
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
}
