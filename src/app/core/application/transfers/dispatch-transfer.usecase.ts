import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { DispatchTransferInput, Transfer } from '../../domain/models/transfer.model';

/** Despacha una transferencia en preparación: descuenta inventario de origen vía TRANSFER_OUT (RN-08). */
@Injectable({ providedIn: 'root' })
export class DispatchTransferUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string, input: DispatchTransferInput): Observable<Transfer> {
    return this.transferRepository.dispatch(transferId, input);
  }
}
