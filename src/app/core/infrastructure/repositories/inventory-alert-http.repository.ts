import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { InventoryAlertRepository } from '../../domain/repositories/inventory-alert.repository';
import { InventoryAlert, InventoryAlertQuery } from '../../domain/models/inventory-alert.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import { InventoryAlertResponseDto } from '../http/dtos/inventory-alert.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toInventoryAlert } from '../mappers/inventory-alert.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class InventoryAlertHttpRepository extends InventoryAlertRepository {
  private readonly http = inject(HttpClient);

  override search(query: InventoryAlertQuery): Observable<Page<InventoryAlert>> {
    return this.http
      .get<PageResponseDto<InventoryAlertResponseDto>>(ApiEndpoints.inventoryAlerts.search(), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toInventoryAlert)));
  }

  override dismiss(alertId: string): Observable<InventoryAlert> {
    return this.http
      .post<InventoryAlertResponseDto>(ApiEndpoints.inventoryAlerts.dismiss(alertId), {})
      .pipe(map(toInventoryAlert));
  }

  override resolve(alertId: string): Observable<InventoryAlert> {
    return this.http
      .post<InventoryAlertResponseDto>(ApiEndpoints.inventoryAlerts.resolve(alertId), {})
      .pipe(map(toInventoryAlert));
  }
}
