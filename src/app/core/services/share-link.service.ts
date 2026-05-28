import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ShareLinkService {
  buildPostShareUrl(postId: string): string {
    const normalizedId = `${postId || ''}`.trim();
    if (!normalizedId) {
      return this.buildFallbackUrl('/welcome');
    }
    return `${this.resolveApiRoot()}/share/post/${encodeURIComponent(normalizedId)}`;
  }

  buildProfileShareUrl(userId: string): string {
    const normalizedId = `${userId || ''}`.trim();
    if (!normalizedId) {
      return this.buildFallbackUrl('/welcome');
    }
    return `${this.resolveApiRoot()}/share/profile/${encodeURIComponent(normalizedId)}`;
  }

  private resolveApiRoot(): string {
    const normalizedApiBase = `${environment.apiBaseUrl || ''}`.replace(/\/+$/, '');
    if (!normalizedApiBase) {
      return `${window.location.origin}/api`;
    }
    return normalizedApiBase.endsWith('/api')
      ? normalizedApiBase
      : `${normalizedApiBase}/api`;
  }

  private buildFallbackUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${normalizedPath}`;
  }
}
