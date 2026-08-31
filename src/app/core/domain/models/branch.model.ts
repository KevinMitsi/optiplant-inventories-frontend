import { PageQuery } from './page-query.model';

/** Sucursal de la organización (`BranchResponse` en APIDOC.json). */
export interface Branch {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  addressLine: string;
  city: string;
  countryCode: string;
  phone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Campo de la lista de sucursales que se ordena. */
export type BranchSortField = 'code' | 'name' | 'city' | 'active' | 'createdAt' | 'updatedAt';

/** Filtros + paginación de `GET /organizations/{organizationId}/branches`. */
export interface BranchQuery extends PageQuery {
  sortBy?: BranchSortField;
  text?: string;
  city?: string;
  active?: boolean;
}

/** Datos de alta de una sucursal (`CreateBranchRequest`). */
export interface CreateBranchInput {
  code: string;
  name: string;
  addressLine?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
}

/** Datos editables de una sucursal (`UpdateBranchRequest`): sin código ni organización. */
export interface UpdateBranchInput {
  name: string;
  addressLine?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
}
