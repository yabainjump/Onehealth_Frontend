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

export interface AdminPost {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  likesCount: number;
  commentsCount: number;
  isHidden: boolean;
  createdAt: string;
  author: PublicUser | null;
}

export interface AdminAlert {
  id: string;
  category: 'human' | 'animal' | 'environment';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  country: string;
  city: string;
  imageUrls: string[];
  isHidden: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  reviewedAt: string | null;
  createdAt: string;
  author: PublicUser | null;
}

/** Endpoints réservés aux administrateurs (guardés côté backend). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  getStats(): Promise<AdminStats> {
    return firstValueFrom(
      this.api.get<AdminStats>(`/admin/stats?_=${Date.now()}`),
    );
  }

  listUsers(
    options: {
      search?: string;
      role?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PagedResult<PublicUser>> {
    const params = new URLSearchParams();
    if (options.search) params.set('search', options.search);
    if (options.role) params.set('role', options.role);
    if (options.status) params.set('status', options.status);
    params.set('page', `${options.page ?? 1}`);
    params.set('limit', `${options.limit ?? 20}`);
    return firstValueFrom(
      this.api.get<PagedResult<PublicUser>>(
        `/admin/users?${params.toString()}`,
      ),
    );
  }

  updateUserRole(userId: string, role: 'user' | 'admin'): Promise<PublicUser> {
    return firstValueFrom(
      this.api.patch<PublicUser, { role: string }>(
        `/admin/users/${userId}/role`,
        { role },
      ),
    );
  }

  setUserBanned(userId: string, banned: boolean): Promise<PublicUser> {
    return firstValueFrom(
      this.api.patch<PublicUser, { banned: boolean }>(
        `/admin/users/${userId}/ban`,
        {
          banned,
        },
      ),
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

  rejectCertification(
    requestId: string,
    reason: string,
  ): Promise<CertificationRequest> {
    return firstValueFrom(
      this.api.patch<CertificationRequest, { reason: string }>(
        `/admin/certifications/${requestId}/reject`,
        { reason },
      ),
    );
  }

  listPosts(search = '', page = 1): Promise<PagedResult<AdminPost>> {
    const params = new URLSearchParams({ page: `${page}`, limit: '20' });
    if (search) params.set('search', search);
    return firstValueFrom(
      this.api.get<PagedResult<AdminPost>>(`/admin/posts?${params.toString()}`),
    );
  }

  setPostHidden(
    postId: string,
    hidden: boolean,
  ): Promise<{ id: string; isHidden: boolean }> {
    return firstValueFrom(
      this.api.patch<{ id: string; isHidden: boolean }, { hidden: boolean }>(
        `/admin/posts/${postId}/visibility`,
        { hidden },
      ),
    );
  }

  listAlerts(search = '', page = 1): Promise<PagedResult<AdminAlert>> {
    const params = new URLSearchParams({ page: `${page}`, limit: '20' });
    if (search) params.set('search', search);
    return firstValueFrom(
      this.api.get<PagedResult<AdminAlert>>(
        `/admin/alerts?${params.toString()}`,
      ),
    );
  }

  setAlertHidden(
    alertId: string,
    hidden: boolean,
  ): Promise<{ id: string; isHidden: boolean }> {
    return firstValueFrom(
      this.api.patch<{ id: string; isHidden: boolean }, { hidden: boolean }>(
        `/admin/alerts/${alertId}/visibility`,
        { hidden },
      ),
    );
  }

  setAlertVerification(
    alertId: string,
    status: AdminAlert['verificationStatus'],
  ): Promise<{
    id: string;
    verificationStatus: AdminAlert['verificationStatus'];
    reviewedAt: string;
  }> {
    return firstValueFrom(
      this.api.patch<
        {
          id: string;
          verificationStatus: AdminAlert['verificationStatus'];
          reviewedAt: string;
        },
        { status: AdminAlert['verificationStatus'] }
      >(`/admin/alerts/${alertId}/verification`, { status }),
    );
  }

  deletePost(postId: string): Promise<{ success: boolean }> {
    return firstValueFrom(
      this.api.delete<{ success: boolean }>(`/admin/posts/${postId}`),
    );
  }

  deleteAlert(alertId: string): Promise<{ success: boolean }> {
    return firstValueFrom(
      this.api.delete<{ success: boolean }>(`/admin/alerts/${alertId}`),
    );
  }
}
