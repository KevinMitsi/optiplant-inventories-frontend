import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateTransferUseCase } from '../../../core/application/transfers/create-transfer.usecase';
import { SearchProductsUseCase } from '../../../core/application/products/search-products.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { Product } from '../../../core/domain/models/product.model';
import { Branch } from '../../../core/domain/models/branch.model';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface TransferItemForm {
  productId: FormControl<string>;
  quantity: FormControl<number | null>;
}

interface TransferForm {
  destinationBranchId: FormControl<string>;
  transferNumber: FormControl<string>;
  priority: FormControl<string>;
  notes: FormControl<string>;
  items: FormArray<FormGroup<TransferItemForm>>;
}

/**
 * Solicitud de una transferencia (HU-27): el origen —la sucursal del
 * usuario, o la elegida en el listado si es ADMIN— pide reponer stock desde
 * otra sucursal (`POST /branches/{originBranchId}/transfers`). Origen y
 * destino deben ser distintos (RN-07); la API lo valida, aquí solo se
 * excluye el origen de las opciones de destino.
 */
@Component({
  selector: 'app-transfer-create-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transfer-create.page.html',
  styleUrl: './transfer-create.page.scss',
})
export class TransferCreatePage {
  private readonly createTransferUseCase = inject(CreateTransferUseCase);
  private readonly searchProductsUseCase = inject(SearchProductsUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly products = signal<Product[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly branchQueryParams = this.route.snapshot.queryParamMap.get('branchId')
    ? { branchId: this.route.snapshot.queryParamMap.get('branchId') }
    : {};

  private readonly originBranchId =
    this.authStore.currentUser()?.branchId ?? this.route.snapshot.queryParamMap.get('branchId');

  protected readonly destinationBranches = signal<Branch[]>([]);

  protected readonly form = new FormGroup<TransferForm>({
    destinationBranchId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    transferNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40)],
    }),
    priority: new FormControl('NORMAL', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    items: new FormArray<FormGroup<TransferItemForm>>([this.buildItem()]),
  });

  constructor() {
    this.loadProducts();
    this.loadBranches();
  }

  protected addItem(): void {
    this.form.controls.items.push(this.buildItem());
  }

  protected removeItem(index: number): void {
    this.form.controls.items.removeAt(index);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting() || !this.originBranchId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { destinationBranchId, transferNumber, priority, notes, items } = this.form.getRawValue();

    this.createTransferUseCase
      .execute(this.originBranchId, {
        destinationBranchId,
        transferNumber,
        priority: priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
        notes: notes || undefined,
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity: quantity!,
        })),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (transfer) => void this.router.navigate(['/transfers', transfer.id]),
        error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo solicitar la transferencia.'),
      });
  }

  private buildItem(): FormGroup<TransferItemForm> {
    return new FormGroup<TransferItemForm>({
      productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      quantity: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.000001)] }),
    });
  }

  private loadProducts(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchProductsUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe({ next: (page) => this.products.set(page.content) });
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
          this.destinationBranches.set(page.content.filter((branch) => branch.id !== this.originBranchId));
        },
      });
  }
}
