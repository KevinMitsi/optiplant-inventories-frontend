import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityLogRepository } from '../../domain/repositories/activity-log.repository';
import { ActivityLog } from '../../domain/models/activity-log.model';

@Injectable({ providedIn: 'root' })
export class GetActivityLogUseCase {
  private readonly activityLogRepository = inject(ActivityLogRepository);

  execute(activityLogId: string): Observable<ActivityLog> {
    return this.activityLogRepository.getById(activityLogId);
  }
}
