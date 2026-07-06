import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

/** Construit les pages HTML de partage rendues par le backend. */
@Injectable({ providedIn: 'root' })
export class ShareLinkService {
  buildPostShareUrl(postId: string): string {
    const normalizedId = `${postId || ''}`.trim();
    if (!normalizedId) {
      return this.buildWebUrl('/welcome');
    }
    return this.buildApiUrl(`/share/post/${encodeURIComponent(normalizedId)}`);
  }

  buildProfileShareUrl(userId: string): string {
    const normalizedId = `${userId || ''}`.trim();
    if (!normalizedId) {
      return this.buildWebUrl('/welcome');
    }
    return this.buildApiUrl(`/share/profile/${encodeURIComponent(normalizedId)}`);
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

  private buildApiUrl(path: string): string {
    const apiBase = `${environment.apiBaseUrl || ''}`.trim().replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${apiBase}${normalizedPath}`;
  }
}
