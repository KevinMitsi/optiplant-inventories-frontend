import { User } from './user.model';

/**
 * Credenciales de inicio de sesión (ver `LoginRequest` en APIDOC.json).
 */
export interface Credentials {
  email: string;
  password: string;
}

/**
 * Sesión autenticada: tokens de acceso/renovación y el usuario asociado
 * (ver `AuthenticationResponse` en APIDOC.json).
 *
 * `accessToken` autoriza operaciones y vive poco (segundos indicados en
 * `expiresIn`). `refreshToken` no autoriza nada, solo permite obtener un
 * `accessToken` nuevo sin volver a pedir credenciales.
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** Segundos de validez del accessToken desde el momento en que se emitió. */
  expiresIn: number;
  user: User;
}
