import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { Branch } from '../../domain/models/branch.model';

@Injectable({ providedIn: 'root' })
export class GetBranchUseCase {
  private readonly branchRepository = inject(BranchRepository);

  execute(branchId: string): Observable<Branch> {
    return this.branchRepository.getById(branchId);
  }
}
