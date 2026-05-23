import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import {
  AppLanguage,
  LanguageService,
} from '../../core/services/language.service';

interface PillarItem {
  icon: string;
  title: string;
  description: string;
}

interface WelcomeContent {
  badge: string;
  title: string;
  subtitle: string;
  joinNetwork: string;
  learnMore: string;
  pillarsTitle: string;
  impactTitle: string;
  impactText: string;
  members: string;
  countries: string;
  loginCta: string;
  pillars: PillarItem[];
}

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: false,
})
export class WelcomePage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);

  private readonly contentByLanguage: Record<AppLanguage, WelcomeContent> = {
    fr: {
      badge: 'Plateforme Reseau Global',
      title: 'Connecter le monde pour une sante unique',
      subtitle:
        'La plateforme mondiale pour les professionnels de la sante humaine, animale et environnementale.',
      joinNetwork: 'Rejoindre le Reseau',
      learnMore: 'En savoir plus',
      pillarsTitle: 'Les Trois Piliers',
      impactTitle: "Rejoignez une communaute d'impact",
      impactText:
        'Plus de 50 000 experts a travers 120 pays utilisent deja One Health Network pour partager des donnees vitales et coordonner des interventions rapides.',
      members: 'Membres',
      countries: 'Pays',
      loginCta: "J'ai deja un compte, me connecter",
      pillars: [
        {
          icon: 'person-outline',
          title: 'Sante Humaine',
          description:
            'Medecins, chercheurs et experts en sante publique collaborant pour prevenir les zoonoses.',
        },
        {
          icon: 'paw-outline',
          title: 'Sante Animale',
          description:
            'Veterinaires et specialistes de la faune assurant la surveillance des maladies animales.',
        },
        {
          icon: 'leaf-outline',
          title: 'Environnement',
          description:
            "Ecologistes et climatologues etudiant l'impact des changements environnementaux sur la sante globale.",
        },
      ],
    },
    en: {
      badge: 'Global Network Platform',
      title: 'Connecting the world for one health',
      subtitle:
        'A global platform for human, animal and environmental health professionals.',
      joinNetwork: 'Join the Network',
      learnMore: 'Learn more',
      pillarsTitle: 'The Three Pillars',
      impactTitle: 'Join an impact community',
      impactText:
        'More than 50,000 experts across 120 countries already use One Health Network to share vital data and coordinate rapid interventions.',
      members: 'Members',
      countries: 'Countries',
      loginCta: 'I already have an account, sign in',
      pillars: [
        {
          icon: 'person-outline',
          title: 'Human Health',
          description:
            'Doctors, researchers and public health experts collaborate to prevent zoonotic risks.',
        },
        {
          icon: 'paw-outline',
          title: 'Animal Health',
          description:
            'Veterinarians and wildlife specialists monitor and prevent animal diseases.',
        },
        {
          icon: 'leaf-outline',
          title: 'Environment',
          description:
            'Ecologists and climate experts study how environmental change affects global health.',
        },
      ],
    },
  };

  get currentLanguage(): AppLanguage {
    return this.languageService.getCurrentLanguage();
  }

  get content(): WelcomeContent {
    return this.contentByLanguage[this.currentLanguage];
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

  async ionViewWillEnter(): Promise<void> {
    const isAuthenticated = await this.authService.isAuthenticated();
    if (isAuthenticated) {
      await this.router.navigateByUrl('/tabs/dashbord', { replaceUrl: true });
    }
  }

  navigateToLogin() {
    const active = document.activeElement as HTMLElement | null;
    active?.blur();
    void this.router.navigateByUrl('/login');
  }

  navigateToSignup() {
    const active = document.activeElement as HTMLElement | null;
    active?.blur();
    void this.router.navigateByUrl('/register');
  }

  scrollToPillars() {
    const target = document.getElementById('pillars');
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  trackByPillarTitle(_: number, pillar: PillarItem): string {
    return pillar.title;
  }
}
