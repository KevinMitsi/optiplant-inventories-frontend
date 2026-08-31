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
  productUnitId: FormControl<string>;
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
  template: `
    <h1>Nueva transferencia</h1>

    <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label for="destinationBranchId">Sucursal destino</label>
      <select id="destinationBranchId" formControlName="destinationBranchId">
        <option value="" disabled>Seleccione una sucursal…</option>
        @for (branch of destinationBranches(); track branch.id) {
          <option [value]="branch.id">{{ branch.name }}</option>
        }
      </select>
      @if (form.controls.destinationBranchId.invalid && form.controls.destinationBranchId.touched) {
        <p class="field-error" role="alert">Selecciona la sucursal destino.</p>
      }

      <label for="transferNumber">Número</label>
      <input id="transferNumber" formControlName="transferNumber" placeholder="TR-2026-0001" />
      @if (form.controls.transferNumber.invalid && form.controls.transferNumber.touched) {
        <p class="field-error" role="alert">
          {{
            form.controls.transferNumber.hasError('required') ? 'El número es obligatorio.' : 'Máximo 40 caracteres.'
          }}
        </p>
      }

      <label for="priority">Prioridad</label>
      <select id="priority" formControlName="priority">
        <option value="LOW">Baja</option>
        <option value="NORMAL">Normal</option>
        <option value="HIGH">Alta</option>
        <option value="URGENT">Urgente</option>
      </select>

      <label for="notes">Notas (opcional)</label>
      <input id="notes" formControlName="notes" />

      <h2>Líneas</h2>
      @for (item of form.controls.items.controls; track $index) {
        <fieldset class="item-row">
          <legend>Línea {{ $index + 1 }}</legend>
          <label [for]="'productId-' + $index">Producto</label>
          <select [id]="'productId-' + $index" [formControl]="item.controls.productId">
            <option value="" disabled>Seleccione un producto…</option>
            @for (product of products(); track product.id) {
              <option [value]="product.id">{{ product.sku }} — {{ product.name }}</option>
            }
          </select>
          @if (item.controls.productId.invalid && item.controls.productId.touched) {
            <p class="field-error" role="alert">Selecciona un producto.</p>
          }

          <label [for]="'productUnitId-' + $index">Presentación</label>
          <select [id]="'productUnitId-' + $index" [formControl]="item.controls.productUnitId">
            <option value="" disabled>Seleccione una presentación…</option>
            @for (unit of unitsForProduct(item.controls.productId.value); track unit.id) {
              <option [value]="unit.id">{{ unit.unit.symbol }} — {{ unit.unit.name }}</option>
            }
          </select>
          @if (item.controls.productUnitId.invalid && item.controls.productUnitId.touched) {
            <p class="field-error" role="alert">Selecciona una presentación.</p>
          }

          <label [for]="'quantity-' + $index">Cantidad</label>
          <input [id]="'quantity-' + $index" type="number" [formControl]="item.controls.quantity" step="any" min="0" />
          @if (item.controls.quantity.invalid && item.controls.quantity.touched) {
            <p class="field-error" role="alert">
              {{
                item.controls.quantity.hasError('required') ? 'La cantidad es obligatoria.' : 'Debe ser mayor que 0.'
              }}
            </p>
          }

          @if (form.controls.items.length > 1) {
            <button type="button" class="button button--ghost" (click)="removeItem($index)">Quitar línea</button>
          }
        </fieldset>
      }
      <button type="button" class="button button--ghost" (click)="addItem()">Añadir línea</button>

      @if (errorMessage(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }

      @if (form.invalid && form.touched) {
        <p class="form-error" role="alert">Revisa los campos marcados en rojo antes de guardar.</p>
      }

      <div class="actions">
        <a routerLink="/transfers" [queryParams]="branchQueryParams" class="button button--ghost">Cancelar</a>
        <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Solicitando…' : 'Solicitar transferencia' }}
        </button>
      </div>
    </form>
  `,
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

  protected unitsForProduct(productId: string) {
    return this.products().find((product) => product.id === productId)?.units ?? [];
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
        items: items.map(({ productId, productUnitId, quantity }) => ({
          productId,
          productUnitId,
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
      productUnitId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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
