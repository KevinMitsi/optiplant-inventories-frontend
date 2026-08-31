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
  template: `
    <h1>{{ isEditMode() ? 'Editar sucursal' : 'Nueva sucursal' }}</h1>

    @if (loadingBranch()) {
      <p>Cargando…</p>
    } @else {
      <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="code">Código</label>
        <input id="code" formControlName="code" placeholder="BOG-01" />
        @if (isEditMode()) {
          <p class="hint">El código es inmutable una vez creada la sucursal.</p>
        } @else if (form.controls.code.invalid && form.controls.code.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.code.hasError('required')
                ? 'El código es obligatorio.'
                : form.controls.code.hasError('maxlength')
                  ? 'Máximo 30 caracteres.'
                  : 'Solo letras, números, punto, guion o guion bajo.'
            }}
          </p>
        }

        <label for="name">Nombre</label>
        <input id="name" formControlName="name" />
        @if (form.controls.name.invalid && form.controls.name.touched) {
          <p class="field-error" role="alert">
            {{ form.controls.name.hasError('required') ? 'El nombre es obligatorio.' : 'Máximo 150 caracteres.' }}
          </p>
        }

        <label for="addressLine">Dirección</label>
        <input id="addressLine" formControlName="addressLine" />
        @if (form.controls.addressLine.invalid && form.controls.addressLine.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.addressLine.hasError('required') ? 'La dirección es obligatoria.' : 'Máximo 250 caracteres.'
            }}
          </p>
        }

        <label for="department">Departamento</label>
        <select id="department" [formControl]="departmentControl" (change)="onDepartmentChange()">
          <option value="">Selecciona un departamento…</option>
          @for (department of departments(); track department.code) {
            <option [value]="department.code">{{ department.name }}</option>
          }
        </select>
        @if (locationDirectory.loading()) {
          <p class="hint">Cargando departamentos…</p>
        } @else if (locationDirectory.error()) {
          <p class="field-error" role="alert">{{ locationDirectory.error() }}</p>
        }

        <label for="city">Ciudad</label>
        <select id="city" formControlName="city">
          <option value="">Selecciona primero un departamento…</option>
          @for (municipality of cities(); track municipality.code) {
            <option [value]="municipality.name">{{ municipality.name }}</option>
          }
        </select>
        @if (form.controls.city.invalid && form.controls.city.touched) {
          <p class="field-error" role="alert">Máximo 100 caracteres.</p>
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
            } @else if (form.controls.countryCode.invalid && form.controls.countryCode.touched) {
              <p class="field-error" role="alert">Selecciona un país.</p>
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
                    : 'Máximo 30 caracteres.'
                }}
              </p>
            }
          </div>
        </div>

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        @if (form.invalid && form.touched) {
          <p class="form-error" role="alert">Revisa los campos marcados en rojo antes de guardar.</p>
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
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
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
