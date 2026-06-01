import { Component, OnInit, inject } from '@angular/core';

import { AppUpdateService } from './core/services/app-update.service';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private readonly appUpdate = inject(AppUpdateService);
  // Injecte le service de langue des le demarrage pour initialiser ngx-translate
  // (charge la langue persistee et applique la traduction globalement).
  private readonly languageService = inject(LanguageService);

  ngOnInit(): void {
    // Mise a jour automatique de la PWA (service worker).
    this.appUpdate.init();
  }
}
