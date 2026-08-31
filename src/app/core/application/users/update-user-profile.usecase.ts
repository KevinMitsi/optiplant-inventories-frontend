import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UpdateUserProfileInput, User } from '../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class UpdateUserProfileUseCase {
  private readonly userRepository = inject(UserRepository);

  execute(userId: string, input: UpdateUserProfileInput): Observable<User> {
    return this.userRepository.updateProfile(userId, input);
  }
}
