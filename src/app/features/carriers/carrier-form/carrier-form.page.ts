import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateCarrierUseCase } from '../../../core/application/carriers/create-carrier.usecase';
import { UpdateCarrierUseCase } from '../../../core/application/carriers/update-carrier.usecase';
import { GetCarrierUseCase } from '../../../core/application/carriers/get-carrier.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface CarrierForm {
  code: FormControl<string>;
  name: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
}

/** Alta/edición de transportista en un único componente, mismo patrón que `BranchFormPage`. */
@Component({
  selector: 'app-carrier-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isEditMode() ? 'Editar transportista' : 'Nuevo transportista' }}</h1>

    @if (loadingCarrier()) {
      <p>Cargando…</p>
    } @else {
      <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="code">Código</label>
        <input id="code" formControlName="code" placeholder="TRANS-01" />
        @if (isEditMode()) {
          <p class="hint">El código es inmutable una vez creado el transportista.</p>
        }

        <label for="name">Nombre</label>
        <input id="name" formControlName="name" />

        <label for="phone">Teléfono</label>
        <input id="phone" formControlName="phone" />

        <label for="email">Correo</label>
        <input id="email" type="email" formControlName="email" />

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        <div class="actions">
          <a routerLink="/carriers" class="button button--ghost">Cancelar</a>
          <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    }
  `,
  styleUrl: './carrier-form.page.scss',
})
export class CarrierFormPage {
  private readonly createCarrierUseCase = inject(CreateCarrierUseCase);
  private readonly updateCarrierUseCase = inject(UpdateCarrierUseCase);
  private readonly getCarrierUseCase = inject(GetCarrierUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly carrierId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.carrierId !== null);
  protected readonly loadingCarrier = signal(this.carrierId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup<CarrierForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(254)] }),
  });

  constructor() {
    if (this.carrierId) {
      this.form.controls.code.disable();
      this.getCarrierUseCase
        .execute(this.carrierId)
        .pipe(finalize(() => this.loadingCarrier.set(false)))
        .subscribe({
          next: (carrier) =>
            this.form.patchValue({
              code: carrier.code,
              name: carrier.name,
              phone: carrier.phone,
              email: carrier.email,
            }),
          error: () => this.errorMessage.set('No se pudo cargar el transportista.'),
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
    const { code, name, phone, email } = this.form.getRawValue();

    const request$ = this.carrierId
      ? this.updateCarrierUseCase.execute(this.carrierId, { name, phone, email })
      : this.createCarrierUseCase.execute(this.authStore.currentUser()!.organizationId, {
          code,
          name,
          phone,
          email,
        });

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/carriers'),
      error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo guardar el transportista.'),
    });
  }
}
