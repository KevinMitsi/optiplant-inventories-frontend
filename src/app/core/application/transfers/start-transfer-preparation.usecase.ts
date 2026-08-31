import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { Transfer } from '../../domain/models/transfer.model';

/** Inicia la preparación de una transferencia ya aprobada. */
@Injectable({ providedIn: 'root' })
export class StartTransferPreparationUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string): Observable<Transfer> {
    return this.transferRepository.startPreparation(transferId);
  }
}
