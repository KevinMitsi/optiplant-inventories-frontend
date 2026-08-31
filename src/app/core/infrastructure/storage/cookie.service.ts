import { DOCUMENT } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CookieOptions {
  /** Segundos hasta la expiración. Si se omite, la cookie es de sesión de navegador. */
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Acceso a cookies seguro para SSR.
 *
 * En el navegador opera sobre `document.cookie`. En el servidor no existe
 * `document`, pero sí la petición Express entrante: Angular la expone a
 * través del token `REQUEST` (`@angular/core`, disponible durante el render
 * SSR). `get()` la lee de la cabecera `Cookie` de esa petición, así que el
 * primer render de una ruta protegida ve la sesión real del visitante en vez
 * de partir siempre de `anonymous` (limitación documentada en la Fase 1).
 *
 * `set()`/`delete()` siguen siendo no-op en el servidor: escribir cookies
 * ahí exigiría reenviarlas como `Set-Cookie` en la respuesta HTTP, y hoy solo
 * se necesita lectura (login/refresh son acciones de cliente, después de la
 * hidratación).
 */
@Injectable({ providedIn: 'root' })
export class CookieService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly request = inject(REQUEST, { optional: true });

  get(name: string): string | null {
    const header = this.isBrowser ? this.document.cookie : (this.request?.headers.get('cookie') ?? '');
    if (!header) {
      return null;
    }
    const match = header
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
