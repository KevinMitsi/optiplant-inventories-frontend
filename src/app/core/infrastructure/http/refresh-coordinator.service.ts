import { Injectable, inject } from '@angular/core';
import { Observable, finalize, share } from 'rxjs';
import { RefreshSessionUseCase } from '../../application/auth/refresh-session.usecase';
import { AuthSession } from '../../domain/models/auth-session.model';

/**
 * Evita renovaciones concurrentes: si varias peticiones reciben 401 a la vez,
 * todas comparten la misma llamada a `/auth/refresh` en lugar de disparar una
 * por cada una (lo que además invalidaría el refresh token usado por las
 * demás, ya que el backend no garantiza que dos renovaciones simultáneas con
 * el mismo token sean idempotentes).
 */
@Injectable({ providedIn: 'root' })
export class RefreshCoordinatorService {
  private readonly refreshSession = inject(RefreshSessionUseCase);
  private inFlight$: Observable<AuthSession> | null = null;

  refresh(): Observable<AuthSession> {
    if (!this.inFlight$) {
      this.inFlight$ = this.refreshSession.execute().pipe(
        share(),
        finalize(() => {
          this.inFlight$ = null;
        }),
      );
    }
    return this.inFlight$;
  }
}
