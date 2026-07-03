import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const google: any;

/**
 * Fine couche autour de Google Identity Services (script chargé en
 * `async defer` dans index.html). Rend le bouton officiel Google dans un
 * conteneur donné et résout une promesse avec l'ID token une fois
 * l'utilisateur connecté.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;
  private pendingResolve: ((idToken: string) => void) | null = null;

  /** Vrai si un Client ID a été configuré (sinon le bouton ne doit pas s'afficher). */
  get isConfigured(): boolean {
    return !!environment.googleClientId;
  }

  private isScriptReady(): boolean {
    return typeof google !== 'undefined' && !!google?.accounts?.id;
  }

  /**
   * Attend que le script GIS (chargé en async defer) ait fini de s'exécuter.
   * Sans cette attente, le bouton ne se rend presque jamais : Angular
   * initialise la vue bien avant que le script externe soit prêt.
   */
  private waitForScript(timeoutMs = 8000): Promise<boolean> {
    if (this.isScriptReady()) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (this.isScriptReady()) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    });
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    if (!this.isConfigured) {
      return false;
    }
    if (!this.initPromise) {
      this.initPromise = this.waitForScript().then((ready) => {
        if (!ready) {
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
      });
    }
    return this.initPromise;
  }

  /** Rend le bouton Google officiel dans l'élément #id donné (attend le script si besoin). */
  async renderButton(elementId: string): Promise<void> {
    const ready = await this.ensureInitialized();
    if (!ready) {
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
