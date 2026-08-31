import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { Branch, UpdateBranchInput } from '../../domain/models/branch.model';

@Injectable({ providedIn: 'root' })
export class UpdateBranchUseCase {
  private readonly branchRepository = inject(BranchRepository);

  execute(branchId: string, input: UpdateBranchInput): Observable<Branch> {
    return this.branchRepository.update(branchId, input);
  }
}
