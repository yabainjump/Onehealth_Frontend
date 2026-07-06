import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

/** Version des liens sociaux : l'incrementer force les robots a relire les metas. */
const SHARE_VERSION = '3';

/** Construit les liens publics du site, interceptes pour les robots par Apache. */
@Injectable({ providedIn: 'root' })
export class ShareLinkService {
  buildPostShareUrl(postId: string): string {
    const normalizedId = `${postId || ''}`.trim();
    if (!normalizedId) {
      return this.buildWebUrl('/welcome');
    }
    return this.buildWebUrl(
      `/post-detail?id=${encodeURIComponent(normalizedId)}&v=${SHARE_VERSION}`,
    );
  }

  buildProfileShareUrl(userId: string): string {
    const normalizedId = `${userId || ''}`.trim();
    if (!normalizedId) {
      return this.buildWebUrl('/welcome');
    }
    return this.buildWebUrl(
      `/profils/${encodeURIComponent(normalizedId)}?v=${SHARE_VERSION}`,
    );
  }

  // Origine web publique : configuree en priorite (indispensable dans l'app
  // native Capacitor ou window.location.origin vaut "capacitor://localhost").
  private resolveWebOrigin(): string {
    const configured = `${(environment as { publicWebUrl?: string }).publicWebUrl || ''}`
      .trim()
      .replace(/\/+$/, '');
    if (configured) {
      return configured;
    }
    return window.location.origin;
  }

  private buildWebUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.resolveWebOrigin()}${normalizedPath}`;
  }

}
