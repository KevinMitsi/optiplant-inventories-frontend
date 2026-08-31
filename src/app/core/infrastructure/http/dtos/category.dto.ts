/** Formas de red exactas de `APIDOC.json` para categorías. Aisladas aquí; el
 * resto de la app trabaja con `core/domain/models/category.model.ts`. */

export interface CategoryResponseDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequestDto {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateCategoryRequestDto {
  name: string;
  description?: string;
}
