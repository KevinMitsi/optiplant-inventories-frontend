import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import {
  CreateUserInput,
  ReassignUserInput,
  UpdateUserProfileInput,
  User,
  UserQuery,
} from '../../domain/models/user.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import { UserResponseDto } from '../http/dtos/auth.dto';
import { CreateUserRequestDto, ReassignUserRequestDto, UpdateUserProfileRequestDto } from '../http/dtos/user.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toUser } from '../mappers/user.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class UserHttpRepository extends UserRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: UserQuery): Observable<Page<User>> {
    return this.http
      .get<PageResponseDto<UserResponseDto>>(ApiEndpoints.users.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toUser)));
  }

  override getById(userId: string): Observable<User> {
    return this.http.get<UserResponseDto>(ApiEndpoints.users.byId(userId)).pipe(map(toUser));
  }

  override create(organizationId: string, input: CreateUserInput): Observable<User> {
    const body: CreateUserRequestDto = input;
    return this.http.post<UserResponseDto>(ApiEndpoints.users.create(organizationId), body).pipe(map(toUser));
  }

  override updateProfile(userId: string, input: UpdateUserProfileInput): Observable<User> {
    const body: UpdateUserProfileRequestDto = input;
    return this.http.put<UserResponseDto>(ApiEndpoints.users.profile(userId), body).pipe(map(toUser));
  }

  override reassign(userId: string, input: ReassignUserInput): Observable<User> {
    const body: ReassignUserRequestDto = input;
    return this.http.put<UserResponseDto>(ApiEndpoints.users.assignment(userId), body).pipe(map(toUser));
  }

  override activate(userId: string): Observable<User> {
    return this.http.post<UserResponseDto>(ApiEndpoints.users.activate(userId), {}).pipe(map(toUser));
  }

  override deactivate(userId: string): Observable<User> {
    return this.http.post<UserResponseDto>(ApiEndpoints.users.deactivate(userId), {}).pipe(map(toUser));
  }
}
