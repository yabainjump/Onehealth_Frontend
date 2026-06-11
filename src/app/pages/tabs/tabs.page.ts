import { Component, ViewChild } from '@angular/core';
import { IonTabs } from '@ionic/angular';
import { ChromeVisibilityService } from '../../core/services/chrome-visibility.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  @ViewChild('tabs', { static: false }) tabs?: IonTabs;
  selectedTab = 'dashbord';

  constructor(readonly chrome: ChromeVisibilityService) {}

  setCurrentTab() {
    this.selectedTab = this.tabs?.getSelected() ?? 'dashbord';
  }
}
