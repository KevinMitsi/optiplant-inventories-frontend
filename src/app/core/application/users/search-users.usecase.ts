import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User, UserQuery } from '../../domain/models/user.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchUsersUseCase {
  private readonly userRepository = inject(UserRepository);

  execute(organizationId: string, query: UserQuery): Observable<Page<User>> {
    return this.userRepository.search(organizationId, query);
  }
}
