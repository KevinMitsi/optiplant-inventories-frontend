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
  templateUrl: './supplier-form.page.html',
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
