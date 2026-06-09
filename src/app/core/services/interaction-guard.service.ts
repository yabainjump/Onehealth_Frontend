import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../services/auth/auth.service';

/**
 * Garde d'interaction : autorise la navigation/lecture en invité, mais demande
 * de se connecter (ou créer un compte) dès qu'on tente une action protégée
 * (aimer, commenter, publier, suivre, message…).
 */
@Injectable({ providedIn: 'root' })
export class InteractionGuardService {
  private readonly auth = inject(AuthService);
  private readonly alertCtrl = inject(AlertController);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  /** Renvoie true si connecté. Sinon affiche une invite et renvoie false. */
  async requireAuth(): Promise<boolean> {
    if (await this.auth.isAuthenticated()) {
      return true;
    }

    const alert = await this.alertCtrl.create({
      header: this.translate.instant('COMMON.LOGIN_REQUIRED_TITLE'),
      message: this.translate.instant('COMMON.LOGIN_REQUIRED_TEXT'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.SIGN_IN'),
          handler: () => {
            void this.router.navigateByUrl('/login');
          },
        },
        {
          text: this.translate.instant('COMMON.SIGN_UP'),
          handler: () => {
            void this.router.navigateByUrl('/register');
          },
        },
      ],
    });
    await alert.present();
    return false;
  }
}
