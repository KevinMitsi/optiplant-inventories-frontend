import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { AuthSession, Credentials } from '../../domain/models/auth-session.model';
import { User } from '../../domain/models/user.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { AuthenticationResponseDto, UserResponseDto } from '../http/dtos/auth.dto';
import { toAuthSession } from '../mappers/auth.mapper';
import { toUser } from '../mappers/user.mapper';

/**
 * Implementación HTTP del puerto `AuthRepository`. Es la única capa que
 * conoce la forma exacta de las peticiones/respuestas del backend; todo lo
 * demás en la app depende solo de la abstracción de dominio.
 */
@Injectable()
export class AuthHttpRepository extends AuthRepository {
  private readonly http = inject(HttpClient);

  override login(credentials: Credentials): Observable<AuthSession> {
    return this.http
      .post<AuthenticationResponseDto>(ApiEndpoints.auth.login(), credentials)
      .pipe(map(toAuthSession));
  }

  override refresh(refreshToken: string): Observable<AuthSession> {
    return this.http
      .post<AuthenticationResponseDto>(ApiEndpoints.auth.refresh(), { refreshToken })
      .pipe(map(toAuthSession));
  }

  override me(): Observable<User> {
    return this.http.get<UserResponseDto>(ApiEndpoints.auth.me()).pipe(map(toUser));
  }
}
