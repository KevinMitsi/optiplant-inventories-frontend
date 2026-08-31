import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { Branch } from '../../domain/models/branch.model';

/**
 * Activa o desactiva una sucursal (baja lógica, nunca borrado — ver
 * APIDOC.json: el histórico de la sucursal debe seguir siendo consultable).
 * Ambas operaciones son idempotentes en el backend.
 */
@Injectable({ providedIn: 'root' })
export class SetBranchStatusUseCase {
  private readonly branchRepository = inject(BranchRepository);

  execute(branchId: string, active: boolean): Observable<Branch> {
    return active ? this.branchRepository.activate(branchId) : this.branchRepository.deactivate(branchId);
  }
}
