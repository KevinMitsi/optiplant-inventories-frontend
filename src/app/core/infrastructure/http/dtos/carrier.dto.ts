/** Formas de red exactas de `APIDOC.json` para transportistas. Aisladas
 * aquí; el resto de la app trabaja con `core/domain/models/carrier.model.ts`. */

export interface CarrierResponseDto {
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

export interface CreateCarrierRequestDto {
  code: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface UpdateCarrierRequestDto {
  name: string;
  phone?: string;
  email?: string;
}
