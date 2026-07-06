import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonTabs } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ChromeVisibilityService } from '../../core/services/chrome-visibility.service';
import { FeedSearchService } from '../../core/services/feed-search.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit, OnDestroy {
  @ViewChild('tabs', { static: false }) tabs?: IonTabs;
  selectedTab = 'dashbord';
  private notifTimer?: ReturnType<typeof setInterval>;
  private authSubscription?: Subscription;

  constructor(
    readonly chrome: ChromeVisibilityService,
    private readonly feedSearch: FeedSearchService,
    readonly notifs: NotificationsService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.getAuthState().subscribe((user) => {
      this.stopNotificationPolling();
      if (!user?.uid) {
        return;
      }

      void this.notifs.refreshUnread();
      this.notifTimer = setInterval(
        () => void this.notifs.refreshUnread(),
        30000,
      );
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.stopNotificationPolling();
  }

  setCurrentTab() {
    this.selectedTab = this.tabs?.getSelected() ?? 'dashbord';
    // Au changement d'onglet, on met à jour le badge (ex. après lecture).
    void this.notifs.refreshUnread();
  }

  /** Recherche depuis la barre du haut (PC) → filtre le fil. */
  onDesktopSearch(ev: CustomEvent): void {
    const value =
      (ev as CustomEvent & { detail?: { value?: string } })?.detail?.value ?? '';
    this.feedSearch.setQuery(value);
  }

  private stopNotificationPolling(): void {
    if (!this.notifTimer) {
      return;
    }
    clearInterval(this.notifTimer);
    this.notifTimer = undefined;
  }
}
