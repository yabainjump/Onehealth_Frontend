import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

type AuthPromptChoice = 'login' | 'register' | 'cancel';

/**
 * Panneau moderne (bottom-sheet) invitant un invité à se connecter ou s'inscrire
 * lorsqu'il tente une action protégée (aimer, commenter, suivre, publier…).
 * Remplace l'ancienne alerte Ionic par un composant maison plus engageant.
 */
@Component({
  selector: 'app-auth-prompt',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  templateUrl: './auth-prompt.component.html',
  styleUrls: ['./auth-prompt.component.scss'],
})
export class AuthPromptComponent {
  private readonly modalCtrl = inject(ModalController);

  choose(choice: AuthPromptChoice): void {
    void this.modalCtrl.dismiss(null, choice);
  }
}
