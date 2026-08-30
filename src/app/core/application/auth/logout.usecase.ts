import { Injectable, inject } from '@angular/core';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';
import { AuthStore } from '../../state/auth-store.service';

/**
 * Caso de uso: cerrar sesión. Puramente local (la API no expone un endpoint
 * de logout: el `refreshToken` no puede revocarse del lado servidor según
 * APIDOC.json), así que basta con borrar las cookies y el estado en memoria.
 */
@Injectable({ providedIn: 'root' })
export class LogoutUseCase {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly authStore = inject(AuthStore);

  execute(): void {
    this.tokenStorage.clear();
    this.authStore.setAnonymous();
  }
}
