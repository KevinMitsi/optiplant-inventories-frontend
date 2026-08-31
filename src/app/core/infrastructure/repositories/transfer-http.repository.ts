import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { TransferRepository } from '../../domain/repositories/transfer.repository';
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
} from '../../domain/models/transfer.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import {
  ApproveTransferRequestDto,
  AssignTransferLogisticsRequestDto,
  CreateTransferRequestDto,
  DispatchTransferRequestDto,
  ReceiveTransferRequestDto,
  ResolveTransferIssueRequestDto,
  TransferIssueResponseDto,
  TransferResponseDto,
} from '../http/dtos/transfer.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toTransfer, toTransferIssue } from '../mappers/transfer.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class TransferHttpRepository extends TransferRepository {
  private readonly http = inject(HttpClient);

  override search(branchId: string, query: TransferQuery): Observable<Page<Transfer>> {
    return this.http
      .get<PageResponseDto<TransferResponseDto>>(ApiEndpoints.transfers.search(branchId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toTransfer)));
  }

  override create(originBranchId: string, input: CreateTransferInput): Observable<Transfer> {
    const body: CreateTransferRequestDto = input;
    return this.http
      .post<TransferResponseDto>(ApiEndpoints.transfers.create(originBranchId), body)
      .pipe(map(toTransfer));
  }

  override getById(transferId: string): Observable<Transfer> {
    return this.http.get<TransferResponseDto>(ApiEndpoints.transfers.byId(transferId)).pipe(map(toTransfer));
  }

  override approve(transferId: string, input: ApproveTransferInput): Observable<Transfer> {
    const body: ApproveTransferRequestDto = input;
    return this.http
      .post<TransferResponseDto>(ApiEndpoints.transfers.approve(transferId), body)
      .pipe(map(toTransfer));
  }

  override startPreparation(transferId: string): Observable<Transfer> {
    return this.http
      .post<TransferResponseDto>(ApiEndpoints.transfers.startPreparation(transferId), {})
      .pipe(map(toTransfer));
  }

  override assignLogistics(transferId: string, input: AssignTransferLogisticsInput): Observable<Transfer> {
    const body: AssignTransferLogisticsRequestDto = input;
    return this.http
      .post<TransferResponseDto>(ApiEndpoints.transfers.assignLogistics(transferId), body)
      .pipe(map(toTransfer));
  }

  override dispatch(transferId: string, input: DispatchTransferInput): Observable<Transfer> {
    const body: DispatchTransferRequestDto = input;
    return this.http
      .post<TransferResponseDto>(ApiEndpoints.transfers.dispatch(transferId), body)
      .pipe(map(toTransfer));
  }

  override receive(transferId: string, input: ReceiveTransferInput): Observable<Transfer> {
    const body: ReceiveTransferRequestDto = input;
    return this.http
      .post<TransferResponseDto>(ApiEndpoints.transfers.receive(transferId), body)
      .pipe(map(toTransfer));
  }

  override cancel(transferId: string): Observable<Transfer> {
    return this.http
      .post<TransferResponseDto>(ApiEndpoints.transfers.cancel(transferId), {})
      .pipe(map(toTransfer));
  }

  override listIssues(transferId: string): Observable<TransferIssue[]> {
    return this.http
      .get<TransferIssueResponseDto[]>(ApiEndpoints.transfers.issues(transferId))
      .pipe(map((dtos) => dtos.map(toTransferIssue)));
  }

  override resolveIssue(
    transferId: string,
    issueId: string,
    input: ResolveTransferIssueInput,
  ): Observable<TransferIssue> {
    const body: ResolveTransferIssueRequestDto = input;
    return this.http
      .post<TransferIssueResponseDto>(ApiEndpoints.transfers.resolveIssue(transferId, issueId), body)
      .pipe(map(toTransferIssue));
  }
}
