import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier, UpdateSupplierInput } from '../../domain/models/supplier.model';

@Injectable({ providedIn: 'root' })
export class UpdateSupplierUseCase {
  private readonly supplierRepository = inject(SupplierRepository);

  execute(supplierId: string, input: UpdateSupplierInput): Observable<Supplier> {
    return this.supplierRepository.update(supplierId, input);
  }
}
