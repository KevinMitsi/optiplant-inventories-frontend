import { PageQuery } from './page-query.model';

/** Proveedor (`SupplierResponse` en APIDOC.json). */
export interface Supplier {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  taxId: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Campo de la lista de proveedores que se ordena. */
export type SupplierSortField = 'code' | 'name' | 'active' | 'createdAt' | 'updatedAt';

/** Filtros + paginación de `GET /organizations/{organizationId}/suppliers`. */
export interface SupplierQuery extends PageQuery {
  sortBy?: SupplierSortField;
  text?: string;
  active?: boolean;
}

/** Datos de alta de un proveedor (`CreateSupplierRequest`). */
export interface CreateSupplierInput {
  code: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
}

/** Datos editables de un proveedor (`UpdateSupplierRequest`): sin código. */
export interface UpdateSupplierInput {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
}
