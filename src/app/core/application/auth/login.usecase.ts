import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { AuthSession, Credentials } from '../../domain/models/auth-session.model';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';
import { AuthStore } from '../../state/auth-store.service';

/**
 * Caso de uso: iniciar sesión. Orquesta el puerto de dominio (`AuthRepository`)
 * con los efectos de infraestructura (guardar cookies) y de estado
 * (actualizar `AuthStore`), para que el componente de login no conozca
 * ninguno de esos detalles.
 */
@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private readonly authRepository = inject(AuthRepository);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly authStore = inject(AuthStore);

  execute(credentials: Credentials): Observable<AuthSession> {
    return this.authRepository.login(credentials).pipe(
      tap((session) => {
        this.tokenStorage.saveSession(session);
        this.authStore.setAuthenticatedUser(session.user);
      }),
    );
  }
}
