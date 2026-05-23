import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(this.buildUrl(endpoint), { params });
  }

  post<T, B = unknown>(endpoint: string, body: B): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), body);
  }

  put<T, B = unknown>(endpoint: string, body: B): Observable<T> {
    return this.http.put<T>(this.buildUrl(endpoint), body);
  }

  patch<T, B = unknown>(endpoint: string, body: B): Observable<T> {
    return this.http.patch<T>(this.buildUrl(endpoint), body);
  }

  delete<T>(
    endpoint: string,
    options?: {
      body?: unknown;
      params?: HttpParams;
    },
  ): Observable<T> {
    return this.http.delete<T>(this.buildUrl(endpoint), options);
  }

  private buildUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.apiBaseUrl}${normalizedEndpoint}`;
  }
}
