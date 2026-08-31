import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { CreateUserInput, User } from '../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class CreateUserUseCase {
  private readonly userRepository = inject(UserRepository);

  execute(organizationId: string, input: CreateUserInput): Observable<User> {
    return this.userRepository.create(organizationId, input);
  }
}
