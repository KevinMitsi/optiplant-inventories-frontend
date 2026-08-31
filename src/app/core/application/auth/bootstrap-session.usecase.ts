import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';
import { AuthStore } from '../../state/auth-store.service';

/**
 * Caso de uso ejecutado una sola vez al arrancar la app (ver
 * `provideAppInitializer` en `app.config.ts`). Decide si hay una sesión
 * válida sin bloquear el primer render más de lo necesario:
 *
 * - Sin refresh token guardado: no hay sesión posible, se marca `anonymous`
 *   sin llamar a la API.
 * - Con refresh token: se pide `/auth/me`. Si el access token ya caducó, el
 *   `refreshInterceptor` lo renueva de forma transparente antes de reintentar
 *   (ver `core/infrastructure/http/refresh.interceptor.ts`). Si aun así falla
 *   (refresh token también caducado o cuenta deshabilitada), se limpia todo
 *   y se marca `anonymous`.
 */
@Injectable({ providedIn: 'root' })
export class BootstrapSessionUseCase {
  private readonly authRepository = inject(AuthRepository);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly authStore = inject(AuthStore);

  execute(): Observable<void> {
    if (!this.tokenStorage.getRefreshToken()) {
      this.authStore.setAnonymous();
      return of(void 0);
    }

    return this.authRepository.me().pipe(
      tap((user) => this.authStore.setAuthenticatedUser(user)),
      map(() => void 0),
      catchError(() => {
        this.tokenStorage.clear();
        this.authStore.setAnonymous();
        return of(void 0);
      }),
    );
  }
}
