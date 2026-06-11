import { Component, ViewChild } from '@angular/core';
import { IonTabs } from '@ionic/angular';
import { ChromeVisibilityService } from '../../core/services/chrome-visibility.service';
import { FeedSearchService } from '../../core/services/feed-search.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  @ViewChild('tabs', { static: false }) tabs?: IonTabs;
  selectedTab = 'dashbord';

  constructor(
    readonly chrome: ChromeVisibilityService,
    private readonly feedSearch: FeedSearchService,
  ) {}

  setCurrentTab() {
    this.selectedTab = this.tabs?.getSelected() ?? 'dashbord';
  }

  /** Recherche depuis la barre du haut (PC) → filtre le fil. */
  onDesktopSearch(ev: CustomEvent): void {
    const value =
      (ev as CustomEvent & { detail?: { value?: string } })?.detail?.value ?? '';
    this.feedSearch.setQuery(value);
  }
}
