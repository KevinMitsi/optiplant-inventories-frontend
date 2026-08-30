import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { AuthSession } from '../../domain/models/auth-session.model';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';
import { AuthStore } from '../../state/auth-store.service';

/**
 * Caso de uso: renovar la sesión a partir del refresh token guardado.
 * Lo usa `auth.interceptor.ts` cuando una petición responde 401, y
 * `bootstrap-session.usecase.ts` al arrancar la app con un access token
 * caducado pero un refresh token todavía vivo.
 */
@Injectable({ providedIn: 'root' })
export class RefreshSessionUseCase {
  private readonly authRepository = inject(AuthRepository);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly authStore = inject(AuthStore);

  execute(): Observable<AuthSession> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible.');
    }
    return this.authRepository.refresh(refreshToken).pipe(
      tap((session) => {
        this.tokenStorage.saveSession(session);
        this.authStore.setAuthenticatedUser(session.user);
      }),
    );
  }
}
