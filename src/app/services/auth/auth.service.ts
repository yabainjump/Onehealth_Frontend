import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService as CoreApiService } from '../../core/services/api.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

type LegacyUser = {
  uid: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  institution?: string;
  phone?: string;
  photoURL?: string;
  [key: string]: any;
};

type ForgotPasswordResult = {
  message: string;
  resetToken?: string;
  resetUrl?: string;
  expiresInMinutes?: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly PRESENCE_HEARTBEAT_MS = 45_000;

  private readonly userSubject = new BehaviorSubject<LegacyUser | null>(null);
  user$ = this.userSubject.asObservable();
  public _uid = new BehaviorSubject<string | null>(null);
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly api: CoreApiService,
    private readonly tokenStorage: TokenStorageService,
  ) {
    void this.refreshCurrentUser();
  }

  async login(email: string, password: string): Promise<LegacyUser> {
    const response = await firstValueFrom(
      this.api.post<any, { email: string; password: string }>('/auth/login', {
        email,
        password,
      }),
    );

    return this.persistSession(response);
  }

  async register(formValue: any): Promise<{ id: string }> {
    const response = await firstValueFrom(
      this.api.post<any, Record<string, unknown>>('/auth/register', {
        email: formValue.email,
        password: formValue.password,
        username:
          (formValue.username || `${formValue.firstName || ''}${formValue.lastName || ''}` || 'user')
            .toString()
            .trim(),
        firstName: (formValue.firstName || '').toString().trim() || 'User',
        lastName: (formValue.lastName || '').toString().trim() || 'Onehealth',
        institution: (formValue.institution || '').toString().trim(),
        typeMedecin: (formValue.typeMedecin || '').toString().trim(),
        country: (formValue.country || '').toString().trim(),
        city: (formValue.city || '').toString().trim(),
        phone: (formValue.phone || '').toString().trim(),
        photoURL: 'assets/default-profile.png',
      }),
    );

    const user = await this.persistSession(response);
    return { id: user.uid };
  }

  async requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
    const response = await firstValueFrom(
      this.api.post<any, { email: string }>('/auth/forgot-password', {
        email: (email || '').trim(),
      }),
    );

    return {
      message:
        response?.message ??
        'If an account exists for this email, reset instructions have been sent.',
      resetToken: response?.resetToken,
      resetUrl: response?.resetUrl,
      expiresInMinutes: response?.expiresInMinutes,
    };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await firstValueFrom(
      this.api.post<any, { token: string; password: string }>('/auth/reset-password', {
        token: (token || '').trim(),
        password: (password || '').trim(),
      }),
    );

    return {
      message: response?.message ?? 'Password reset successful. You can now sign in.',
    };
  }

  async logout(): Promise<void> {
    this.stopPresenceHeartbeat();
    const hasToken = !!(await this.tokenStorage.getToken());
    if (hasToken) {
      await firstValueFrom(
        this.api.post('/auth/logout', {}).pipe(catchError(() => of(null))),
      );
    }
    await this.tokenStorage.clearToken();
    this.userSubject.next(null);
    this._uid.next(null);
  }

  getCurrentUserSync(): LegacyUser | null {
    return this.userSubject.value;
  }

  getCurrentUser(): LegacyUser | null {
    return this.userSubject.value;
  }

  async checkAuth(): Promise<LegacyUser | null> {
    if (!this.userSubject.value) {
      await this.refreshCurrentUser();
    }
    return this.userSubject.value;
  }

  async isAuthenticated(): Promise<boolean> {
    return !!(await this.tokenStorage.getToken());
  }

  getId(): string | null {
    return this.userSubject.value?.uid ?? null;
  }

  async getUserIdOrThrow(): Promise<string> {
    const user = await this.checkAuth();
    if (!user?.uid) {
      throw new Error('not-auth');
    }
    return user.uid;
  }

  randomIntFromInterval(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  getAuthState(): Observable<LegacyUser | null> {
    return this.user$;
  }

  // Cache-buster : empeche tout proxy/CDN (LiteSpeed) de servir une reponse
  // d'identite mise en cache pour un AUTRE utilisateur (fuite d'identite entre comptes).
  private noCache(path: string): string {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}_=${Date.now()}`;
  }

  async getUserData(id: string): Promise<any> {
    const user = await firstValueFrom(this.api.get<any>(this.noCache(`/users/${id}`)));
    if (user && typeof user === 'object') {
      if (user.photoURL) {
        user.photoURL = resolveMediaUrl(user.photoURL);
      }
      if (user.photo) {
        user.photo = resolveMediaUrl(user.photo);
      }
      if (user.coverPhotoURL) {
        user.coverPhotoURL = resolveMediaUrl(user.coverPhotoURL);
      }
    }
    return user;
  }

  private async refreshCurrentUser(): Promise<void> {
    const token = await this.tokenStorage.getToken();
    if (!token) {
      this.stopPresenceHeartbeat();
      this.userSubject.next(null);
      this._uid.next(null);
      return;
    }

    let user: any = null;
    try {
      user = await firstValueFrom(this.api.get<any>(this.noCache('/auth/me')));
    } catch (error) {
      const status = (error as HttpErrorResponse)?.status ?? 0;
      // 401/403 = token invalide/expire -> deconnexion.
      // Sinon (status 0 = reseau, 5xx = backend momentanement indisponible) :
      // on CONSERVE la session pour ne pas casser l'app sur un simple blip.
      if (status === 401 || status === 403) {
        await this.logout();
      }
      return;
    }

    if (!user) {
      return;
    }

    const mapped = this.toLegacyUser(user);
    this.userSubject.next(mapped);
    this._uid.next(mapped.uid);
    this.startPresenceHeartbeat();
  }

  private async persistSession(response: any): Promise<LegacyUser> {
    const token = response?.accessToken as string | undefined;
    if (!token) {
      throw new Error('No access token returned by backend');
    }

    await this.tokenStorage.setToken(token);

    const mapped = this.toLegacyUser(response?.user);
    this.userSubject.next(mapped);
    this._uid.next(mapped.uid);
    this.startPresenceHeartbeat();
    return mapped;
  }

  private startPresenceHeartbeat() {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      void this.sendPresenceHeartbeat();
    }, AuthService.PRESENCE_HEARTBEAT_MS);
  }

  private stopPresenceHeartbeat() {
    if (!this.heartbeatTimer) {
      return;
    }
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private async sendPresenceHeartbeat() {
    const token = await this.tokenStorage.getToken();
    if (!token) {
      this.stopPresenceHeartbeat();
      return;
    }

    const user = await firstValueFrom(
      this.api.get<any>(this.noCache('/auth/me')).pipe(catchError(() => of(null))),
    );

    if (!user) {
      return;
    }

    const mapped = this.toLegacyUser(user);
    this.userSubject.next(mapped);
    this._uid.next(mapped.uid);
  }

  private toLegacyUser(user: any): LegacyUser {
    if (!user) {
      return { uid: '' };
    }

    return {
      ...user,
      uid: user.id || user.uid || '',
      name:
        user.name ||
        user.username ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      photo:
        resolveMediaUrl(user.photo || user.photoURL) ||
        'assets/default-profile.png',
      photoURL:
        resolveMediaUrl(user.photoURL || user.photo) ||
        'assets/default-profile.png',
    };
  }
}

