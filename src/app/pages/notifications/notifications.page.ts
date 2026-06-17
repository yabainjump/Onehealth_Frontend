import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import {
  AppNotification,
  NotificationsService,
} from '../../core/services/notifications.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit {
  private readonly notifs = inject(NotificationsService);
  private readonly router = inject(Router);

  notifications: AppNotification[] = [];
  loading = true;

  ngOnInit(): void {
    this.notifs.list(1, 40).subscribe({
      next: (items) => {
        this.notifications = (items || []).map((n) => ({
          ...n,
          actorPhotoURL:
            resolveMediaUrl(n.actorPhotoURL) || 'assets/default-profile.png',
        }));
        this.loading = false;
        // Ouvrir la page = tout marquer comme lu (le badge tombe à 0).
        this.notifs.markAllRead();
      },
      error: () => {
        this.notifications = [];
        this.loading = false;
      },
    });
  }

  open(notification: AppNotification): void {
    if (notification.type === 'like' || notification.type === 'comment') {
      // Un like/commentaire peut concerner une alerte OU une publication.
      if (notification.alertId) {
        void this.router.navigate(['/tabs/alerts', notification.alertId]);
      } else if (notification.postId) {
        void this.router.navigate(['/post-detail'], {
          queryParams: { id: notification.postId },
        });
      }
    } else if (notification.type === 'follow' && notification.actorId) {
      void this.router.navigate(['/tabs/profils', notification.actorId]);
    } else if (notification.type === 'alert' && notification.alertId) {
      void this.router.navigate(['/tabs/alerts', notification.alertId]);
    }
  }

  trackById(_index: number, notification: AppNotification): string {
    return notification.id || String(_index);
  }
}
