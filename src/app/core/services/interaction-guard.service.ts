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
  private promptInProgress?: Promise<boolean>;

  /** Renvoie true si connecté. Sinon affiche une invite et renvoie false. */
  async requireAuth(): Promise<boolean> {
    if (await this.auth.isAuthenticated()) {
      return true;
    }

    // Plusieurs clics rapides sur une action protégée ne doivent pas empiler
    // plusieurs panneaux d'authentification.
    if (this.promptInProgress) {
      return this.promptInProgress;
    }

    this.promptInProgress = this.presentAuthPrompt();
    try {
      return await this.promptInProgress;
    } finally {
      this.promptInProgress = undefined;
    }
  }

  private async presentAuthPrompt(): Promise<boolean> {
    const modal = await this.modalCtrl.create({
      component: AuthPromptComponent,
      cssClass: 'auth-prompt-modal',
    });
    await modal.present();

    // Attendre la disparition complète du panneau évite qu'il reste au-dessus
    // de la page de connexion ou d'inscription pendant la navigation Ionic.
    const { role } = await modal.onDidDismiss();
    if (role === 'login') {
      await this.router.navigateByUrl('/login');
    } else if (role === 'register') {
      await this.router.navigateByUrl('/register');
    }
    return false;
  }
}
