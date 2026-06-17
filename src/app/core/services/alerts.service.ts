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
  createdAt: string;
}

export interface CreateAlertPayload {
  category: AlertCategory;
  title: string;
  description?: string;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  severity?: AlertSeverity;
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

  create(payload: CreateAlertPayload): Observable<HealthAlert> {
    return this.api.post<HealthAlert, CreateAlertPayload>('/alerts', payload);
  }
}
