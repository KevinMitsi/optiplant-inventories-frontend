import { Observable } from 'rxjs';
import {
  ApproveTransferInput,
  AssignTransferLogisticsInput,
  CreateTransferInput,
  DispatchTransferInput,
  ReceiveTransferInput,
  ResolveTransferIssueInput,
  Transfer,
  TransferIssue,
  TransferQuery,
} from '../models/transfer.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para transferencias entre sucursales. Implementación en
 * `core/infrastructure/repositories/transfer-http.repository.ts`.
 */
export abstract class TransferRepository {
  abstract search(branchId: string, query: TransferQuery): Observable<Page<Transfer>>;
  abstract create(originBranchId: string, input: CreateTransferInput): Observable<Transfer>;
  abstract getById(transferId: string): Observable<Transfer>;
  abstract approve(transferId: string, input: ApproveTransferInput): Observable<Transfer>;
  abstract startPreparation(transferId: string): Observable<Transfer>;
  abstract assignLogistics(transferId: string, input: AssignTransferLogisticsInput): Observable<Transfer>;
  abstract dispatch(transferId: string, input: DispatchTransferInput): Observable<Transfer>;
  abstract receive(transferId: string, input: ReceiveTransferInput): Observable<Transfer>;
  abstract cancel(transferId: string): Observable<Transfer>;
  abstract listIssues(transferId: string): Observable<TransferIssue[]>;
  abstract resolveIssue(
    transferId: string,
    issueId: string,
    input: ResolveTransferIssueInput,
  ): Observable<TransferIssue>;
}
