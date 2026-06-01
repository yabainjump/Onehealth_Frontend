import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  catchError,
  firstValueFrom,
  map,
  of,
} from 'rxjs';

import { ChatService as CoreChatService } from '../../core/services/chat.service';
import { UploadService } from '../../core/services/upload.service';
import { UsersService } from '../../core/services/users.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private static readonly MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

  currentUserId = '';
  public users: Observable<any> = of([]);
  public searchs: Observable<any> = of([]);
  private readonly chatRoomsSubject = new BehaviorSubject<any[]>([]);
  // Observable STABLE : on ne le remplace jamais -> pas de re-abonnement,
  // donc pas de clignotement de la liste pendant le polling.
  public chatRooms: Observable<any[]> = this.chatRoomsSubject.asObservable();
  private chatRoomsSub?: Subscription;
  private lastRoomsSignature = '';
  private lastMessagesSignature = '';
  private readonly selectedChatRoomMessagesSubject = new BehaviorSubject<any[]>(
    [],
  );
  public selectedChatRoomMessages =
    this.selectedChatRoomMessagesSubject.asObservable();
  private selectedRoomId = '';
  private selectedRoomMessagesSub?: Subscription;

  constructor(
    public auth: AuthService,
    private readonly coreChat: CoreChatService,
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {
    this.auth.getAuthState().subscribe((user) => {
      this.currentUserId = user?.uid || '';
    });
  }

  getId() {
    this.currentUserId = this.auth.getId() || '';
  }

  getUsers(): Observable<any[]> {
    const uid = this.currentUserId || this.auth._uid.getValue();
    return this.usersService.listUsers('').pipe(
      map((users) =>
        users
          .filter((user) => user.id !== uid)
          .map((user) => this.toLegacyUser(user)),
      ),
    );
  }

  getCurrentUserProfil(): Observable<any[]> {
    return this.usersService
      .getMe()
      .pipe(map((user) => [this.toLegacyUser(user)]));
  }

  async createChatRoom(userId: string) {
    const room = await firstValueFrom(
      this.coreChat.createRoom({ memberId: userId }),
    );

    return {
      id: room.id,
      members: room.members || [this.currentUserId, userId],
      updatedAt: room.updatedAt,
      user: of(this.toLegacyUser(room.otherUser)),
      lastMsg: of(
        room.lastMessage
          ? {
              message: room.lastMessage,
              sender: '',
              createdAt: room.updatedAt,
            }
          : null,
      ),
      unread: {
        [this.currentUserId]: room.unreadCount || 0,
      },
      lastMessage: room.lastMessage || '',
    };
  }

  getChatRooms() {
    this.chatRoomsSub?.unsubscribe();
    this.chatRoomsSub = this.coreChat.listRooms().subscribe((rooms) => {
      const list = rooms || [];

      // Signature des donnees pertinentes : on ne met a jour l'UI QUE si quelque
      // chose a change (nouveau message, non-lus, ordre). Sinon, liste stable.
      const signature = list
        .map(
          (room) =>
            `${room.id}:${room.lastMessage || ''}:${room.unreadCount || 0}:${room.updatedAt || ''}`,
        )
        .join('|');
      if (signature === this.lastRoomsSignature) {
        return;
      }
      this.lastRoomsSignature = signature;

      const mapped = list.map((room) => ({
        id: room.id,
        members: room.members || [],
        updatedAt: room.updatedAt,
        user: of(this.toLegacyUser(room.otherUser)),
        lastMsg: of(
          room.lastMessage
            ? {
                message: room.lastMessage,
                sender: '',
                createdAt: room.updatedAt,
              }
            : null,
        ),
        unread: {
          [this.currentUserId]: room.unreadCount || 0,
        },
        lastMessage: room.lastMessage || '',
      }));

      this.chatRoomsSubject.next(mapped);
    });
  }

  getChatRoomMessages(chatRoomId: string) {
    if (chatRoomId !== this.selectedRoomId) {
      this.lastMessagesSignature = '';
    }
    this.selectedRoomId = chatRoomId;
    this.selectedRoomMessagesSub?.unsubscribe();
    this.selectedRoomMessagesSub = this.coreChat
      .listMessages(chatRoomId)
      .pipe(
        map((messages) =>
          messages.map((message) => ({
            id: message.id,
            sender: message.senderId,
            message: message.text || '',
            imageUrl: resolveMediaUrl(message.imageUrl),
            fileUrl: resolveMediaUrl(message.fileUrl),
            fileName: message.fileName || '',
            fileMimeType: message.fileMimeType || '',
            fileSize: message.fileSize || 0,
            isRead: !!message.isRead,
            createdAt: new Date(message.createdAt),
          })),
        ),
        catchError((error) => {
          console.error('Chat messages load error:', error);
          return of([]);
        }),
      )
      .subscribe((messages) => {
        const signature =
          `${messages.length}:` +
          messages.map((m) => `${m.id}:${m.isRead ? 1 : 0}`).join('|');
        if (signature === this.lastMessagesSignature) {
          return;
        }
        this.lastMessagesSignature = signature;
        this.selectedChatRoomMessagesSubject.next(messages);
      });
  }

  async sendMessage(chatId: string, msg?: string, file?: File) {
    let imageUrl = '';
    let fileUrl = '';
    let fileName = '';
    let fileMimeType = '';
    let fileSize = 0;

    if (file) {
      if (file.size > ChatService.MAX_ATTACHMENT_BYTES) {
        throw new Error('FILE_TOO_LARGE');
      }
      const uploaded = await firstValueFrom(this.uploadService.uploadMessage(file));
      fileUrl = uploaded.url;
      fileName = uploaded.originalName || file.name || uploaded.filename || '';
      fileMimeType = uploaded.mimetype || file.type || '';
      fileSize = uploaded.size ?? file.size ?? 0;
      if (fileMimeType.startsWith('image/')) {
        imageUrl = uploaded.url;
      }
    }

    const sent = await firstValueFrom(
      this.coreChat.sendMessage(chatId, {
        text: msg?.trim() || undefined,
        imageUrl: imageUrl || undefined,
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileMimeType: fileMimeType || undefined,
        fileSize: fileSize || undefined,
      }),
    );

    const localMessage = {
      id: sent.id,
      sender: sent.senderId,
      message: sent.text || '',
      imageUrl: resolveMediaUrl(sent.imageUrl),
      fileUrl: resolveMediaUrl(sent.fileUrl),
      fileName: sent.fileName || '',
      fileMimeType: sent.fileMimeType || '',
      fileSize: sent.fileSize || 0,
      isRead: !!sent.isRead,
      createdAt: new Date(sent.createdAt),
    };

    if (this.selectedRoomId === chatId) {
      const current = this.selectedChatRoomMessagesSubject.value || [];
      this.selectedChatRoomMessagesSubject.next([...current, localMessage]);
    }

    return localMessage;
  }

  async getRoomInfo(
    chatId: string,
    myUid?: string,
  ): Promise<{
    room: any;
    otherUid: string;
    otherUser?: any;
    myUser?: any;
  }> {
    const me = myUid || this.currentUserId || this.auth._uid.getValue() || '';
    const rooms = await firstValueFrom(this.coreChat.listRooms());
    const room = rooms.find((item) => item.id === chatId);

    if (!room) {
      throw new Error('room-not-found');
    }

    const otherUid = (room.members || []).find((memberId) => memberId !== me) || '';
    const [otherUser, myUser] = await Promise.all([
      otherUid ? this.auth.getUserData(otherUid) : Promise.resolve(undefined),
      me ? this.auth.getUserData(me) : Promise.resolve(undefined),
    ]);

    return {
      room,
      otherUid,
      otherUser: otherUser ? this.toLegacyUser(otherUser) : undefined,
      myUser: myUser ? this.toLegacyUser(myUser) : undefined,
    };
  }

  async markRoomRead(chatId: string) {
    await firstValueFrom(this.coreChat.markRead(chatId));
  }

  async clearRoomsCacheFor(uid?: string) {
    void uid;
  }

  private toLegacyUser(user: any): any {
    if (!user) {
      return null;
    }

    return {
      ...user,
      uid: user.id || user.uid,
      name:
        user.name ||
        user.username ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      photoURL: resolveMediaUrl(user.photoURL) || 'assets/default-profile.png',
      photo:
        resolveMediaUrl(user.photo || user.photoURL) ||
        'assets/default-profile.png',
    };
  }
}
