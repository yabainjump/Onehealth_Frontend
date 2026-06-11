import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PublicUser, UpdateProfileRequest } from '../models/user.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);

  getMe(): Observable<PublicUser> {
    return this.api.get<PublicUser>(`/users/me?_=${Date.now()}`);
  }

  updateMe(payload: UpdateProfileRequest): Observable<PublicUser> {
    return this.api.patch<PublicUser, UpdateProfileRequest>('/users/me', payload);
  }

  listUsers(search = ''): Observable<PublicUser[]> {
    const endpoint = search ? `/users?search=${encodeURIComponent(search)}` : '/users';
    return this.api.get<PublicUser[]>(endpoint);
  }

  /** Suggestions « qui suivre » : comptes qui publient le plus. */
  getSuggestions(limit = 5): Observable<PublicUser[]> {
    return this.api.get<PublicUser[]>(`/users/suggestions?limit=${limit}`);
  }

  getUserById(userId: string): Observable<PublicUser> {
    return this.api.get<PublicUser>(`/users/${userId}?_=${Date.now()}`);
  }

  followUser(userId: string): Observable<PublicUser> {
    return this.api.post<PublicUser, Record<string, never>>(
      `/users/${userId}/follow`,
      {},
    );
  }

  unfollowUser(userId: string): Observable<PublicUser> {
    return this.api.delete<PublicUser>(`/users/${userId}/follow`);
  }
}
