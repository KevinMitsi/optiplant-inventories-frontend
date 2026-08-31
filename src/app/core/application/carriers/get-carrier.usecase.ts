import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CarrierRepository } from '../../domain/repositories/carrier.repository';
import { Carrier } from '../../domain/models/carrier.model';

@Injectable({ providedIn: 'root' })
export class GetCarrierUseCase {
  private readonly carrierRepository = inject(CarrierRepository);

  execute(carrierId: string): Observable<Carrier> {
    return this.carrierRepository.getById(carrierId);
  }
}
