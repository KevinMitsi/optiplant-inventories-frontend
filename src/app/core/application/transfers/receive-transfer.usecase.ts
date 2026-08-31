import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { ReceiveTransferInput, Transfer } from '../../domain/models/transfer.model';

/** Confirma la recepción (RN-09): aumenta inventario de destino por lo realmente recibido; faltante abre incidencia (RN-10). */
@Injectable({ providedIn: 'root' })
export class ReceiveTransferUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string, input: ReceiveTransferInput): Observable<Transfer> {
    return this.transferRepository.receive(transferId, input);
  }
}
