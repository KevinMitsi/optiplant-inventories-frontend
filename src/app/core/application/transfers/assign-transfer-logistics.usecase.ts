import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { AssignTransferLogisticsInput, Transfer } from '../../domain/models/transfer.model';

/** Asigna transportista y ruta, solo antes de despachar; la ruta debe conectar origen y destino. */
@Injectable({ providedIn: 'root' })
export class AssignTransferLogisticsUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string, input: AssignTransferLogisticsInput): Observable<Transfer> {
    return this.transferRepository.assignLogistics(transferId, input);
  }
}
