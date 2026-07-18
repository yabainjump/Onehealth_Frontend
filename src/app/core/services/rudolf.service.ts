import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { TokenStorageService } from './token-storage.service';

export type RudolfMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type RudolfConversationSummary = {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RudolfConversation = {
  configured: boolean;
  model: string;
  conversation?: RudolfConversationSummary;
  messages: RudolfMessage[];
};

export type RudolfConversationList = {
  configured: boolean;
  model: string;
  conversations: RudolfConversationSummary[];
};

export type RudolfMessageResponse = {
  message: RudolfMessage;
  conversation?: RudolfConversationSummary;
};

type RudolfStreamEvent =
  | { type: 'delta'; content: string }
  | ({ type: 'done' } & RudolfMessageResponse)
  | { type: 'error'; status: number; code: string };

export class RudolfStreamError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'RudolfStreamError';
  }
}

@Injectable({ providedIn: 'root' })
export class RudolfService {
  private readonly api = inject(ApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  listConversations(): Observable<RudolfConversationList> {
    return this.api.get<RudolfConversationList>('/rudolf/conversations');
  }

  createConversation(): Observable<RudolfConversation> {
    return this.api.post<RudolfConversation, Record<string, never>>(
      '/rudolf/conversations',
      {},
    );
  }

  getConversation(conversationId?: string): Observable<RudolfConversation> {
    const endpoint = conversationId
      ? `/rudolf/conversations/${encodeURIComponent(conversationId)}`
      : '/rudolf/conversation';
    return this.api.get<RudolfConversation>(endpoint);
  }

  deleteConversation(conversationId: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(
      `/rudolf/conversations/${encodeURIComponent(conversationId)}`,
    );
  }

  async streamMessage(
    conversationId: string,
    message: string,
    onDelta: (content: string) => void,
    signal?: AbortSignal,
  ): Promise<RudolfMessageResponse> {
    const token = await this.tokenStorage.getToken();
    if (!token) throw new RudolfStreamError(401, 'unauthorized');

    const response = await fetch(
      `${this.apiBaseUrl}/rudolf/conversations/${encodeURIComponent(
        conversationId,
      )}/messages/stream`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/x-ndjson',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
        signal,
      },
    );

    if (!response.ok) {
      throw new RudolfStreamError(
        response.status,
        this.statusCode(response.status),
      );
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let result: RudolfMessageResponse | null = null;

    const consumeLine = (line: string): void => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let event: RudolfStreamEvent;
      try {
        event = JSON.parse(trimmed) as RudolfStreamEvent;
      } catch {
        throw new RudolfStreamError(503, 'invalid_stream');
      }

      if (event.type === 'delta') {
        onDelta(event.content);
        return;
      }
      if (event.type === 'error') {
        throw new RudolfStreamError(event.status, event.code);
      }
      if (event.type === 'done') {
        result = {
          message: event.message,
          conversation: event.conversation,
        };
      }
    };

    if (!response.body) {
      const completeResponse = await response.text();
      completeResponse.split('\n').forEach(consumeLine);
    } else {
      const reader = response.body.getReader();
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.forEach(consumeLine);
      }
      buffer += decoder.decode();
    }

    if (buffer.trim()) consumeLine(buffer);
    if (!result) throw new RudolfStreamError(503, 'incomplete_stream');
    return result;
  }

  /**
   * Compatibilité avec les anciennes versions du composant.
   */
  sendMessage(message: string): Observable<RudolfMessageResponse> {
    return this.api.post<RudolfMessageResponse, { message: string }>(
      '/rudolf/messages',
      { message },
    );
  }

  resetConversation(): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>('/rudolf/conversation');
  }

  private statusCode(status: number): string {
    if (status === 401 || status === 403) return 'unauthorized';
    if (status === 404) return 'not_found';
    if (status === 409) return 'conversation_limit';
    if (status === 429) return 'rate_limit';
    if (status === 504) return 'timeout';
    return 'unavailable';
  }
}
