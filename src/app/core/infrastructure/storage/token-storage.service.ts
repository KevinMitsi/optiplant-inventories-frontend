import { Injectable, inject } from '@angular/core';
import { AuthSession } from '../../domain/models/auth-session.model';
import { CookieService } from './cookie.service';

const ACCESS_TOKEN_COOKIE = 'op_access_token';
const REFRESH_TOKEN_COOKIE = 'op_refresh_token';
const EXPIRES_AT_COOKIE = 'op_access_expires_at';

/**
 * Persiste los tokens de sesión en cookies (requisito del proyecto), separados
 * en dos cookies con vida distinta acorde a `AuthenticationResponse`:
 * - `op_access_token`: vive `expiresIn` segundos (por defecto 1 hora).
 * - `op_refresh_token`: vive mucho más (30 días), porque solo sirve para
 *   renovar la sesión y su filtración es menos crítica que la del access token,
 *   pero aun así se guarda con `SameSite=Strict`.
 *
 * No guarda el `User` aquí: el perfil se mantiene en memoria (`AuthStore`) y
 * se recarga con `GET /auth/me` al iniciar la aplicación, tal como el backend
 * recomienda (evita operar con un rol o sucursal que ya cambiaron).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly cookies = inject(CookieService);
  private static readonly REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

  saveSession(session: Pick<AuthSession, 'accessToken' | 'refreshToken' | 'expiresIn'>): void {
    this.cookies.set(ACCESS_TOKEN_COOKIE, session.accessToken, {
      maxAgeSeconds: session.expiresIn,
    });
    this.cookies.set(REFRESH_TOKEN_COOKIE, session.refreshToken, {
      maxAgeSeconds: TokenStorageService.REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
    const expiresAtEpochMs = Date.now() + session.expiresIn * 1000;
    this.cookies.set(EXPIRES_AT_COOKIE, String(expiresAtEpochMs), {
      maxAgeSeconds: TokenStorageService.REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
  }

  getAccessToken(): string | null {
    return this.cookies.get(ACCESS_TOKEN_COOKIE);
  }

  getRefreshToken(): string | null {
    return this.cookies.get(REFRESH_TOKEN_COOKIE);
  }

  /** true si el access token ya caducó (o no hay marca de expiración), según el reloj del cliente. */
  isAccessTokenExpired(): boolean {
    const expiresAt = this.cookies.get(EXPIRES_AT_COOKIE);
    if (!expiresAt) {
      return true;
    }
    return Date.now() >= Number(expiresAt);
  }

  clear(): void {
    this.cookies.delete(ACCESS_TOKEN_COOKIE);
    this.cookies.delete(REFRESH_TOKEN_COOKIE);
    this.cookies.delete(EXPIRES_AT_COOKIE);
  }
}
