import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

/**
 * Construit les liens de partage : ce sont des URLs du FRONTEND (jolies,
 * memorisables), jamais du backend.
 *
 * Aperçus sociaux : les robots (WhatsApp, Facebook, X, LinkedIn…) n'executent
 * pas le JavaScript d'Angular. Le `.htaccess` du frontend les detecte via leur
 * User-Agent et les redirige vers `/api/share/...` du backend, qui rend les
 * balises Open Graph (titre, description, image du post). Les humains, eux,
 * arrivent directement sur l'application.
 */
@Injectable({ providedIn: 'root' })
export class ShareLinkService {
  buildPostShareUrl(postId: string): string {
    const normalizedId = `${postId || ''}`.trim();
    if (!normalizedId) {
      return this.buildWebUrl('/welcome');
    }
    return this.buildWebUrl(`/post-detail?id=${encodeURIComponent(normalizedId)}`);
  }

  buildProfileShareUrl(userId: string): string {
    const normalizedId = `${userId || ''}`.trim();
    if (!normalizedId) {
      return this.buildWebUrl('/welcome');
    }
    return this.buildWebUrl(`/profils/${encodeURIComponent(normalizedId)}`);
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
