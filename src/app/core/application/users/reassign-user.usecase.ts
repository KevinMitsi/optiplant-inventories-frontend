import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { ReassignUserInput, User } from '../../domain/models/user.model';

/**
 * Cambia rol y sucursal a la vez (APIDOC.json: van acoplados porque promover
 * a ADMIN libera la sucursal y degradar exige asignar una — permitirlos por
 * separado dejaría estados intermedios inválidos). El backend rechaza
 * degradar al último administrador activo con 422.
 */
@Injectable({ providedIn: 'root' })
export class ReassignUserUseCase {
  private readonly userRepository = inject(UserRepository);

  execute(userId: string, input: ReassignUserInput): Observable<User> {
    return this.userRepository.reassign(userId, input);
  }
}
