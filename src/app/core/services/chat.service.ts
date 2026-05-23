import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ChatMessage,
  ChatRoom,
  CreateRoomRequest,
  SendMessageRequest,
} from '../models/chat.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ApiService);

  createRoom(payload: CreateRoomRequest): Observable<ChatRoom> {
    return this.api.post<ChatRoom, CreateRoomRequest>('/chat/rooms', payload);
  }

  listRooms(): Observable<ChatRoom[]> {
    return this.api.get<ChatRoom[]>('/chat/rooms');
  }

  listMessages(roomId: string): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/chat/rooms/${roomId}/messages`);
  }

  sendMessage(roomId: string, payload: SendMessageRequest): Observable<ChatMessage> {
    return this.api.post<ChatMessage, SendMessageRequest>(
      `/chat/rooms/${roomId}/messages`,
      payload,
    );
  }

  markRead(roomId: string): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }, Record<string, never>>(
      `/chat/rooms/${roomId}/read`,
      {},
    );
  }
}
