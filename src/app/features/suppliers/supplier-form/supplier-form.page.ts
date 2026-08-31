import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateSupplierUseCase } from '../../../core/application/suppliers/create-supplier.usecase';
import { UpdateSupplierUseCase } from '../../../core/application/suppliers/update-supplier.usecase';
import { GetSupplierUseCase } from '../../../core/application/suppliers/get-supplier.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { CountryDirectoryService } from '../../../shared/data/country-directory.service';

interface SupplierForm {
  code: FormControl<string>;
  name: FormControl<string>;
  taxId: FormControl<string>;
  countryCode: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
}

/** Solo dígitos — mismo criterio que `BranchFormPage.phone`/`CarrierFormPage.phone`. */
const ONLY_DIGITS = /^\d*$/;
/** Letras (con acentos/ñ), espacios y puntuación habitual de razones sociales — nada de dígitos. */
const NAME_PATTERN = /^[A-Za-zÀ-ÿÑñ][A-Za-zÀ-ÿÑñ\s.,&'-]*$/;

/**
 * Alta/edición de proveedor en un único componente, mismo patrón que
 * `BranchFormPage`/`CarrierFormPage`: el selector de país (bandera + prefijo
 * telefónico) se reutiliza de `CountryDirectoryService` para componer
 * `phone` con su prefijo internacional. Igual que `Carrier`, `Supplier` no
 * persiste `countryCode` — el país aquí es solo un dato de UI para armar el
 * teléfono. Validaciones espejo exacto de `CreateSupplierRequest` en
 * backend: code required max 30, name required max 180, taxId opcional
 * max 50, email opcional pero formato válido si se ingresa, max 254,
 * phone opcional solo dígitos, max 30.
 */
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
        } @else if (form.controls.code.invalid && form.controls.code.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.code.hasError('required')
                ? 'El código del proveedor es obligatorio.'
                : 'El código no puede superar 30 caracteres.'
            }}
          </p>
        }

        <label for="name">Razón social</label>
        <input id="name" formControlName="name" />
        @if (form.controls.name.invalid && form.controls.name.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.name.hasError('required')
                ? 'El nombre del proveedor es obligatorio.'
                : form.controls.name.hasError('maxlength')
                  ? 'El nombre no puede superar 180 caracteres.'
                  : 'El nombre no puede contener números.'
            }}
          </p>
        }

        <label for="taxId">NIT</label>
        <input id="taxId" formControlName="taxId" />
        @if (form.controls.taxId.invalid && form.controls.taxId.touched) {
          <p class="field-error" role="alert">No puede superar 50 caracteres.</p>
        }

        <div class="field-group">
          <div>
            <label for="countryCode">País</label>
            <select id="countryCode" formControlName="countryCode">
              <option value="">Selecciona un país…</option>
              @for (country of countryDirectory.countries(); track country.code) {
                <option [value]="country.code">{{ country.flag }} {{ country.name }} ({{ country.code }})</option>
              }
            </select>
            @if (countryDirectory.loading()) {
              <p class="hint">Cargando países…</p>
            } @else if (countryDirectory.error()) {
              <p class="field-error" role="alert">{{ countryDirectory.error() }}</p>
            }
          </div>

          <div>
            <label for="phone">Teléfono</label>
            <div class="phone-field">
              <span class="phone-prefix">+{{ selectedCallingCode() || '--' }}</span>
              <input id="phone" formControlName="phone" inputmode="numeric" placeholder="Solo números" />
            </div>
            @if (form.controls.phone.invalid && form.controls.phone.touched) {
              <p class="field-error" role="alert">
                {{
                  form.controls.phone.hasError('pattern')
                    ? 'El teléfono solo puede contener números.'
                    : 'No puede superar 30 caracteres.'
                }}
              </p>
            }
          </div>
        </div>

        <label for="email">Correo</label>
        <input id="email" type="email" formControlName="email" />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.email.hasError('email')
                ? 'El correo no tiene un formato válido.'
                : 'No puede superar 254 caracteres.'
            }}
          </p>
        }

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        @if (form.invalid && form.touched) {
          <p class="form-error" role="alert">Revisa los campos marcados en rojo antes de guardar.</p>
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

  protected readonly countryDirectory = inject(CountryDirectoryService);

  private readonly supplierId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.supplierId !== null);
  protected readonly loadingSupplier = signal(this.supplierId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Espejo en signal de `countryCode`, para derivar el prefijo telefónico mostrado junto a Teléfono. */
  private readonly countryCodeValue = signal('');
  protected readonly selectedCallingCode = computed(
    () => this.countryDirectory.countries().find((country) => country.code === this.countryCodeValue())?.callingCode ?? '',
  );

  /** Teléfono tal como vino del backend (con prefijo), pendiente de recortar en modo edición. */
  private readonly rawPhoneFromSupplier = signal<string | null>(null);

  protected readonly form = new FormGroup<SupplierForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(180), Validators.pattern(NAME_PATTERN)],
    }),
    taxId: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    countryCode: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30), Validators.pattern(ONLY_DIGITS)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(254)] }),
  });

  constructor() {
    this.countryDirectory.ensureLoaded();
    this.form.controls.countryCode.valueChanges.subscribe((value) => this.countryCodeValue.set(value));

    // El backend guarda `phone` con el prefijo internacional incluido
    // (`+57 3001234567`); el campo local solo maneja el número, así que hay
    // que recortarlo apenas se conoce el `callingCode` del país seleccionado.
    effect(() => {
      const rawPhone = this.rawPhoneFromSupplier();
      const callingCode = this.selectedCallingCode();
      if (rawPhone === null || !callingCode) {
        return;
      }
      const prefix = `+${callingCode}`;
      const localPhone = rawPhone.startsWith(prefix)
        ? rawPhone.slice(prefix.length).replace(/^\s+/, '')
        : rawPhone;
      this.form.controls.phone.setValue(localPhone);
      this.rawPhoneFromSupplier.set(null);
    });

    if (this.supplierId) {
      this.form.controls.code.disable();
      this.getSupplierUseCase
        .execute(this.supplierId)
        .pipe(finalize(() => this.loadingSupplier.set(false)))
        .subscribe({
          next: (supplier) => {
            this.form.patchValue({ code: supplier.code, name: supplier.name, taxId: supplier.taxId, email: supplier.email });
            this.rawPhoneFromSupplier.set(supplier.phone);
          },
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
    const { code, name, taxId, phone: localPhone, email } = this.form.getRawValue();
    const callingCode = this.selectedCallingCode();
    const phone = localPhone ? (callingCode ? `+${callingCode} ${localPhone}` : localPhone) : '';

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
