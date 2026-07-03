import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PublicUser } from '../models/user.models';
import { ApiService } from './api.service';
import { CertificationRequest } from './certification.service';

export interface AdminStats {
  totalUsers: number;
  certifiedUsers: number;
  bannedUsers: number;
  pendingCertifications: number;
  totalPosts: number;
  totalAlerts: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type AdminCertificationRequest = CertificationRequest & {
  user: PublicUser | null;
};

/** Endpoints réservés aux administrateurs (guardés côté backend). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  getStats(): Promise<AdminStats> {
    return firstValueFrom(this.api.get<AdminStats>(`/admin/stats?_=${Date.now()}`));
  }

  listUsers(options: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PagedResult<PublicUser>> {
    const params = new URLSearchParams();
    if (options.search) params.set('search', options.search);
    if (options.role) params.set('role', options.role);
    if (options.status) params.set('status', options.status);
    params.set('page', `${options.page ?? 1}`);
    params.set('limit', `${options.limit ?? 20}`);
    return firstValueFrom(
      this.api.get<PagedResult<PublicUser>>(`/admin/users?${params.toString()}`),
    );
  }

  updateUserRole(userId: string, role: 'user' | 'admin'): Promise<PublicUser> {
    return firstValueFrom(
      this.api.patch<PublicUser, { role: string }>(`/admin/users/${userId}/role`, { role }),
    );
  }

  setUserBanned(userId: string, banned: boolean): Promise<PublicUser> {
    return firstValueFrom(
      this.api.patch<PublicUser, { banned: boolean }>(`/admin/users/${userId}/ban`, {
        banned,
      }),
    );
  }

  listCertifications(
    status: 'pending' | 'approved' | 'rejected' = 'pending',
    page = 1,
  ): Promise<PagedResult<AdminCertificationRequest>> {
    return firstValueFrom(
      this.api.get<PagedResult<AdminCertificationRequest>>(
        `/admin/certifications?status=${status}&page=${page}&_=${Date.now()}`,
      ),
    );
  }

  approveCertification(requestId: string): Promise<CertificationRequest> {
    return firstValueFrom(
      this.api.patch<CertificationRequest, Record<string, never>>(
        `/admin/certifications/${requestId}/approve`,
        {},
      ),
    );
  }

  rejectCertification(requestId: string, reason: string): Promise<CertificationRequest> {
    return firstValueFrom(
      this.api.patch<CertificationRequest, { reason: string }>(
        `/admin/certifications/${requestId}/reject`,
        { reason },
      ),
    );
  }

  deletePost(postId: string): Promise<{ success: boolean }> {
    return firstValueFrom(this.api.delete<{ success: boolean }>(`/admin/posts/${postId}`));
  }

  deleteAlert(alertId: string): Promise<{ success: boolean }> {
    return firstValueFrom(this.api.delete<{ success: boolean }>(`/admin/alerts/${alertId}`));
  }
}
