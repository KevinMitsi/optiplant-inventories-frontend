import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateLogisticsRouteUseCase } from '../../../core/application/logistics-routes/create-logistics-route.usecase';
import { UpdateLogisticsRouteUseCase } from '../../../core/application/logistics-routes/update-logistics-route.usecase';
import { GetLogisticsRouteUseCase } from '../../../core/application/logistics-routes/get-logistics-route.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { LOGISTICS_ROUTE_PRIORITIES } from '../../../core/domain/models/logistics-route.model';
import { AuthStore } from '../../../core/state/auth-store.service';

type DurationUnit = 'MINUTES' | 'HOURS' | 'DAYS';

/** Minutos por unidad de duración — única fuente de verdad para la conversión ida/vuelta con el backend. */
const DURATION_UNIT_MINUTES: Record<DurationUnit, number> = {
  MINUTES: 1,
  HOURS: 60,
  DAYS: 60 * 24,
};

interface LogisticsRouteForm {
  originBranchId: FormControl<string>;
  destinationBranchId: FormControl<string>;
  name: FormControl<string>;
  durationValue: FormControl<number | null>;
  durationUnit: FormControl<DurationUnit>;
  estimatedCost: FormControl<number | null>;
  priority: FormControl<number>;
}

/**
 * El origen y el destino no pueden ser la misma sucursal (una ruta logística
 * conecta dos sucursales distintas) — validador a nivel de grupo porque
 * depende de dos controles a la vez.
 */
const differentBranchesValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const origin = group.get('originBranchId')?.value;
  const destination = group.get('destinationBranchId')?.value;
  if (origin && destination && origin === destination) {
    return { sameBranch: true };
  }
  return null;
};

/** Alta/edición de ruta logística en un único componente, mismo patrón que `CarrierFormPage`. */
@Component({
  selector: 'app-logistics-route-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isEditMode() ? 'Editar ruta logística' : 'Nueva ruta logística' }}</h1>

    @if (loadingRoute()) {
      <p>Cargando…</p>
    } @else {
      <form class="entity-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="originBranchId">Sucursal origen</label>
        <select id="originBranchId" formControlName="originBranchId">
          <option value="" disabled>Seleccione…</option>
          @for (branch of branches(); track branch.id) {
            <option [value]="branch.id">{{ branch.name }}</option>
          }
        </select>
        @if (isEditMode()) {
          <p class="hint">El origen es inmutable una vez creada la ruta.</p>
        } @else if (form.controls.originBranchId.invalid && form.controls.originBranchId.touched) {
          <p class="field-error" role="alert">Selecciona la sucursal origen.</p>
        }

        <label for="destinationBranchId">Sucursal destino</label>
        <select id="destinationBranchId" formControlName="destinationBranchId">
          <option value="" disabled>Seleccione…</option>
          @for (branch of branches(); track branch.id) {
            <option [value]="branch.id">{{ branch.name }}</option>
          }
        </select>
        @if (isEditMode()) {
          <p class="hint">El destino es inmutable una vez creada la ruta.</p>
        } @else if (form.controls.destinationBranchId.invalid && form.controls.destinationBranchId.touched) {
          <p class="field-error" role="alert">Selecciona la sucursal destino.</p>
        } @else if (form.errors?.['sameBranch'] && form.controls.destinationBranchId.touched) {
          <p class="field-error" role="alert">El destino no puede ser la misma sucursal que el origen.</p>
        }

        <label for="name">Nombre</label>
        <input id="name" formControlName="name" placeholder="Opcional" />
        @if (form.controls.name.invalid && form.controls.name.touched) {
          <p class="field-error" role="alert">Máximo 150 caracteres.</p>
        }

        <label for="durationValue">Duración estimada</label>
        <div class="field-group">
          <input id="durationValue" type="number" min="0" formControlName="durationValue" />
          <select formControlName="durationUnit" aria-label="Unidad de la duración estimada">
            <option value="MINUTES">Minutos</option>
            <option value="HOURS">Horas</option>
            <option value="DAYS">Días</option>
          </select>
        </div>
        <p class="hint">Se guarda internamente en minutos ({{ estimatedDurationMinutes() ?? 0 }} min).</p>
        @if (form.controls.durationValue.invalid && form.controls.durationValue.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.durationValue.hasError('required')
                ? 'La duración estimada es obligatoria.'
                : 'No puede ser negativa.'
            }}
          </p>
        }

        <label for="estimatedCost">Costo estimado</label>
        <input id="estimatedCost" type="number" min="0" step="0.01" formControlName="estimatedCost" />
        @if (form.controls.estimatedCost.invalid && form.controls.estimatedCost.touched) {
          <p class="field-error" role="alert">No puede ser negativo.</p>
        }

        <label for="priority">Prioridad</label>
        <select id="priority" formControlName="priority">
          @for (option of priorityOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>

        @if (errorMessage(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }

        @if (form.invalid && form.touched) {
          <p class="form-error" role="alert">Revisa los campos marcados en rojo antes de guardar.</p>
        }

        <div class="actions">
          <a routerLink="/logistics-routes" class="button button--ghost">Cancelar</a>
          <button type="submit" class="button button--primary" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    }
  `,
  styleUrl: './logistics-route-form.page.scss',
})
export class LogisticsRouteFormPage {
  private readonly createLogisticsRouteUseCase = inject(CreateLogisticsRouteUseCase);
  private readonly updateLogisticsRouteUseCase = inject(UpdateLogisticsRouteUseCase);
  private readonly getLogisticsRouteUseCase = inject(GetLogisticsRouteUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routeId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.routeId !== null);
  protected readonly loadingRoute = signal(this.routeId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly branches = signal<{ id: string; name: string }[]>([]);
  protected readonly priorityOptions = LOGISTICS_ROUTE_PRIORITIES;

  protected readonly form = new FormGroup<LogisticsRouteForm>(
    {
      originBranchId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      destinationBranchId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      name: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(150)] }),
      durationValue: new FormControl<number | null>(null, {
        validators: [Validators.required, Validators.min(0)],
      }),
      durationUnit: new FormControl<DurationUnit>('MINUTES', { nonNullable: true }),
      estimatedCost: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
      priority: new FormControl(0, { nonNullable: true }),
    },
    { validators: [differentBranchesValidator] },
  );

  /** Duración convertida a minutos (lo único que entiende el backend), en vivo mientras el usuario escribe. */
  protected readonly estimatedDurationMinutes = computed(() => this.durationMinutesFromForm());
  private readonly durationMinutesFromForm = signal<number | null>(null);

  constructor() {
    this.loadBranches();

    this.form.controls.durationValue.valueChanges.subscribe(() => this.recomputeDurationMinutes());
    this.form.controls.durationUnit.valueChanges.subscribe(() => this.recomputeDurationMinutes());

    // El validador de grupo solo se re-evalúa cuando cambia un control del
    // grupo: forzamos la revalidación cruzada al tocar cualquiera de los dos
    // selects, para que el error de "misma sucursal" aparezca/desaparezca
    // sin tener que tocar el otro campo.
    this.form.controls.originBranchId.valueChanges.subscribe(() =>
      this.form.controls.destinationBranchId.updateValueAndValidity({ emitEvent: false }),
    );
    this.form.controls.destinationBranchId.valueChanges.subscribe(() =>
      this.form.updateValueAndValidity({ emitEvent: false }),
    );

    if (this.routeId) {
      this.form.controls.originBranchId.disable();
      this.form.controls.destinationBranchId.disable();
      this.getLogisticsRouteUseCase
        .execute(this.routeId)
        .pipe(finalize(() => this.loadingRoute.set(false)))
        .subscribe({
          next: (route) => {
            const { value, unit } = this.splitDuration(route.estimatedDurationMinutes);
            this.form.patchValue({
              originBranchId: route.originBranchId,
              destinationBranchId: route.destinationBranchId,
              name: route.name,
              durationValue: value,
              durationUnit: unit,
              estimatedCost: route.estimatedCost,
              priority: route.priority,
            });
            this.recomputeDurationMinutes();
          },
          error: () => this.errorMessage.set('No se pudo cargar la ruta logística.'),
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
    const { originBranchId, destinationBranchId, name, estimatedCost, priority } = this.form.getRawValue();
    const estimatedDurationMinutes = this.durationMinutesFromForm()!;

    const request$ = this.routeId
      ? this.updateLogisticsRouteUseCase.execute(this.routeId, {
          name: name || undefined,
          estimatedDurationMinutes,
          estimatedCost: estimatedCost ?? undefined,
          priority,
        })
      : this.createLogisticsRouteUseCase.execute(this.authStore.currentUser()!.organizationId, {
          originBranchId,
          destinationBranchId,
          name: name || undefined,
          estimatedDurationMinutes,
          estimatedCost: estimatedCost ?? undefined,
          priority,
        });

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/logistics-routes'),
      error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo guardar la ruta logística.'),
    });
  }

  private recomputeDurationMinutes(): void {
    const { durationValue, durationUnit } = this.form.getRawValue();
    this.durationMinutesFromForm.set(
      durationValue === null ? null : Math.round(durationValue * DURATION_UNIT_MINUTES[durationUnit]),
    );
  }

  /** Minutos → {valor, unidad} legible: elige la unidad más grande que representa el valor sin decimales. */
  private splitDuration(totalMinutes: number): { value: number; unit: DurationUnit } {
    if (totalMinutes > 0 && totalMinutes % DURATION_UNIT_MINUTES.DAYS === 0) {
      return { value: totalMinutes / DURATION_UNIT_MINUTES.DAYS, unit: 'DAYS' };
    }
    if (totalMinutes > 0 && totalMinutes % DURATION_UNIT_MINUTES.HOURS === 0) {
      return { value: totalMinutes / DURATION_UNIT_MINUTES.HOURS, unit: 'HOURS' };
    }
    return { value: totalMinutes, unit: 'MINUTES' };
  }

  private loadBranches(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }
    this.searchBranchesUseCase
      // Solo sucursales activas al crear: una ruta nueva no debe poder
      // conectar una sucursal dada de baja (mismo criterio que
      // `TransferCreatePage`). En edición los selects van deshabilitados
      // (origen/destino inmutables) y son solo informativos, así que ahí sí
      // se listan todas — si no, una ruta ligada a una sucursal ya inactiva
      // mostraría el select en blanco.
      .execute(organizationId, {
        page: 0,
        size: 100,
        sortBy: 'name',
        sortDirection: 'ASC',
        active: this.isEditMode() ? undefined : true,
      })
      .subscribe((page) => this.branches.set(page.content.map(({ id, name }) => ({ id, name }))));
  }
}
