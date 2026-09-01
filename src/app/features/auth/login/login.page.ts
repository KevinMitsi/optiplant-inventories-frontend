import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LoginUseCase } from '../../../core/application/auth/login.usecase';
import { ApiError } from '../../../core/domain/models/api-error.model';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-screen">
      <form class="login-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1 class="brand">OptiPlant</h1>
        <p class="subtitle">Inventario multi-sucursal</p>

        <label for="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          autocomplete="username"
          [class.invalid]="isInvalid('email')"
        />
        @if (isInvalid('email')) {
          <span class="field-error">Ingresa un correo válido.</span>
        }

        <label for="password">Contraseña</label>
        <div class="password-field">
          <input
            id="password"
            [type]="passwordVisible() ? 'text' : 'password'"
            formControlName="password"
            autocomplete="current-password"
            [class.invalid]="isInvalid('password')"
          />
          <button
            type="button"
            class="password-toggle"
            (click)="passwordVisible.set(!passwordVisible())"
            [attr.aria-label]="passwordVisible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [attr.aria-pressed]="passwordVisible()"
          >
            {{ passwordVisible() ? '🙈' : '👁️' }}
          </button>
        </div>
        @if (isInvalid('password')) {
          <span class="field-error">La contraseña es obligatoria.</span>
        }

        @if (errorMessage()) {
          <p class="form-error" role="alert">{{ errorMessage() }}</p>
        }

        <button type="submit" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>
    </div>
  `,
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);

  protected readonly form = new FormGroup<LoginForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected isInvalid(controlName: keyof LoginForm): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.loginUseCase
      .execute(this.form.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: ApiError) => {
          // Ver APIDOC.json: 401 en /auth/login no distingue correo
          // inexistente, contraseña incorrecta o cuenta deshabilitada.
          this.errorMessage.set(error.message ?? 'No se pudo iniciar sesión.');
        },
      });
  }
}
