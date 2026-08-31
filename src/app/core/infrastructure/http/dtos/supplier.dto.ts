/** Formas de red exactas de `APIDOC.json` para proveedores. Aisladas aquí;
 * el resto de la app trabaja con `core/domain/models/supplier.model.ts`. */

export interface SupplierResponseDto {
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

export interface CreateSupplierRequestDto {
  code: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
}

export interface UpdateSupplierRequestDto {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
}
