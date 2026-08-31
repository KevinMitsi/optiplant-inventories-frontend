import { PageQuery } from './page-query.model';

/** Transportista (`CarrierResponse` en APIDOC.json). */
export interface Carrier {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Campo de la lista de transportistas que se ordena. */
export type CarrierSortField = 'code' | 'name' | 'active' | 'createdAt' | 'updatedAt';

/** Filtros + paginación de `GET /organizations/{organizationId}/carriers`. */
export interface CarrierQuery extends PageQuery {
  sortBy?: CarrierSortField;
  text?: string;
  active?: boolean;
}

/** Datos de alta de un transportista (`CreateCarrierRequest`). */
export interface CreateCarrierInput {
  code: string;
  name: string;
  phone?: string;
  email?: string;
}

/** Datos editables de un transportista (`UpdateCarrierRequest`): sin código. */
export interface UpdateCarrierInput {
  name: string;
  phone?: string;
  email?: string;
}
