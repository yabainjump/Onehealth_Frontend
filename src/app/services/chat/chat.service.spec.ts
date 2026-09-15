import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ChatService } from './chat.service';
import { ChatService as CoreChatService } from '../../core/services/chat.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../../core/services/users.service';
import { UploadService } from '../../core/services/upload.service';
import { ChatMessage, ChatRoom } from '../../core/models/chat.models';

describe('ChatService polling isolation', () => {
  let service: ChatService;
  let identity: BehaviorSubject<{ uid: string } | null>;
  let core: jasmine.SpyObj<CoreChatService>;
  const message: ChatMessage = {
    id: 'message-1',
    roomId: 'room-A',
    senderId: 'other',
    text: 'test',
    imageUrl: '',
    fileUrl: '',
    fileName: '',
    fileMimeType: '',
    fileSize: 0,
    createdAt: '2026-09-14T12:00:00Z',
  };
  beforeEach(() => {
    identity = new BehaviorSubject<{ uid: string } | null>({ uid: 'user-A' });
    core = jasmine.createSpyObj('CoreChatService', [
      'listMessages',
      'listRooms',
      'markRead',
    ]);
    core.markRead.and.returnValue(of({ success: true }));
    service = new ChatService(
      { getAuthState: () => identity.asObservable() } as unknown as AuthService,
      core,
      {} as UsersService,
      {} as UploadService,
    );
    spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
  });

  it('coalesces same-room requests and marks unchanged incoming messages once', async () => {
    const response = new Subject<ChatMessage[]>();
    core.listMessages.and.returnValue(response);
    const first = service.getChatRoomMessages('room-A');
    expect(service.getChatRoomMessages('room-A')).toBe(first);
    expect(core.listMessages).toHaveBeenCalledTimes(1);
    response.next([message]);
    response.complete();
    await first;
    await service.syncSelectedRoomRead('room-A');
    await service.syncSelectedRoomRead('room-A');
    expect(core.markRead).toHaveBeenCalledTimes(1);
  });

  it('cancels the previous room and never shows it in a different conversation', async () => {
    const old = new Subject<ChatMessage[]>();
    core.listMessages.and.returnValue(old);
    const previous = service.getChatRoomMessages('room-A');
    let displayed: unknown[] = [];
    service.selectedChatRoomMessages.subscribe((messages) => {
      displayed = messages;
    });
    core.listMessages.and.returnValue(of([]));
    await service.getChatRoomMessages('room-B');
    old.next([message]);
    await previous;
    expect(old.observed).toBeFalse();
    expect(displayed).toEqual([]);
  });

  it('clears rooms/messages and cancels requests on account change', async () => {
    const rooms = new Subject<ChatRoom[]>();
    const messages = new Subject<ChatMessage[]>();
    core.listRooms.and.returnValue(rooms);
    core.listMessages.and.returnValue(messages);
    const requests = [
      service.getChatRooms(),
      service.getChatRoomMessages('room-A'),
    ];
    let displayed: unknown[] = [];
    service.selectedChatRoomMessages.subscribe((items) => {
      displayed = items;
    });
    identity.next({ uid: 'user-B' });
    messages.next([message]);
    await Promise.all(requests);
    expect(rooms.observed).toBeFalse();
    expect(messages.observed).toBeFalse();
    expect(displayed).toEqual([]);
    identity.next(null);
    await service.getChatRoomMessages('room-A');
    expect(core.listMessages).toHaveBeenCalledTimes(1);
  });

  it('preserves messages on transient failure but clears them on denied access', async () => {
    let displayed: unknown[] = [];
    service.selectedChatRoomMessages.subscribe((items) => {
      displayed = items;
    });
    core.listMessages.and.returnValue(of([message]));
    await service.getChatRoomMessages('room-A');
    core.listMessages.and.returnValue(throwError(() => ({ status: 503 })));
    await service.getChatRoomMessages('room-A');
    expect(displayed.length).toBe(1);
    core.listMessages.and.returnValue(throwError(() => ({ status: 403 })));
    await service.getChatRoomMessages('room-A');
    expect(displayed).toEqual([]);
  });
});
