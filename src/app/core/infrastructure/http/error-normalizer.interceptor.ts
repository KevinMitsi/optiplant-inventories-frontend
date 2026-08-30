import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError, UnknownApiError, isApiError } from '../../domain/models/api-error.model';

/**
 * Normaliza cualquier error HTTP a `ApiError` (cuando el backend respondió
 * con el cuerpo documentado en APIDOC.json) o a `UnknownApiError` (fallo de
 * red, CORS, timeout...). A partir de aquí, ninguna feature necesita leer un
 * `HttpErrorResponse` crudo ni comprobar `error.error.code` a mano.
 *
 * Se registra más "afuera" que `refreshInterceptor`, así que solo normaliza
 * errores que ya agotaron el reintento de renovación de sesión.
 */
export const errorNormalizerInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 0 || !isApiError(error.error)) {
        const unknown: UnknownApiError = {
          status: 0,
          code: 'NETWORK_ERROR',
          message: 'No se pudo contactar con el servidor. Verifica tu conexión.',
        };
        return throwError(() => unknown);
      }

      const apiError: ApiError = error.error;
      return throwError(() => apiError);
    }),
  );
