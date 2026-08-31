import { Observable } from 'rxjs';
import { Carrier, CarrierQuery, CreateCarrierInput, UpdateCarrierInput } from '../models/carrier.model';
import { Page } from '../models/page.model';

/** Puerto de dominio para transportistas. Mismo patrón que `BranchRepository`. */
export abstract class CarrierRepository {
  abstract search(organizationId: string, query: CarrierQuery): Observable<Page<Carrier>>;
  abstract getById(carrierId: string): Observable<Carrier>;
  abstract create(organizationId: string, input: CreateCarrierInput): Observable<Carrier>;
  abstract update(carrierId: string, input: UpdateCarrierInput): Observable<Carrier>;
  abstract activate(carrierId: string): Observable<Carrier>;
  abstract deactivate(carrierId: string): Observable<Carrier>;
}
