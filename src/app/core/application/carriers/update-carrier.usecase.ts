import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CarrierRepository } from '../../domain/repositories/carrier.repository';
import { Carrier, UpdateCarrierInput } from '../../domain/models/carrier.model';

@Injectable({ providedIn: 'root' })
export class UpdateCarrierUseCase {
  private readonly carrierRepository = inject(CarrierRepository);

  execute(carrierId: string, input: UpdateCarrierInput): Observable<Carrier> {
    return this.carrierRepository.update(carrierId, input);
  }
}
