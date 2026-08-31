import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { TransferIssue } from '../../domain/models/transfer.model';

/** Todas las incidencias de las líneas de una transferencia, resueltas o no. */
@Injectable({ providedIn: 'root' })
export class ListTransferIssuesUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string): Observable<TransferIssue[]> {
    return this.transferRepository.listIssues(transferId);
  }
}
