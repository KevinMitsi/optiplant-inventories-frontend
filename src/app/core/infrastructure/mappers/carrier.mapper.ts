import { Carrier } from '../../domain/models/carrier.model';
import { CarrierResponseDto } from '../http/dtos/carrier.dto';

export function toCarrier(dto: CarrierResponseDto): Carrier {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    code: dto.code,
    name: dto.name,
    phone: dto.phone,
    email: dto.email,
    active: dto.active,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
