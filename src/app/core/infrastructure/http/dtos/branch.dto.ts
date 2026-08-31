/** Formas de red exactas de `APIDOC.json` para sucursales. Aisladas aquí; el
 * resto de la app trabaja con `core/domain/models/branch.model.ts`. */

export interface BranchResponseDto {
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

export interface CreateBranchRequestDto {
  code: string;
  name: string;
  addressLine?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
}

export interface UpdateBranchRequestDto {
  name: string;
  addressLine?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
}
