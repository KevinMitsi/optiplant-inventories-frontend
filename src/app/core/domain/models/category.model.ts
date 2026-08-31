import { PageQuery } from './page-query.model';

/** Categoría del catálogo (`CategoryResponse` en APIDOC.json). */
export interface Category {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Campo de la lista de categorías que se ordena. */
export type CategorySortField = 'code' | 'name' | 'active' | 'createdAt' | 'updatedAt';

/** Filtros + paginación de `GET /organizations/{organizationId}/categories`. */
export interface CategoryQuery extends PageQuery {
  sortBy?: CategorySortField;
  text?: string;
  active?: boolean;
}

/** Datos de alta de una categoría (`CreateCategoryRequest`). */
export interface CreateCategoryInput {
  code: string;
  name: string;
  description?: string;
}

/** Datos editables de una categoría (`UpdateCategoryRequest`): sin código. */
export interface UpdateCategoryInput {
  name: string;
  description?: string;
}
