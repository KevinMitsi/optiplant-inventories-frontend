import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityLogRepository } from '../../domain/repositories/activity-log.repository';
import { ActivityLog, ActivityLogQuery } from '../../domain/models/activity-log.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchActivityLogsUseCase {
  private readonly activityLogRepository = inject(ActivityLogRepository);

  execute(organizationId: string, query: ActivityLogQuery): Observable<Page<ActivityLog>> {
    return this.activityLogRepository.search(organizationId, query);
  }
}
