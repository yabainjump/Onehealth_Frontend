import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subscription,
  catchError,
  firstValueFrom,
  finalize,
  map,
  of,
  timeout,
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
  private roomsRequest?: Promise<void>;
  private messagesRequest?: Promise<void>;
  private sessionVersion = 0;
  private lastReadIncomingId = '';
  private readRequest?: Promise<void>;

  constructor(
    public auth: AuthService,
    private readonly coreChat: CoreChatService,
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {
    this.auth.getAuthState().subscribe((user) => {
      if (this.currentUserId !== (user?.uid || '')) this.resetCache();
      this.currentUserId = user?.uid || '';
    });
  }

  getId() {
    this.currentUserId = this.auth.getId() || '';
  }

  getUsers(search = ''): Observable<any[]> {
    const uid = this.currentUserId || this.auth._uid.getValue();
    // La recherche est transmise au serveur (toute la base, pas seulement
    // les 100 derniers inscrits).
    return this.usersService
      .listUsers(search)
      .pipe(
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

  getChatRooms(): Promise<void> {
    if (!this.currentUserId) return Promise.resolve();
    if (this.roomsRequest) return this.roomsRequest;
    const version = this.sessionVersion;
    const request = new Promise<void>((resolve) => {
      this.chatRoomsSub = this.coreChat
        .listRooms()
        .pipe(
          timeout(15_000),
          catchError((error) => {
            if (error?.status === 401 || error?.status === 403)
              this.resetCache();
            return EMPTY;
          }),
          finalize(resolve),
        )
        .subscribe((rooms) => {
          if (version !== this.sessionVersion) return;
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
    });
    this.roomsRequest = request;
    void request.then(() => {
      if (this.roomsRequest === request) this.roomsRequest = undefined;
    });
    return request;
  }

  getChatRoomMessages(chatRoomId: string): Promise<void> {
    if (!this.currentUserId) return Promise.resolve();
    if (chatRoomId !== this.selectedRoomId) {
      this.stopMessageRefresh();
    }
    this.selectedRoomId = chatRoomId;
    if (this.messagesRequest) return this.messagesRequest;
    const version = this.sessionVersion;
    const request = new Promise<void>((resolve) => {
      this.selectedRoomMessagesSub = this.coreChat
        .listMessages(chatRoomId)
        .pipe(
          timeout(15_000),
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
            if (error?.status === 401 || error?.status === 403)
              this.resetCache();
            return EMPTY;
          }),
          finalize(resolve),
        )
        .subscribe((messages) => {
          if (
            version !== this.sessionVersion ||
            this.selectedRoomId !== chatRoomId
          )
            return;
          const signature =
            `${messages.length}:` +
            messages
              .map(
                (m) => `${m.id}:${m.isRead ? 1 : 0}:${m.fileUrl}:${m.imageUrl}`,
              )
              .join('|');
          if (signature === this.lastMessagesSignature) {
            return;
          }
          this.lastMessagesSignature = signature;
          this.selectedChatRoomMessagesSubject.next(messages);
        });
    });
    this.messagesRequest = request;
    void request.then(() => {
      if (this.messagesRequest === request) this.messagesRequest = undefined;
    });
    return request;
  }

  stopMessageRefresh(chatRoomId?: string): void {
    if (chatRoomId && chatRoomId !== this.selectedRoomId) return;
    this.selectedRoomMessagesSub?.unsubscribe();
    this.messagesRequest = undefined;
    this.selectedRoomId = '';
    this.lastMessagesSignature = '';
    this.lastReadIncomingId = '';
    this.readRequest = undefined;
    this.selectedChatRoomMessagesSubject.next([]);
  }

  stopRoomsRefresh(): void {
    this.chatRoomsSub?.unsubscribe();
    this.roomsRequest = undefined;
  }

  async syncSelectedRoomRead(chatRoomId: string): Promise<void> {
    if (
      document.hidden ||
      this.selectedRoomId !== chatRoomId ||
      this.readRequest
    )
      return;
    const incoming = [...this.selectedChatRoomMessagesSubject.value]
      .reverse()
      .find((message) => message.sender !== this.currentUserId);
    if (!incoming || incoming.id === this.lastReadIncomingId) return;
    const version = this.sessionVersion;
    const request = this.markRoomRead(chatRoomId).then(() => {
      if (
        version === this.sessionVersion &&
        this.selectedRoomId === chatRoomId
      ) {
        this.lastReadIncomingId = incoming.id;
      }
    });
    this.readRequest = request;
    try {
      await request;
    } finally {
      if (this.readRequest === request) this.readRequest = undefined;
    }
  }

  private resetCache(): void {
    this.sessionVersion += 1;
    this.stopRoomsRefresh();
    this.stopMessageRefresh();
    this.lastRoomsSignature = '';
    this.chatRoomsSubject.next([]);
  }

  async sendMessage(chatId: string, msg?: string, file?: File) {
    const version = this.sessionVersion;
    let imageUrl = '';
    let fileUrl = '';
    let fileName = '';
    let fileMimeType = '';
    let fileSize = 0;

    if (file) {
      if (file.size > ChatService.MAX_ATTACHMENT_BYTES) {
        throw new Error('FILE_TOO_LARGE');
      }
      const uploaded = await firstValueFrom(
        this.uploadService.uploadMessage(file),
      );
      fileUrl = uploaded.url;
      fileName = uploaded.originalName || file.name || uploaded.filename || '';
      fileMimeType = uploaded.mimetype || file.type || '';
      fileSize = uploaded.size ?? file.size ?? 0;
      if (fileMimeType.startsWith('image/')) {
        imageUrl = uploaded.url;
      }
    }

    if (version !== this.sessionVersion) throw new Error('Session changed');
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

    if (version === this.sessionVersion && this.selectedRoomId === chatId) {
      const current = this.selectedChatRoomMessagesSubject.value || [];
      if (!current.some((message) => message.id === localMessage.id)) {
        this.selectedChatRoomMessagesSubject.next([...current, localMessage]);
      }
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

    const otherUid =
      (room.members || []).find((memberId) => memberId !== me) || '';
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
    await firstValueFrom(this.coreChat.markRead(chatId).pipe(timeout(15_000)));
  }

  async clearRoomsCacheFor(uid?: string) {
    void uid;
    this.resetCache();
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
