import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { Branch, BranchQuery } from '../../domain/models/branch.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchBranchesUseCase {
  private readonly branchRepository = inject(BranchRepository);

  execute(organizationId: string, query: BranchQuery): Observable<Page<Branch>> {
    return this.branchRepository.search(organizationId, query);
  }
}
