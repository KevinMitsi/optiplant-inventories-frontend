import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateCategoryUseCase } from '../../../core/application/categories/create-category.usecase';
import { UpdateCategoryUseCase } from '../../../core/application/categories/update-category.usecase';
import { GetCategoryUseCase } from '../../../core/application/categories/get-category.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';
import { AuthStore } from '../../../core/state/auth-store.service';

interface CategoryForm {
  code: FormControl<string>;
  name: FormControl<string>;
  description: FormControl<string>;
}

/**
 * Alta/edición de categoría en un único componente, mismo patrón que
 * `BranchFormPage`: el modo lo decide la presencia de `:id` en la ruta; en
 * edición el código queda deshabilitado (es inmutable, según APIDOC.json).
 */
@Component({
  selector: 'app-category-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-form.page.html',
  styleUrl: './category-form.page.scss',
})
export class CategoryFormPage {
  private readonly createCategoryUseCase = inject(CreateCategoryUseCase);
  private readonly updateCategoryUseCase = inject(UpdateCategoryUseCase);
  private readonly getCategoryUseCase = inject(GetCategoryUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly categoryId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.categoryId !== null);
  protected readonly loadingCategory = signal(this.categoryId !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup<CategoryForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9._-]+$/)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(250)] }),
  });

  constructor() {
    if (this.categoryId) {
      this.form.controls.code.disable();
      this.getCategoryUseCase
        .execute(this.categoryId)
        .pipe(finalize(() => this.loadingCategory.set(false)))
        .subscribe({
          next: (category) =>
            this.form.patchValue({
              code: category.code,
              name: category.name,
              description: category.description,
            }),
          error: () => this.errorMessage.set('No se pudo cargar la categoría.'),
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
    const { code, name, description } = this.form.getRawValue();

    const request$ = this.categoryId
      ? this.updateCategoryUseCase.execute(this.categoryId, { name, description })
      : this.createCategoryUseCase.execute(this.authStore.currentUser()!.organizationId, {
          code,
          name,
          description,
        });

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/categories'),
      error: (error: ApiError) => this.errorMessage.set(error.message ?? 'No se pudo guardar la categoría.'),
    });
  }
}
