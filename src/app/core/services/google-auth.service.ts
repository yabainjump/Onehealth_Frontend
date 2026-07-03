import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const google: any;

/**
 * Fine couche autour de Google Identity Services (script chargé dans
 * index.html). Rend le bouton officiel Google dans un conteneur donné et
 * résout une promesse avec l'ID token une fois l'utilisateur connecté.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private initialized = false;
  private pendingResolve: ((idToken: string) => void) | null = null;

  /** Vrai si un Client ID a été configuré (sinon le bouton ne doit pas s'afficher). */
  get isConfigured(): boolean {
    return !!environment.googleClientId;
  }

  private ensureInitialized(): boolean {
    if (this.initialized) {
      return true;
    }
    if (!this.isConfigured || typeof google === 'undefined' || !google?.accounts?.id) {
      return false;
    }
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential: string }) => {
        this.pendingResolve?.(response.credential);
        this.pendingResolve = null;
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    this.initialized = true;
    return true;
  }

  /** Rend le bouton Google officiel dans l'élément #id donné. */
  renderButton(elementId: string): void {
    if (!this.ensureInitialized()) {
      return;
    }
    const container = document.getElementById(elementId);
    if (!container) {
      return;
    }
    google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      width: container.clientWidth || 320,
      text: 'continue_with',
      logo_alignment: 'left',
    });
  }

  /** Résout avec l'ID token une fois que l'utilisateur a validé sa connexion Google. */
  waitForCredential(): Promise<string> {
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }
}
