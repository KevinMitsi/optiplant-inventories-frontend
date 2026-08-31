import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { Transfer, TransferQuery } from '../../domain/models/transfer.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchTransfersUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(branchId: string, query: TransferQuery): Observable<Page<Transfer>> {
    return this.transferRepository.search(branchId, query);
  }
}
