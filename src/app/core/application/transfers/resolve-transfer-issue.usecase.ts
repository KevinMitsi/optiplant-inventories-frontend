import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
import { ResolveTransferIssueInput, TransferIssue } from '../../domain/models/transfer.model';

/** Resuelve una incidencia (HU-33): deja constancia de la resolución, no la ejecuta automáticamente. Si era la última pendiente, la transferencia cierra. */
@Injectable({ providedIn: 'root' })
export class ResolveTransferIssueUseCase {
  private readonly transferRepository = inject(TransferRepository);

  execute(transferId: string, issueId: string, input: ResolveTransferIssueInput): Observable<TransferIssue> {
    return this.transferRepository.resolveIssue(transferId, issueId, input);
  }
}
