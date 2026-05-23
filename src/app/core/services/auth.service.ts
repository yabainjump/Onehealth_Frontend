import { Injectable, inject } from '@angular/core';
import { Observable, from, firstValueFrom, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import {
  AuthResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../models/auth.models';
import { ApiService } from './api.service';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly tokenStorage = inject(TokenStorageService);

  login(payload: LoginRequest): Observable<void> {
    return this.apiService.post<AuthResponse, LoginRequest>('/auth/login', payload).pipe(
      map((response) => this.extractToken(response)),
      switchMap((token) => from(this.tokenStorage.setToken(token))),
    );
  }

  register(payload: RegisterRequest): Observable<void> {
    return this.apiService.post<AuthResponse, RegisterRequest>('/auth/register', payload).pipe(
      map((response) => this.extractToken(response)),
      switchMap((token) => from(this.tokenStorage.setToken(token))),
    );
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.apiService.post<ForgotPasswordResponse, ForgotPasswordRequest>(
      '/auth/forgot-password',
      payload,
    );
  }

  resetPassword(payload: ResetPasswordRequest): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }, ResetPasswordRequest>(
      '/auth/reset-password',
      payload,
    );
  }

  getToken(): Promise<string | null> {
    return this.tokenStorage.getToken();
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.tokenStorage.getToken();
    return Boolean(token);
  }

  async logout(): Promise<void> {
    const token = await this.tokenStorage.getToken();
    if (token) {
      await firstValueFrom(
        this.apiService.post('/auth/logout', {}).pipe(catchError(() => of(null))),
      );
    }
    await this.tokenStorage.clearToken();
  }

  private extractToken(response: AuthResponse): string {
    const token = response.accessToken;

    if (!token) {
      throw new Error('No auth token returned by backend.');
    }

    return token;
  }
}
