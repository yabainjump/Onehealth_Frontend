import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonTabs } from '@ionic/angular';
import { ChromeVisibilityService } from '../../core/services/chrome-visibility.service';
import { FeedSearchService } from '../../core/services/feed-search.service';
import { NotificationsService } from '../../core/services/notifications.service';

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

  constructor(
    readonly chrome: ChromeVisibilityService,
    private readonly feedSearch: FeedSearchService,
    readonly notifs: NotificationsService,
  ) {}

  ngOnInit(): void {
    this.notifs.refreshUnread();
    // Rafraîchit le compteur de notifications non lues régulièrement.
    this.notifTimer = setInterval(() => this.notifs.refreshUnread(), 30000);
  }

  ngOnDestroy(): void {
    if (this.notifTimer) {
      clearInterval(this.notifTimer);
    }
  }

  setCurrentTab() {
    this.selectedTab = this.tabs?.getSelected() ?? 'dashbord';
    // Au changement d'onglet, on met à jour le badge (ex. après lecture).
    this.notifs.refreshUnread();
  }

  /** Recherche depuis la barre du haut (PC) → filtre le fil. */
  onDesktopSearch(ev: CustomEvent): void {
    const value =
      (ev as CustomEvent & { detail?: { value?: string } })?.detail?.value ?? '';
    this.feedSearch.setQuery(value);
  }
}
