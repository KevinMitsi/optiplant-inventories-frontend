import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { Transfer } from '../../domain/models/transfer.model';

/** Cancela una transferencia, solo antes de despachar: después ya hay stock de origen comprometido. */
@Injectable({ providedIn: 'root' })
export class CancelTransferUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string): Observable<Transfer> {
    return this.transferRepository.cancel(transferId);
  }
}
