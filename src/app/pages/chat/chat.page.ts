import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ChatMessage, ChatRoom } from '../../core/models/chat.models';
import { PublicUser } from '../../core/models/user.models';
import { ChatService } from '../../core/services/chat.service';
import { UsersService } from '../../core/services/users.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false,
})
export class ChatPage implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly usersService = inject(UsersService);

  currentUserId = '';
  rooms: ChatRoom[] = [];
  users: PublicUser[] = [];
  selectedRoom: ChatRoom | null = null;
  messages: ChatMessage[] = [];
  messageText = '';
  isLoading = false;
  search = '';
  loading = false;
  errorMessage = '';
  myPhoto = 'assets/default-profile.png';
  otherPhoto = 'assets/default-profile.png';
  name = 'Messages';

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    await this.refreshAll();
  }

  async refreshAll(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [rooms, users] = await Promise.all([
        firstValueFrom(this.chatService.listRooms()),
        firstValueFrom(this.usersService.listUsers(this.search)),
      ]);
      this.rooms = rooms;
      this.users = users;
    } catch {
      this.errorMessage = 'Unable to load chat data.';
    } finally {
      this.loading = false;
    }
  }

  async openRoom(room: ChatRoom): Promise<void> {
    this.selectedRoom = room;
    this.messageText = '';
    this.name = `${room.otherUser?.firstName ?? ''} ${room.otherUser?.lastName ?? ''}`.trim();
    this.otherPhoto = room.otherUser?.photoURL || 'assets/default-profile.png';
    await this.loadMessages(room.id);
    await firstValueFrom(this.chatService.markRead(room.id));
    await this.refreshRoomsOnly();
  }

  async startChatWith(user: PublicUser): Promise<void> {
    const room = await firstValueFrom(
      this.chatService.createRoom({ memberId: user.id }),
    );
    await this.refreshRoomsOnly();
    await this.openRoom(room);
  }

  async sendMessage(): Promise<void> {
    const roomId = this.selectedRoom?.id;
    const text = this.messageText.trim();
    if (!roomId || !text) {
      return;
    }

    this.isLoading = true;
    try {
      await firstValueFrom(this.chatService.sendMessage(roomId, { text }));
      this.messageText = '';
      await this.loadMessages(roomId);
      await this.refreshRoomsOnly();
    } finally {
      this.isLoading = false;
    }
  }

  async searchUsers(): Promise<void> {
    this.users = await firstValueFrom(this.usersService.listUsers(this.search));
  }

  private async refreshRoomsOnly(): Promise<void> {
    this.rooms = await firstValueFrom(this.chatService.listRooms());
  }

  private async loadMessages(roomId: string): Promise<void> {
    this.messages = await firstValueFrom(this.chatService.listMessages(roomId));
  }

  backToRooms() {
    this.selectedRoom = null;
    this.messages = [];
    this.messageText = '';
    this.name = 'Messages';
  }

  private async loadCurrentUser() {
    try {
      const me = await firstValueFrom(this.usersService.getMe());
      this.currentUserId = me.id;
      this.myPhoto = me.photoURL || 'assets/default-profile.png';
    } catch {
      this.currentUserId = '';
      this.myPhoto = 'assets/default-profile.png';
    }
  }
}
