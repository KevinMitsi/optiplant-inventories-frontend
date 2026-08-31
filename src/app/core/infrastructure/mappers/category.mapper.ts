import { Category } from '../../domain/models/category.model';
import { CategoryResponseDto } from '../http/dtos/category.dto';

export function toCategory(dto: CategoryResponseDto): Category {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    active: dto.active,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
