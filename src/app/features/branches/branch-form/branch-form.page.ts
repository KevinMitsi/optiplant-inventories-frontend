import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateBranchUseCase } from '../../../core/application/branches/create-branch.usecase';
import { UpdateBranchUseCase } from '../../../core/application/branches/update-branch.usecase';
import { GetBranchUseCase } from '../../../core/application/branches/get-branch.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';
import { CountryDirectoryService } from '../../../shared/data/country-directory.service';
import { ColombiaLocationDirectoryService } from '../../../shared/data/colombia-location-directory.service';

interface BranchForm {
  code: FormControl<string>;
  name: FormControl<string>;
  addressLine: FormControl<string>;
  city: FormControl<string>;
  countryCode: FormControl<string>;
  phone: FormControl<string>;
}

const ONLY_DIGITS = /^\d*$/;
/** Letras (con acentos/ñ), espacios y puntuación habitual de nombres de sucursal — nada de dígitos. */
const NAME_PATTERN = /^[A-Za-zÀ-ÿÑñ][A-Za-zÀ-ÿÑñ\s.,&'-]*$/;

/**
 * Alta/edición de sucursal en un único componente (misma forma, distinto
 * caso de uso al enviar). El modo se decide por la presencia de `:id` en la
 * ruta (`branches.routes.ts`): con id, edición (código inmutable, deshabilitado
 * en el formulario); sin id, alta.
 *
 * País y ciudad son selects poblados por directorios externos (no hay
 * endpoint propio para esto en APIDOC.json): `countryCode` contra
 * restcountries.com (bandera + ISO alfa-2) y `city` contra el dataset DANE de
 * datos.gov.co, en cascada por departamento — el departamento es solo filtro
 * de UI, no se envía al backend (`Branch.city` solo guarda el municipio).
 */
@Component({
  selector: 'app-branch-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branch-form.page.html',
  styleUrl: './branch-form.page.scss',
})
export class BranchFormPage {
  private readonly createBranchUseCase = inject(CreateBranchUseCase);
  private readonly updateBranchUseCase = inject(UpdateBranchUseCase);
  private readonly getBranchUseCase = inject(GetBranchUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly countryDirectory = inject(CountryDirectoryService);
  protected readonly locationDirectory = inject(ColombiaLocationDirectoryService);

  private readonly branchId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.branchId !== null);
  protected readonly loadingBranch = signal(this.branchId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly departments = this.locationDirectory.departments;

  /** Departamento es solo filtro de UI para el select de ciudad; no viaja al backend. */
  protected readonly departmentControl = new FormControl('', { nonNullable: true });
  private readonly selectedDepartmentCode = signal('');
  protected readonly cities = computed(() =>
    this.locationDirectory.municipalitiesForDepartment(this.selectedDepartmentCode()),
  );

  /** Espejo en signal del valor de `city` — permite reaccionar a la carga tardía de municipios. */
  private readonly cityValue = signal('');

  /** Espejo en signal de `countryCode`, para derivar el prefijo telefónico mostrado junto a Teléfono. */
  private readonly countryCodeValue = signal('');
  protected readonly selectedCallingCode = computed(
    () => this.countryDirectory.countries().find((country) => country.code === this.countryCodeValue())?.callingCode ?? '',
  );

  /** Teléfono tal como vino del backend (con prefijo), pendiente de recortar en modo edición. */
  private readonly rawPhoneFromBranch = signal<string | null>(null);

  protected readonly form = new FormGroup<BranchForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9._-]+$/)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150), Validators.pattern(NAME_PATTERN)],
    }),
    addressLine: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(250)],
    }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    countryCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30), Validators.pattern(ONLY_DIGITS)],
    }),
  });

  constructor() {
    this.countryDirectory.ensureLoaded();
    this.locationDirectory.ensureLoaded();

    this.form.controls.city.valueChanges.subscribe((value) => this.cityValue.set(value));
    this.form.controls.countryCode.valueChanges.subscribe((value) => this.countryCodeValue.set(value));

    // Al editar, deriva el departamento desde la ciudad guardada para poblar el
    // select en cascada — reactivo a que municipios y datos de sucursal lleguen
    // en cualquier orden (dos cargas async independientes).
    effect(() => {
      const cityName = this.cityValue();
      const municipalities = this.locationDirectory.municipalities();
      if (!cityName || municipalities.length === 0 || this.departmentControl.value) {
        return;
      }
      const match = municipalities.find((municipality) => municipality.name === cityName);
      if (match) {
        this.departmentControl.setValue(match.departmentCode);
        this.selectedDepartmentCode.set(match.departmentCode);
      }
    });

    // El backend guarda `phone` con el prefijo internacional incluido
    // (`+57 6015551234`); el campo local solo maneja el número, así que hay
    // que recortarlo apenas se conoce el `callingCode` del país guardado.
    effect(() => {
      const rawPhone = this.rawPhoneFromBranch();
      const callingCode = this.selectedCallingCode();
      if (rawPhone === null || !callingCode) {
        return;
      }
      const prefix = `+${callingCode}`;
      const localPhone = rawPhone.startsWith(prefix)
        ? rawPhone.slice(prefix.length).replace(/^\s+/, '')
        : rawPhone;
      this.form.controls.phone.setValue(localPhone);
      this.rawPhoneFromBranch.set(null);
    });

    if (this.branchId) {
      this.form.controls.code.disable();
      this.getBranchUseCase
        .execute(this.branchId)
        .pipe(finalize(() => this.loadingBranch.set(false)))
        .subscribe({
          next: (branch) => {
            this.form.patchValue({
              code: branch.code,
              name: branch.name,
              addressLine: branch.addressLine,
              city: branch.city,
              countryCode: branch.countryCode,
            });
            this.rawPhoneFromBranch.set(branch.phone);
          },
          error: () => this.errorMessage.set('No se pudo cargar la sucursal.'),
        });
    }
  }

  protected onDepartmentChange(): void {
    this.selectedDepartmentCode.set(this.departmentControl.value);
    this.form.controls.city.setValue('');
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { code, name, addressLine, city, countryCode, phone: localPhone } = this.form.getRawValue();
    const callingCode = this.selectedCallingCode();
    const phone = localPhone ? (callingCode ? `+${callingCode} ${localPhone}` : localPhone) : '';

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
