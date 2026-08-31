import { LogisticsRoute } from '../../domain/models/logistics-route.model';
import { LogisticsRouteResponseDto } from '../http/dtos/logistics-route.dto';

export function toLogisticsRoute(dto: LogisticsRouteResponseDto): LogisticsRoute {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    originBranchId: dto.originBranchId,
    destinationBranchId: dto.destinationBranchId,
    name: dto.name,
    estimatedDurationMinutes: dto.estimatedDurationMinutes,
    estimatedCost: dto.estimatedCost,
    priority: dto.priority,
    active: dto.active,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
