import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ActivityLogRepository } from '../../domain/repositories/activity-log.repository';
import { ActivityLog, ActivityLogQuery } from '../../domain/models/activity-log.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import { ActivityLogResponseDto } from '../http/dtos/activity-log.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toActivityLog } from '../mappers/activity-log.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class ActivityLogHttpRepository extends ActivityLogRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: ActivityLogQuery): Observable<Page<ActivityLog>> {
    return this.http
      .get<PageResponseDto<ActivityLogResponseDto>>(ApiEndpoints.activityLogs.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toActivityLog)));
  }

  override getById(activityLogId: string): Observable<ActivityLog> {
    return this.http
      .get<ActivityLogResponseDto>(ApiEndpoints.activityLogs.byId(activityLogId))
      .pipe(map(toActivityLog));
  }
}
