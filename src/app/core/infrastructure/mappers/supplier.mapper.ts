import { Supplier } from '../../domain/models/supplier.model';
import { SupplierResponseDto } from '../http/dtos/supplier.dto';

export function toSupplier(dto: SupplierResponseDto): Supplier {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    code: dto.code,
    name: dto.name,
    taxId: dto.taxId,
    email: dto.email,
    phone: dto.phone,
    active: dto.active,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
