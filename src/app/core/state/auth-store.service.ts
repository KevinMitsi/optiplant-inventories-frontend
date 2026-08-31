import { Injectable, computed, signal } from '@angular/core';
import { Role } from '../domain/enums/role.enum';
import { User } from '../domain/models/user.model';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

/**
 * Estado de sesión en memoria, con signals (según las buenas prácticas del
 * proyecto: nada de servicios con `BehaviorSubject` para estado simple).
 *
 * `status` empieza en `'unknown'`: en el arranque de la app aún no sabemos si
 * hay una sesión válida (el access token vive en cookie, pero el usuario no
 * se guarda ahí). `AppInitializer` lo resuelve llamando a `/auth/me` una vez
 * y decide entre `'authenticated'` y `'anonymous'`. Los guards esperan a que
 * `status` deje de ser `'unknown'` antes de decidir nada.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly statusSignal = signal<AuthStatus>('unknown');

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.statusSignal() === 'authenticated');
  readonly role = computed<Role | null>(() => this.currentUserSignal()?.role ?? null);

  setAuthenticatedUser(user: User): void {
    this.currentUserSignal.set(user);
    this.statusSignal.set('authenticated');
  }

  setAnonymous(): void {
    this.currentUserSignal.set(null);
    this.statusSignal.set('anonymous');
  }
}
