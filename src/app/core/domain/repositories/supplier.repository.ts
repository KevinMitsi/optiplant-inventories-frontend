import { Observable } from 'rxjs';
import { Supplier, SupplierQuery, CreateSupplierInput, UpdateSupplierInput } from '../models/supplier.model';
import { Page } from '../models/page.model';

/** Puerto de dominio para proveedores. Mismo patrón que `BranchRepository`. */
export abstract class SupplierRepository {
  abstract search(organizationId: string, query: SupplierQuery): Observable<Page<Supplier>>;
  abstract getById(supplierId: string): Observable<Supplier>;
  abstract create(organizationId: string, input: CreateSupplierInput): Observable<Supplier>;
  abstract update(supplierId: string, input: UpdateSupplierInput): Observable<Supplier>;
  abstract activate(supplierId: string): Observable<Supplier>;
  abstract deactivate(supplierId: string): Observable<Supplier>;
}
