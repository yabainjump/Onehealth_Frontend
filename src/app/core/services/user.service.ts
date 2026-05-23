import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PublicUser, UpdateProfileRequest } from '../models/user.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  getMe(): Observable<PublicUser> {
    return this.api.get<PublicUser>('/auth/me');
  }

  getById(userId: string): Observable<PublicUser> {
    return this.api.get<PublicUser>(`/users/${userId}`);
  }

  updateById(
    userId: string,
    payload: UpdateProfileRequest,
  ): Observable<PublicUser> {
    return this.api.patch<PublicUser, UpdateProfileRequest>(
      `/users/${userId}`,
      payload,
    );
  }

  list(search = ''): Observable<PublicUser[]> {
    const endpoint = search
      ? `/users?search=${encodeURIComponent(search)}`
      : '/users';
    return this.api.get<PublicUser[]>(endpoint);
  }
}

