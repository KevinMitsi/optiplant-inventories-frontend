import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/models/user.model';

/**
 * Activa o desactiva una cuenta (baja lógica — el usuario sigue apareciendo
 * como responsable en el histórico de movimientos, ver APIDOC.json). El
 * backend rechaza dar de baja al último administrador activo con 422.
 */
@Injectable({ providedIn: 'root' })
export class SetUserStatusUseCase {
  private readonly userRepository = inject(UserRepository);

  execute(userId: string, active: boolean): Observable<User> {
    return active ? this.userRepository.activate(userId) : this.userRepository.deactivate(userId);
  }
}
