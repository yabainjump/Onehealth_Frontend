import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type AlertCategory = 'human' | 'animal' | 'environment';
export type AlertSeverity = 'low' | 'medium' | 'high';

export interface AlertAuthor {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photoURL: string;
  institution: string;
  isCertified?: boolean;
}

export interface AlertComment {
  id: string;
  author: AlertAuthor | null;
  text: string;
  createdAt: string;
}

export interface HealthAlert {
  id: string;
  category: AlertCategory;
  title: string;
  description: string;
  country: string;
  city: string;
  lat: number | null;
  lng: number | null;
  severity: AlertSeverity;
  imageUrls: string[];
  author: AlertAuthor | null;
  likesCount: number;
  userHasLiked: boolean;
  commentsCount: number;
  comments?: AlertComment[];
  createdAt: string;
}

export type UpdateAlertPayload = Partial<CreateAlertPayload>;

export interface CreateAlertPayload {
  category: AlertCategory;
  title: string;
  description?: string;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  severity?: AlertSeverity;
  imageUrls?: string[];
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly api = inject(ApiService);

  list(
    filters: {
      category?: string;
      severity?: string;
      country?: string;
      limit?: number;
    } = {},
  ): Observable<HealthAlert[]> {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.country) params.set('country', filters.country);
    if (filters.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return this.api.get<HealthAlert[]>(`/alerts${qs ? `?${qs}` : ''}`);
  }

  /** Alertes les plus proches d'un point (tri par distance). */
  near(
    lat: number,
    lng: number,
    radiusKm = 100,
    category?: string,
  ): Observable<HealthAlert[]> {
    const params = new URLSearchParams();
    params.set('lat', String(lat));
    params.set('lng', String(lng));
    params.set('radiusKm', String(radiusKm));
    if (category) {
      params.set('category', category);
    }
    return this.api.get<HealthAlert[]>(`/alerts/near?${params.toString()}`);
  }

  getById(id: string): Observable<HealthAlert> {
    return this.api.get<HealthAlert>(`/alerts/${id}`);
  }

  create(payload: CreateAlertPayload): Observable<HealthAlert> {
    return this.api.post<HealthAlert, CreateAlertPayload>('/alerts', payload);
  }

  update(id: string, payload: UpdateAlertPayload): Observable<HealthAlert> {
    return this.api.patch<HealthAlert, UpdateAlertPayload>(
      `/alerts/${id}`,
      payload,
    );
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/alerts/${id}`);
  }

  like(id: string): Observable<HealthAlert> {
    return this.api.post<HealthAlert, Record<string, never>>(
      `/alerts/${id}/like`,
      {},
    );
  }

  unlike(id: string): Observable<HealthAlert> {
    return this.api.delete<HealthAlert>(`/alerts/${id}/like`);
  }

  addComment(id: string, text: string): Observable<HealthAlert> {
    return this.api.post<HealthAlert, { text: string }>(
      `/alerts/${id}/comments`,
      { text },
    );
  }

  deleteComment(id: string, commentId: string): Observable<HealthAlert> {
    return this.api.delete<HealthAlert>(`/alerts/${id}/comments/${commentId}`);
  }
}

