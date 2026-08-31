import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier } from '../../domain/models/supplier.model';

@Injectable({ providedIn: 'root' })
export class GetSupplierUseCase {
  private readonly supplierRepository = inject(SupplierRepository);

  execute(supplierId: string): Observable<Supplier> {
    return this.supplierRepository.getById(supplierId);
  }
}
