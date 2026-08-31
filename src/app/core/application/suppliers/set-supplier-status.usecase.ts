import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier } from '../../domain/models/supplier.model';

/** Activa o desactiva un proveedor (baja lógica, nunca borrado). */
@Injectable({ providedIn: 'root' })
export class SetSupplierStatusUseCase {
  private readonly supplierRepository = inject(SupplierRepository);

  execute(supplierId: string, active: boolean): Observable<Supplier> {
    return active ? this.supplierRepository.activate(supplierId) : this.supplierRepository.deactivate(supplierId);
  }
}
