import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service';

export interface CertificationRequest {
  id: string;
  userId: string;
  documents: string[];
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string;
  reviewedAt?: string | null;
  createdAt: string;
}

/** Demandes de certification de profil (côté utilisateur). */
@Injectable({ providedIn: 'root' })
export class CertificationService {
  private readonly api = inject(ApiService);

  submitRequest(documents: string[], message: string): Promise<CertificationRequest> {
    return firstValueFrom(
      this.api.post<CertificationRequest, { documents: string[]; message?: string }>(
        '/certifications',
        { documents, message: message || undefined },
      ),
    );
  }

  getMyRequest(): Promise<CertificationRequest | null> {
    return firstValueFrom(
      this.api.get<CertificationRequest | null>(`/certifications/me?_=${Date.now()}`),
    );
  }
}
