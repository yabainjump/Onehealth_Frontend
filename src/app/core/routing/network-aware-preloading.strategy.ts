import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

type NetworkInformationLike = {
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
};

@Injectable({ providedIn: 'root' })
export class NetworkAwarePreloadingStrategy implements PreloadingStrategy {
  private readonly connection: NetworkInformationLike | undefined =
    typeof navigator !== 'undefined'
      ? ((navigator as Navigator & { connection?: NetworkInformationLike })
          .connection ?? undefined)
      : undefined;

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const flaggedForPreload = route.data?.['preload'] === true;
    if (!flaggedForPreload || this.isLowBandwidthMode()) {
      return of(null);
    }

    return load();
  }

  private isLowBandwidthMode(): boolean {
    if (!this.connection) {
      return false;
    }

    if (this.connection.saveData) {
      return true;
    }

    const effectiveType = `${this.connection.effectiveType || ''}`.toLowerCase();
    if (effectiveType.includes('2g')) {
      return true;
    }

    return typeof this.connection.downlink === 'number'
      ? this.connection.downlink < 1.5
      : false;
  }
}
