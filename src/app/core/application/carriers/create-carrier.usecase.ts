import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CarrierRepository } from '../../domain/repositories/carrier.repository';
import { Carrier, CreateCarrierInput } from '../../domain/models/carrier.model';

@Injectable({ providedIn: 'root' })
export class CreateCarrierUseCase {
  private readonly carrierRepository = inject(CarrierRepository);

  execute(organizationId: string, input: CreateCarrierInput): Observable<Carrier> {
    return this.carrierRepository.create(organizationId, input);
  }
}
