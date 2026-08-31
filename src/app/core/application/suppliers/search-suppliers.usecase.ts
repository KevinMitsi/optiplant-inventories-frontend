import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier, SupplierQuery } from '../../domain/models/supplier.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchSuppliersUseCase {
  private readonly supplierRepository = inject(SupplierRepository);

  execute(organizationId: string, query: SupplierQuery): Observable<Page<Supplier>> {
    return this.supplierRepository.search(organizationId, query);
  }
}
