import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ChatMessage, SendMessageRequest } from '../models/chat.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly api = inject(ApiService);

  listByConversation(conversationId: string): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(
      `/chat/rooms/${conversationId}/messages`,
    );
  }

  send(
    conversationId: string,
    payload: SendMessageRequest,
  ): Observable<ChatMessage> {
    return this.api.post<ChatMessage, SendMessageRequest>(
      `/chat/rooms/${conversationId}/messages`,
      payload,
    );
  }

  markAsRead(conversationId: string): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }, Record<string, never>>(
      `/chat/rooms/${conversationId}/read`,
      {},
    );
  }
}

