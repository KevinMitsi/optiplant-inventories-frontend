import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CarrierRepository } from '../../domain/repositories/carrier.repository';
import { Carrier } from '../../domain/models/carrier.model';

/** Activa o desactiva un transportista (baja lógica, nunca borrado). */
@Injectable({ providedIn: 'root' })
export class SetCarrierStatusUseCase {
  private readonly carrierRepository = inject(CarrierRepository);

  execute(carrierId: string, active: boolean): Observable<Carrier> {
    return active ? this.carrierRepository.activate(carrierId) : this.carrierRepository.deactivate(carrierId);
  }
}
