import { Branch } from '../../domain/models/branch.model';
import { BranchResponseDto } from '../http/dtos/branch.dto';

export function toBranch(dto: BranchResponseDto): Branch {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    code: dto.code,
    name: dto.name,
    addressLine: dto.addressLine,
    city: dto.city,
    countryCode: dto.countryCode,
    phone: dto.phone,
    active: dto.active,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
