import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateUserUseCase } from '../../../core/application/users/create-user.usecase';
import { GetUserUseCase } from '../../../core/application/users/get-user.usecase';
import { UpdateUserProfileUseCase } from '../../../core/application/users/update-user-profile.usecase';
import { ReassignUserUseCase } from '../../../core/application/users/reassign-user.usecase';
import { SetUserStatusUseCase } from '../../../core/application/users/set-user-status.usecase';
import { SearchBranchesUseCase } from '../../../core/application/branches/search-branches.usecase';
import { User } from '../../../core/domain/models/user.model';
import { Role } from '../../../core/domain/enums/role.enum';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface CreateForm {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  role: FormControl<Role | ''>;
  branchId: FormControl<string>;
}

interface ProfileForm {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
}

interface AssignmentForm {
  role: FormControl<Role | ''>;
  branchId: FormControl<string>;
}

const ROLES_REQUIRING_BRANCH: readonly Role[] = [Role.BranchManager, Role.InventoryOperator];

/**
 * Alta/edición de usuario. A diferencia de `BranchFormPage`, edición no
 * reenvía el mismo formulario: el backend separa perfil (nombre/apellido),
 * asignación (rol+sucursal) y estado en tres operaciones distintas con sus
 * propias reglas (APIDOC.json — `updateUserProfile`, `reassignUser`,
 * `activateUser`/`deactivateUser`), así que la UI las refleja como tres
 * acciones independientes en vez de simular un único `PUT` que el backend no
 * ofrece. Correo, rol de alta y contraseña son inmutables aquí: cambiar
 * contraseña es autoservicio (`changePassword`, exige la actual) y no una
 * operación que el administrador pueda hacer por otro usuario.
 */
@Component({
  selector: 'app-user-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-form.page.html',
  styleUrl: './user-form.page.scss',
})
export class UserFormPage {
  private readonly createUserUseCase = inject(CreateUserUseCase);
  private readonly getUserUseCase = inject(GetUserUseCase);
  private readonly updateUserProfileUseCase = inject(UpdateUserProfileUseCase);
  private readonly reassignUserUseCase = inject(ReassignUserUseCase);
  private readonly setUserStatusUseCase = inject(SetUserStatusUseCase);
  private readonly searchBranchesUseCase = inject(SearchBranchesUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly userId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.userId !== null);
  protected readonly loadingUser = signal(this.userId !== null);
  protected readonly user = signal<User | null>(null);
  protected readonly branches = signal<{ id: string; name: string }[]>([]);

  protected readonly submitting = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly createErrorMessage = signal<string | null>(null);
  protected readonly loadErrorMessage = signal<string | null>(null);

  protected readonly profileBusy = signal(false);
  protected readonly profileMessage = signal<string | null>(null);
  protected readonly profileErrorMessage = signal<string | null>(null);

  protected readonly assignmentBusy = signal(false);
  protected readonly assignmentMessage = signal<string | null>(null);
  protected readonly assignmentErrorMessage = signal<string | null>(null);

  protected readonly statusBusy = signal(false);
  protected readonly statusErrorMessage = signal<string | null>(null);

  protected readonly createForm = new FormGroup<CreateForm>({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    role: new FormControl<Role | ''>('', { nonNullable: true, validators: [Validators.required] }),
    branchId: new FormControl('', { nonNullable: true }),
  });

  protected readonly profileForm = new FormGroup<ProfileForm>({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
  });

  protected readonly assignmentForm = new FormGroup<AssignmentForm>({
    role: new FormControl<Role | ''>('', { nonNullable: true, validators: [Validators.required] }),
    branchId: new FormControl('', { nonNullable: true }),
  });

  private readonly createRole = signal<Role | ''>('');
  protected readonly createRequiresBranch = computed(() =>
    ROLES_REQUIRING_BRANCH.includes(this.createRole() as Role),
  );

  private readonly assignmentRole = signal<Role | ''>('');
  protected readonly assignmentRequiresBranch = computed(() =>
    ROLES_REQUIRING_BRANCH.includes(this.assignmentRole() as Role),
  );

  constructor() {
    this.loadBranches();

    // El select de sucursal solo es obligatorio para roles que operan en una
    // (RN-13): sincronizamos el validador con el rol elegido en cada momento
    // en vez de dejarlo siempre requerido u opcional.
    this.createForm.controls.role.valueChanges.pipe(takeUntilDestroyed()).subscribe((role) => {
      this.createRole.set(role);
      this.syncBranchValidator(this.createForm.controls.branchId, ROLES_REQUIRING_BRANCH.includes(role as Role));
    });
    this.assignmentForm.controls.role.valueChanges.pipe(takeUntilDestroyed()).subscribe((role) => {
      this.assignmentRole.set(role);
      this.syncBranchValidator(this.assignmentForm.controls.branchId, ROLES_REQUIRING_BRANCH.includes(role as Role));
    });

    if (this.userId) {
      this.loadUser(this.userId);
    }
  }

  protected submitCreate(): void {
    if (this.createForm.invalid || this.submitting()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    const { firstName, lastName, email, password, role, branchId } = this.createForm.getRawValue();
    this.submitting.set(true);
    this.createErrorMessage.set(null);

    this.createUserUseCase
      .execute(organizationId, {
        firstName,
        lastName,
        email,
        password,
        role: role as Role,
        branchId: branchId || undefined,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/users'),
        error: (error: ApiError) => this.createErrorMessage.set(error.message ?? 'No se pudo crear el usuario.'),
      });
  }

  protected submitProfile(userId: string): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileBusy.set(true);
    this.profileMessage.set(null);
    this.profileErrorMessage.set(null);
    this.updateUserProfileUseCase
      .execute(userId, this.profileForm.getRawValue())
      .pipe(finalize(() => this.profileBusy.set(false)))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.profileMessage.set('Datos personales guardados.');
        },
        error: (error: ApiError) =>
          this.profileErrorMessage.set(error.message ?? 'No se pudieron guardar los datos personales.'),
      });
  }

  protected submitAssignment(userId: string): void {
    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }

    const { role, branchId } = this.assignmentForm.getRawValue();
    this.assignmentBusy.set(true);
    this.assignmentMessage.set(null);
    this.assignmentErrorMessage.set(null);
    this.reassignUserUseCase
      .execute(userId, { role: role as Role, branchId: branchId || undefined })
      .pipe(finalize(() => this.assignmentBusy.set(false)))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.assignmentMessage.set('Rol y sucursal actualizados.');
        },
        error: (error: ApiError) =>
          this.assignmentErrorMessage.set(error.message ?? 'No se pudo reasignar al usuario.'),
      });
  }

  protected toggleStatus(user: User): void {
    this.statusBusy.set(true);
    this.statusErrorMessage.set(null);
    this.setUserStatusUseCase
      .execute(user.id, !user.active)
      .pipe(finalize(() => this.statusBusy.set(false)))
      .subscribe({
        next: (updated) => this.user.set(updated),
        error: (error: ApiError) =>
          this.statusErrorMessage.set(error.message ?? 'No se pudo cambiar el estado de la cuenta.'),
      });
  }

  private syncBranchValidator(control: FormControl<string>, required: boolean): void {
    control.setValidators(required ? [Validators.required] : []);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private loadUser(userId: string): void {
    this.getUserUseCase
      .execute(userId)
      .pipe(finalize(() => this.loadingUser.set(false)))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.profileForm.patchValue({ firstName: user.firstName, lastName: user.lastName });
          this.assignmentForm.controls.role.setValue(user.role, { emitEvent: false });
          this.assignmentRole.set(user.role);
          this.syncBranchValidator(
            this.assignmentForm.controls.branchId,
            ROLES_REQUIRING_BRANCH.includes(user.role),
          );
          this.assignmentForm.controls.branchId.setValue(user.branchId ?? '', { emitEvent: false });
        },
        error: () => this.loadErrorMessage.set('No se pudo cargar el usuario.'),
      });
  }

  private loadBranches(): void {
    const organizationId = this.authStore.currentUser()?.organizationId;
    if (!organizationId) {
      return;
    }

    this.searchBranchesUseCase
      .execute(organizationId, { size: 100, sortBy: 'name', sortDirection: 'ASC', active: true })
      .subscribe((page) => this.branches.set(page.content.map(({ id, name }) => ({ id, name }))));
  }
}
