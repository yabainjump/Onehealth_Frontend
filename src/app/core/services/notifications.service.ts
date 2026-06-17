import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';

export type AppNotificationType = 'like' | 'comment' | 'follow' | 'alert';

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  actorId: string;
  actorName: string;
  actorPhotoURL: string;
  postId: string | null;
  alertId: string | null;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);

  private readonly _unread = new BehaviorSubject<number>(0);
  /** Nombre de notifications non lues (pour le badge). */
  readonly unread$ = this._unread.asObservable();

  list(page = 1, limit = 40): Observable<AppNotification[]> {
    return this.api.get<AppNotification[]>(
      `/notifications?page=${page}&limit=${limit}`,
    );
  }

  /** Rafraîchit le compteur de non-lues (silencieux en cas d'erreur). */
  refreshUnread(): void {
    this.api.get<{ count: number }>('/notifications/unread-count').subscribe({
      next: (res) => this._unread.next(res?.count || 0),
      error: () => {
        /* silencieux : invité / hors-ligne */
      },
    });
  }

  /** Marque tout comme lu et remet le badge à zéro. */
  markAllRead(): void {
    this._unread.next(0);
    this.api
      .patch<{ success: boolean }, Record<string, never>>(
        '/notifications/read',
        {},
      )
      .subscribe({ next: () => {}, error: () => {} });
  }
}
