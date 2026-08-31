import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier, CreateSupplierInput } from '../../domain/models/supplier.model';

@Injectable({ providedIn: 'root' })
export class CreateSupplierUseCase {
  private readonly supplierRepository = inject(SupplierRepository);

  execute(organizationId: string, input: CreateSupplierInput): Observable<Supplier> {
    return this.supplierRepository.create(organizationId, input);
  }
}
