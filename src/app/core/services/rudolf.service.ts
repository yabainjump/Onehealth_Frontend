import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type RudolfMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type RudolfConversation = {
  configured: boolean;
  model: string;
  messages: RudolfMessage[];
};

export type RudolfMessageResponse = {
  message: RudolfMessage;
};

@Injectable({ providedIn: 'root' })
export class RudolfService {
  private readonly api = inject(ApiService);

  getConversation(): Observable<RudolfConversation> {
    return this.api.get<RudolfConversation>('/rudolf/conversation');
  }

  sendMessage(message: string): Observable<RudolfMessageResponse> {
    return this.api.post<RudolfMessageResponse, { message: string }>(
      '/rudolf/messages',
      { message },
    );
  }

  resetConversation(): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>('/rudolf/conversation');
  }
}
