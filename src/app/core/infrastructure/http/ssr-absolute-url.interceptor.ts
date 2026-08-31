import { HttpInterceptorFn } from '@angular/common/http';
import { REQUEST, inject } from '@angular/core';

/**
 * Solo se registra en `app.config.server.ts`. En producción
 * `environment.apiBaseUrl` es una URL relativa (`/api/v1`), pensada para que
 * el navegador la resuelva contra su propio origen a través de un reverse
 * proxy. `HttpClient` en Node no tiene un origen del navegador contra el
 * cual resolver rutas relativas, así que la petición fallaría con
 * "Invalid URL". Este interceptor la vuelve absoluta usando, en este orden:
 *
 * 1. `API_ORIGIN` (variable de entorno del proceso Node), para apuntar
 *    directo al backend sin pasar por el reverse proxy.
 * 2. El origen (protocolo + host) de la petición entrante (`REQUEST`), que
 *    asume que el mismo reverse proxy que atiende al navegador enruta
 *    también las llamadas SSR — coherente con que `apiBaseUrl` sea relativa.
 *
 * Se registra en un segundo `provideHttpClient` en `app.config.server.ts`,
 * lo que (por cómo `mergeApplicationConfig` concatena providers) lo deja
 * como el interceptor más cercano al backend: se ejecuta último, justo
 * antes de la petición `fetch` real, después de que auth/error-normalizer/
 * refresh ya hicieron su trabajo sobre la URL relativa original.
 */
export const ssrAbsoluteUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!/^\/(?!\/)/.test(req.url)) {
    // Ya es absoluta (incluye `environment.development.ts`, que usa
    // `http://localhost:8080/...`) o no aplica: no se toca.
    return next(req);
  }

  const request = inject(REQUEST, { optional: true });
  const origin = process.env['API_ORIGIN'] ?? (request ? new URL(request.url).origin : null);

  if (!origin) {
    return next(req);
  }

  return next(req.clone({ url: new URL(req.url, origin).toString() }));
};
