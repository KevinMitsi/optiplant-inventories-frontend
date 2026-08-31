import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { Transfer } from '../../domain/models/transfer.model';

@Injectable({ providedIn: 'root' })
export class GetTransferUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string): Observable<Transfer> {
    return this.transferRepository.getById(transferId);
  }
}
