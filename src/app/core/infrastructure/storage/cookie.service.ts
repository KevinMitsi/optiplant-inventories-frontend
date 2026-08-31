import { DOCUMENT } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CookieOptions {
  /** Segundos hasta la expiración. Si se omite, la cookie es de sesión de navegador. */
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Acceso a `document.cookie` seguro para SSR: en el servidor no existe
 * `document`, así que toda operación se vuelve un no-op fuera del navegador
 * (comprobado con `isPlatformBrowser`, tal como recomienda Angular para SSR).
 *
 * El backend devuelve los tokens en el cuerpo JSON de la respuesta (no en
 * cabeceras `Set-Cookie`), así que es el propio cliente quien debe
 * persistirlos. Por eso son cookies legibles por JavaScript y no `HttpOnly`;
 * se mitiga el riesgo de XSS marcándolas `Secure` fuera de `localhost` y
 * `SameSite=Strict` por defecto.
 */
@Injectable({ providedIn: 'root' })
export class CookieService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get(name: string): string | null {
    if (!this.isBrowser) {
      return null;
    }
    const match = this.document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${encodeURIComponent(name)}=`));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
  }

  set(name: string, value: string, options: CookieOptions = {}): void {
    if (!this.isBrowser) {
      return;
    }
    const isHttps = this.document.location.protocol === 'https:';
    const parts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      `path=${options.path ?? '/'}`,
      `SameSite=${options.sameSite ?? 'Strict'}`,
    ];
    if (options.maxAgeSeconds !== undefined) {
      parts.push(`max-age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
    }
    if (isHttps) {
      parts.push('Secure');
    }
    this.document.cookie = parts.join('; ');
  }

  delete(name: string, path = '/'): void {
    if (!this.isBrowser) {
      return;
    }
    this.document.cookie = `${encodeURIComponent(name)}=; path=${path}; max-age=0; SameSite=Strict`;
  }
}
