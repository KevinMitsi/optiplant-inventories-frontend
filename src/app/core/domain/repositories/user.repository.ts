import { Observable } from 'rxjs';
import {
  CreateUserInput,
  ReassignUserInput,
  UpdateUserProfileInput,
  User,
  UserQuery,
} from '../models/user.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para usuarios. Clase abstracta (no `interface`) por el
 * mismo motivo que `BranchRepository`: necesita ser un token de DI válido.
 * Implementación en `core/infrastructure/repositories/user-http.repository.ts`.
 */
export abstract class UserRepository {
  abstract search(organizationId: string, query: UserQuery): Observable<Page<User>>;
  abstract getById(userId: string): Observable<User>;
  abstract create(organizationId: string, input: CreateUserInput): Observable<User>;
  abstract updateProfile(userId: string, input: UpdateUserProfileInput): Observable<User>;
  abstract reassign(userId: string, input: ReassignUserInput): Observable<User>;
  abstract activate(userId: string): Observable<User>;
  abstract deactivate(userId: string): Observable<User>;
}
