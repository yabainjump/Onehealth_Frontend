import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AppNotification } from '../models/notification.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);

  list(): Observable<AppNotification[]> {
    return this.api.get<AppNotification[]>('/notifications');
  }

  markRead(notificationId: string): Observable<{ success: boolean }> {
    return this.api.patch<{ success: boolean }, Record<string, never>>(
      `/notifications/${notificationId}/read`,
      {},
    );
  }
}

