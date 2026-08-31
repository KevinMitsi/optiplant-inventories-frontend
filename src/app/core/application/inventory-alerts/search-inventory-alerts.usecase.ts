import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryAlertRepository } from '../../domain/repositories/inventory-alert.repository';
import { InventoryAlert, InventoryAlertQuery } from '../../domain/models/inventory-alert.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchInventoryAlertsUseCase {
  private readonly inventoryAlertRepository = inject(InventoryAlertRepository);

  execute(query: InventoryAlertQuery): Observable<Page<InventoryAlert>> {
    return this.inventoryAlertRepository.search(query);
  }
}
