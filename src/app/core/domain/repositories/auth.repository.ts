import { Observable } from 'rxjs';
import { AuthSession, Credentials } from '../models/auth-session.model';
import { User } from '../models/user.model';

/**
 * Puerto de dominio para la autenticación (Clean Architecture: la capa de
 * dominio/aplicación depende de esta abstracción, nunca de `HttpClient`
 * directamente). La implementación concreta vive en
 * `core/infrastructure/repositories/auth-http.repository.ts` y se enlaza
 * a esta clase abstracta en `app.config.ts` mediante `{ provide: AuthRepository, useClass: ... }`.
 *
 * Se usa una clase abstracta en vez de una `interface` porque las interfaces
 * de TypeScript no existen en tiempo de ejecución y no pueden usarse como
 * token de inyección de dependencias de Angular.
 */
export abstract class AuthRepository {
  abstract login(credentials: Credentials): Observable<AuthSession>;
  abstract refresh(refreshToken: string): Observable<AuthSession>;
  abstract me(): Observable<User>;
}
