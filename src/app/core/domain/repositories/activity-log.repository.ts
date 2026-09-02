import { Observable } from 'rxjs';
import { ActivityLog, ActivityLogQuery } from '../models/activity-log.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para la traza de auditoría. Solo lectura — el backend
 * la escribe solo, no hay `create`/`update` que exponer. Implementación en
 * `core/infrastructure/repositories/activity-log-http.repository.ts`.
 */
export abstract class ActivityLogRepository {
  abstract search(organizationId: string, query: ActivityLogQuery): Observable<Page<ActivityLog>>;
  abstract getById(activityLogId: string): Observable<ActivityLog>;
}
