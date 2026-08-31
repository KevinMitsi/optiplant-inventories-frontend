import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { ApproveTransferInput, Transfer } from '../../domain/models/transfer.model';

/** Aprueba una transferencia solicitada (HU-29): comprometer stock de origen es decisión de supervisión. */
@Injectable({ providedIn: 'root' })
export class ApproveTransferUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string, input: ApproveTransferInput): Observable<Transfer> {
    return this.transferRepository.approve(transferId, input);
  }
}
