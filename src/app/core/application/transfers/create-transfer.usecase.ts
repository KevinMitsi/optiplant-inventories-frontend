import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { CreateTransferInput, Transfer } from '../../domain/models/transfer.model';

/** Solicita una transferencia (HU-27): el origen pide reponer stock desde otra sucursal. */
@Injectable({ providedIn: 'root' })
export class CreateTransferUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(originBranchId: string, input: CreateTransferInput): Observable<Transfer> {
    return this.transferRepository.create(originBranchId, input);
  }
}
