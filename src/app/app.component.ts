import { Component, OnInit, inject } from '@angular/core';

import { AppUpdateService } from './core/services/app-update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private readonly appUpdate = inject(AppUpdateService);

  ngOnInit(): void {
    // Mise a jour automatique de la PWA (service worker).
    this.appUpdate.init();
  }
}
