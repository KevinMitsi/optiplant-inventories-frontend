import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { Branch, CreateBranchInput } from '../../domain/models/branch.model';

@Injectable({ providedIn: 'root' })
export class CreateBranchUseCase {
  private readonly branchRepository = inject(BranchRepository);

  execute(organizationId: string, input: CreateBranchInput): Observable<Branch> {
    return this.branchRepository.create(organizationId, input);
  }
}
