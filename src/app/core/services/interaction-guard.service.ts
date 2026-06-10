import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

import { AuthService } from '../../services/auth/auth.service';
import { AuthPromptComponent } from '../../components/auth-prompt/auth-prompt.component';

/**
 * Garde d'interaction : autorise la navigation/lecture en invité, mais demande
 * de se connecter (ou créer un compte) dès qu'on tente une action protégée
 * (aimer, commenter, publier, suivre, message…).
 */
@Injectable({ providedIn: 'root' })
export class InteractionGuardService {
  private readonly auth = inject(AuthService);
  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);

  /** Renvoie true si connecté. Sinon affiche une invite et renvoie false. */
  async requireAuth(): Promise<boolean> {
    if (await this.auth.isAuthenticated()) {
      return true;
    }

    const modal = await this.modalCtrl.create({
      component: AuthPromptComponent,
      cssClass: 'auth-prompt-modal',
    });
    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'login') {
      void this.router.navigateByUrl('/login');
    } else if (role === 'register') {
      void this.router.navigateByUrl('/register');
    }
    return false;
  }
}
