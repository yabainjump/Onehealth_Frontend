import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Recherche du fil partagée entre la barre de navigation PC (en haut) et le fil
 * d'accueil. La barre PC écrit la requête ; le fil s'y abonne pour filtrer.
 * Sur mobile, le fil garde sa propre barre de recherche (la nav PC est masquée).
 */
@Injectable({ providedIn: 'root' })
export class FeedSearchService {
  private readonly _query = new BehaviorSubject<string>('');
  readonly query$ = this._query.asObservable();

  setQuery(query: string): void {
    this._query.next(query ?? '');
  }
}
