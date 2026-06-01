import { ApplicationRef, Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { concat, interval } from 'rxjs';
import { filter, first } from 'rxjs/operators';

/**
 * Met l'application a jour automatiquement (PWA / service worker).
 *
 * - Verifie les mises a jour : une fois l'app stable, puis periodiquement,
 *   et a chaque fois que l'onglet redevient visible.
 * - Des qu'une nouvelle version est prete, l'active et recharge la page
 *   -> l'utilisateur a toujours la derniere version, sans desinscription manuelle.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private static readonly CHECK_INTERVAL_MS = 60_000; // 1 minute

  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  private reloading = false;

  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // 1) Nouvelle version disponible -> activation + rechargement.
    this.swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
      )
      .subscribe(() => this.activateAndReload());

    // 2) Service worker dans un etat irrecuperable -> rechargement propre.
    this.swUpdate.unrecoverable.subscribe(() => this.reload());

    // 3) Verification des mises a jour : apres stabilisation, puis chaque minute.
    const appIsStable$ = this.appRef.isStable.pipe(first((stable) => stable === true));
    concat(appIsStable$, interval(AppUpdateService.CHECK_INTERVAL_MS)).subscribe(() => {
      void this.swUpdate.checkForUpdate().catch(() => undefined);
    });

    // 4) Verifie aussi des que l'utilisateur revient sur l'onglet.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.swUpdate.checkForUpdate().catch(() => undefined);
      }
    });
  }

  private activateAndReload(): void {
    void this.swUpdate
      .activateUpdate()
      .then(() => this.reload())
      .catch(() => undefined);
  }

  private reload(): void {
    if (this.reloading) {
      return;
    }
    this.reloading = true;
    document.location.reload();
  }
}
