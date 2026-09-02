import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateCarrierUseCase } from '../../../core/application/carriers/create-carrier.usecase';
import { UpdateCarrierUseCase } from '../../../core/application/carriers/update-carrier.usecase';
import { GetCarrierUseCase } from '../../../core/application/carriers/get-carrier.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { CountryDirectoryService } from '../../../shared/data/country-directory.service';

interface CarrierForm {
  code: FormControl<string>;
  name: FormControl<string>;
  countryCode: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
}

/** Solo dígitos — mismo criterio que `BranchFormPage.phone`. */
const ONLY_DIGITS = /^\d*$/;
/** Letras (con acentos/ñ), espacios y puntuación habitual de razones sociales — nada de dígitos. */
const NAME_PATTERN = /^[A-Za-zÀ-ÿÑñ][A-Za-zÀ-ÿÑñ\s.,&'-]*$/;

/**
 * Alta/edición de transportista en un único componente, mismo patrón que
 * `BranchFormPage`: el selector de país (bandera + prefijo telefónico) se
 * reutiliza de `CountryDirectoryService` para componer `phone` con su
 * prefijo internacional. A diferencia de `Branch`, `Carrier` no persiste
 * `countryCode` — el país aquí es solo un dato de UI para armar el teléfono.
 */
@Component({
  selector: 'app-carrier-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carrier-form.page.html',
  styleUrl: './carrier-form.page.scss',
})
export class CarrierFormPage {
  private readonly createCarrierUseCase = inject(CreateCarrierUseCase);
  private readonly updateCarrierUseCase = inject(UpdateCarrierUseCase);
  private readonly getCarrierUseCase = inject(GetCarrierUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly countryDirectory = inject(CountryDirectoryService);

  private readonly carrierId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.carrierId !== null);
  protected readonly loadingCarrier = signal(this.carrierId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Espejo en signal de `countryCode`, para derivar el prefijo telefónico mostrado junto a Teléfono. */
  private readonly countryCodeValue = signal('');
  protected readonly selectedCallingCode = computed(
    () => this.countryDirectory.countries().find((country) => country.code === this.countryCodeValue())?.callingCode ?? '',
  );

  /** Teléfono tal como vino del backend (con prefijo), pendiente de recortar en modo edición. */
  private readonly rawPhoneFromCarrier = signal<string | null>(null);

  protected readonly form = new FormGroup<CarrierForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150), Validators.pattern(NAME_PATTERN)],
    }),
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
      const rawPhone = this.rawPhoneFromCarrier();
      const callingCode = this.selectedCallingCode();
      if (rawPhone === null || !callingCode) {
        return;
      }
      const prefix = `+${callingCode}`;
      const localPhone = rawPhone.startsWith(prefix)
        ? rawPhone.slice(prefix.length).replace(/^\s+/, '')
        : rawPhone;
      this.form.controls.phone.setValue(localPhone);
      this.rawPhoneFromCarrier.set(null);
    });

    if (this.carrierId) {
      this.form.controls.code.disable();
      this.getCarrierUseCase
        .execute(this.carrierId)
        .pipe(finalize(() => this.loadingCarrier.set(false)))
        .subscribe({
          next: (carrier) => {
            this.form.patchValue({ code: carrier.code, name: carrier.name, email: carrier.email });
            this.rawPhoneFromCarrier.set(carrier.phone);
          },
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
    const { code, name, phone: localPhone, email } = this.form.getRawValue();
    const callingCode = this.selectedCallingCode();
    const phone = localPhone ? (callingCode ? `+${callingCode} ${localPhone}` : localPhone) : '';

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
