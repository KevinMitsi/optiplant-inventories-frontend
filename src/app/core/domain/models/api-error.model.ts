/**
 * Fallo de validación en un campo concreto (ver `ValidationError` en APIDOC.json).
 */
export interface ValidationFieldError {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

/**
 * Forma estándar de error de la API (ver `ApiError` en APIDOC.json).
 * Todo error HTTP no 2xx se normaliza a esta forma en
 * `core/infrastructure/http/error.interceptor.ts`, para que las features
 * nunca tengan que leer un `HttpErrorResponse` crudo.
 */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  /** Código estable sobre el que reaccionar programáticamente (no el status HTTP). */
  code: string;
  /** Mensaje apto para mostrarse al usuario final. */
  message: string;
  path: string;
  traceId: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationFieldError[];
}

/** Error de red o de parseo, sin respuesta del servidor (timeout, offline, CORS...). */
export interface UnknownApiError {
  status: 0;
  code: 'NETWORK_ERROR';
  message: string;
}

export const isApiError = (value: unknown): value is ApiError =>
  typeof value === 'object' && value !== null && 'code' in value && 'status' in value;
