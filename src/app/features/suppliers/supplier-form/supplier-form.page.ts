import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateSupplierUseCase } from '../../../core/application/suppliers/create-supplier.usecase';
import { UpdateSupplierUseCase } from '../../../core/application/suppliers/update-supplier.usecase';
import { GetSupplierUseCase } from '../../../core/application/suppliers/get-supplier.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface SupplierForm {
  code: FormControl<string>;
  name: FormControl<string>;
  taxId: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
}

/** Alta/edición de proveedor en un único componente, mismo patrón que `BranchFormPage`. */
@Component({
  selector: 'app-supplier-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isEditMode() ? 'Editar proveedor' : 'Nuevo proveedor' }}</h1>

    @if (loadingSupplier()) {
      <p>Cargando…</p>
    } @else {
      <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="code">Código</label>
        <input id="code" formControlName="code" placeholder="PROV-01" />
        @if (isEditMode()) {
          <p class="hint">El código es inmutable una vez creado el proveedor.</p>
        }

        <label for="name">Razón social</label>
        <input id="name" formControlName="name" />

        <label for="taxId">NIT</label>
        <input id="taxId" formControlName="taxId" />

        <label for="email">Correo</label>
        <input id="email" type="email" formControlName="email" />

        <label for="phone">Teléfono</label>
        <input id="phone" formControlName="phone" />

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        <div class="actions">
          <a routerLink="/suppliers" class="button button--ghost">Cancelar</a>
          <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    }
  `,
  styleUrl: './supplier-form.page.scss',
})
export class SupplierFormPage {
  private readonly createSupplierUseCase = inject(CreateSupplierUseCase);
  private readonly updateSupplierUseCase = inject(UpdateSupplierUseCase);
  private readonly getSupplierUseCase = inject(GetSupplierUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly supplierId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.supplierId !== null);
  protected readonly loadingSupplier = signal(this.supplierId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup<SupplierForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
    taxId: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(254)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
  });

  constructor() {
    if (this.supplierId) {
      this.form.controls.code.disable();
      this.getSupplierUseCase
        .execute(this.supplierId)
        .pipe(finalize(() => this.loadingSupplier.set(false)))
        .subscribe({
          next: (supplier) =>
            this.form.patchValue({
              code: supplier.code,
              name: supplier.name,
              taxId: supplier.taxId,
              email: supplier.email,
              phone: supplier.phone,
            }),
          error: () => this.errorMessage.set('No se pudo cargar el proveedor.'),
        });
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { code, name, taxId, email, phone } = this.form.getRawValue();

    const request$ = this.supplierId
      ? this.updateSupplierUseCase.execute(this.supplierId, { name, taxId, email, phone })
      : this.createSupplierUseCase.execute(this.authStore.currentUser()!.organizationId, {
          code,
          name,
          taxId,
          email,
          phone,
        });

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/suppliers'),
      error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo guardar el proveedor.'),
    });
  }
}
