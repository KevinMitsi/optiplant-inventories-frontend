import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateBranchUseCase } from '../../../core/application/branches/create-branch.usecase';
import { UpdateBranchUseCase } from '../../../core/application/branches/update-branch.usecase';
import { GetBranchUseCase } from '../../../core/application/branches/get-branch.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface BranchForm {
  code: FormControl<string>;
  name: FormControl<string>;
  addressLine: FormControl<string>;
  city: FormControl<string>;
  countryCode: FormControl<string>;
  phone: FormControl<string>;
}

/**
 * Alta/edición de sucursal en un único componente (misma forma, distinto
 * caso de uso al enviar). El modo se decide por la presencia de `:id` en la
 * ruta (`branches.routes.ts`): con id, edición (código inmutable, deshabilitado
 * en el formulario); sin id, alta.
 */
@Component({
  selector: 'app-branch-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isEditMode() ? 'Editar sucursal' : 'Nueva sucursal' }}</h1>

    @if (loadingBranch()) {
      <p>Cargando…</p>
    } @else {
      <form class="branch-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="code">Código</label>
        <input id="code" formControlName="code" placeholder="BOG-01" />
        @if (isEditMode()) {
          <p class="hint">El código es inmutable una vez creada la sucursal.</p>
        }

        <label for="name">Nombre</label>
        <input id="name" formControlName="name" />

        <label for="addressLine">Dirección</label>
        <input id="addressLine" formControlName="addressLine" />

        <label for="city">Ciudad</label>
        <input id="city" formControlName="city" />

        <label for="countryCode">País (ISO alfa-2)</label>
        <input id="countryCode" formControlName="countryCode" placeholder="CO" maxlength="2" />

        <label for="phone">Teléfono</label>
        <input id="phone" formControlName="phone" />

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        <div class="actions">
          <a routerLink="/branches" class="button button--ghost">Cancelar</a>
          <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    }
  `,
  styleUrl: './branch-form.page.scss',
})
export class BranchFormPage {
  private readonly createBranchUseCase = inject(CreateBranchUseCase);
  private readonly updateBranchUseCase = inject(UpdateBranchUseCase);
  private readonly getBranchUseCase = inject(GetBranchUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly branchId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.branchId !== null);
  protected readonly loadingBranch = signal(this.branchId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup<BranchForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9._-]+$/)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    addressLine: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(250)] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    countryCode: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^[A-Za-z]{2}$/)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
  });

  constructor() {
    if (this.branchId) {
      this.form.controls.code.disable();
      this.getBranchUseCase
        .execute(this.branchId)
        .pipe(finalize(() => this.loadingBranch.set(false)))
        .subscribe({
          next: (branch) =>
            this.form.patchValue({
              code: branch.code,
              name: branch.name,
              addressLine: branch.addressLine,
              city: branch.city,
              countryCode: branch.countryCode,
              phone: branch.phone,
            }),
          error: () => this.errorMessage.set('No se pudo cargar la sucursal.'),
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
    const { code, name, addressLine, city, countryCode, phone } = this.form.getRawValue();

    const request$ = this.branchId
      ? this.updateBranchUseCase.execute(this.branchId, { name, addressLine, city, countryCode, phone })
      : this.createBranchUseCase.execute(this.authStore.currentUser()!.organizationId, {
          code,
          name,
          addressLine,
          city,
          countryCode,
          phone,
        });

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/branches'),
      error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo guardar la sucursal.'),
    });
  }
}
