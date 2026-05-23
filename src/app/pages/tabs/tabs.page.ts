import { Component, ViewChild } from '@angular/core';
import { IonTabs } from '@ionic/angular';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  @ViewChild('tabs', { static: false }) tabs?: IonTabs;
  selectedTab = 'dashbord';

  setCurrentTab() {
    this.selectedTab = this.tabs?.getSelected() ?? 'dashbord';
  }
}
