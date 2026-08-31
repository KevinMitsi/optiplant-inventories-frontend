import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CarrierRepository } from '../../domain/repositories/carrier.repository';
import { Carrier, CarrierQuery } from '../../domain/models/carrier.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchCarriersUseCase {
  private readonly carrierRepository = inject(CarrierRepository);

  execute(organizationId: string, query: CarrierQuery): Observable<Page<Carrier>> {
    return this.carrierRepository.search(organizationId, query);
  }
}
