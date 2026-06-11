import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Pilote la visibilité du « chrome » de navigation (barre d'onglets) selon le
 * défilement du fil — façon LinkedIn : on cache en scrollant vers le bas, on
 * réaffiche en scrollant vers le haut.
 *
 * Le fil (dashboard) émet l'état au scroll ; le composant `tabs` (parent) s'y
 * abonne pour masquer/afficher la barre d'onglets.
 */
@Injectable({ providedIn: 'root' })
export class ChromeVisibilityService {
  private readonly _hidden = new BehaviorSubject<boolean>(false);
  readonly hidden$ = this._hidden.asObservable();

  setHidden(hidden: boolean): void {
    if (this._hidden.value !== hidden) {
      this._hidden.next(hidden);
    }
  }

  reset(): void {
    this.setHidden(false);
  }
}
