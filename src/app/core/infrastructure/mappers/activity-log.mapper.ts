import { ActivityLog, ActivityLogLevel, ActivityLogRole } from '../../domain/models/activity-log.model';
import { ActivityLogResponseDto } from '../http/dtos/activity-log.dto';

export function toActivityLog(dto: ActivityLogResponseDto): ActivityLog {
  return {
    id: dto.id,
    occurredAt: dto.occurredAt,
    username: dto.username,
    userId: dto.userId,
    organizationId: dto.organizationId,
    role: dto.role as ActivityLogRole,
    useCase: dto.useCase,
    operation: dto.operation,
    level: dto.level as ActivityLogLevel,
    systemGenerated: dto.systemGenerated,
  };
}
