import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateLogisticsRouteUseCase } from '../../../core/application/logistics-routes/create-logistics-route.usecase';
import { UpdateLogisticsRouteUseCase } from '../../../core/application/logistics-routes/update-logistics-route.usecase';
import { GetLogisticsRouteUseCase } from '../../../core/application/logistics-routes/get-logistics-route.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface LogisticsRouteForm {
  originBranchId: FormControl<string>;
  destinationBranchId: FormControl<string>;
  name: FormControl<string>;
  estimatedDurationMinutes: FormControl<number | null>;
  estimatedCost: FormControl<number | null>;
  priority: FormControl<number | null>;
}

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
        }

        <label for="name">Nombre</label>
        <input id="name" formControlName="name" placeholder="Opcional" />
        @if (form.controls.name.invalid && form.controls.name.touched) {
          <p class="field-error" role="alert">Máximo 150 caracteres.</p>
        }

        <label for="estimatedDurationMinutes">Duración estimada (min)</label>
        <input id="estimatedDurationMinutes" type="number" min="0" formControlName="estimatedDurationMinutes" />
        @if (form.controls.estimatedDurationMinutes.invalid && form.controls.estimatedDurationMinutes.touched) {
          <p class="field-error" role="alert">
            {{
              form.controls.estimatedDurationMinutes.hasError('required')
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
        <input id="priority" type="number" formControlName="priority" />

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

  protected readonly form = new FormGroup<LogisticsRouteForm>({
    originBranchId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    destinationBranchId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(150)] }),
    estimatedDurationMinutes: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    estimatedCost: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    priority: new FormControl<number | null>(0),
  });

  constructor() {
    this.loadBranches();

    if (this.routeId) {
      this.form.controls.originBranchId.disable();
      this.form.controls.destinationBranchId.disable();
      this.getLogisticsRouteUseCase
        .execute(this.routeId)
        .pipe(finalize(() => this.loadingRoute.set(false)))
        .subscribe({
          next: (route) =>
            this.form.patchValue({
              originBranchId: route.originBranchId,
              destinationBranchId: route.destinationBranchId,
              name: route.name,
              estimatedDurationMinutes: route.estimatedDurationMinutes,
              estimatedCost: route.estimatedCost,
              priority: route.priority,
            }),
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
    const { originBranchId, destinationBranchId, name, estimatedDurationMinutes, estimatedCost, priority } =
      this.form.getRawValue();

    const request$ = this.routeId
      ? this.updateLogisticsRouteUseCase.execute(this.routeId, {
          name: name || undefined,
          estimatedDurationMinutes: estimatedDurationMinutes!,
          estimatedCost: estimatedCost ?? undefined,
          priority: priority ?? undefined,
        })
      : this.createLogisticsRouteUseCase.execute(this.authStore.currentUser()!.organizationId, {
          originBranchId,
          destinationBranchId,
          name: name || undefined,
          estimatedDurationMinutes: estimatedDurationMinutes!,
          estimatedCost: estimatedCost ?? undefined,
          priority: priority ?? undefined,
        });

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/logistics-routes'),
      error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo guardar la ruta logística.'),
    });
  }

  private loadBranches(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }
    this.searchBranchesUseCase
      .execute(organizationId, { page: 0, size: 100, sortBy: 'name', sortDirection: 'ASC' })
      .subscribe((page) => this.branches.set(page.content.map(({ id, name }) => ({ id, name }))));
  }
}
