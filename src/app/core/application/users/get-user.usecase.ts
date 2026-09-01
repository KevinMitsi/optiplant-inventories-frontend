import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class GetUserUseCase {
  private readonly userRepository = inject(UserRepository);

  execute(userId: string): Observable<User> {
    return this.userRepository.getById(userId);
  }
}
