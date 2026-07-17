import { ChatService } from './../../services/chat/chat.service';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, NavigationExtras, Router } from '@angular/router';
import {
  AlertController,
  IonContent,
  ModalController,
  PopoverController,
} from '@ionic/angular';
import {
  Observable,
  Subscription,
  firstValueFrom,
  map,
  take,
} from 'rxjs';
import { ApiService } from 'src/app/services/api/api.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { InteractionGuardService } from 'src/app/core/services/interaction-guard.service';
import { TranslateService } from '@ngx-translate/core';
import {
  RudolfMessage,
  RudolfService,
} from 'src/app/core/services/rudolf.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  private roomsRefreshTimer: ReturnType<typeof setInterval> | null = null;
  // Vue PC : vrai quand une conversation est ouverte (affichage 2 volets).
  conversationOpen = false;
  private routerSub?: Subscription;
  @ViewChild('new_chat') modal: ModalController;
  @ViewChild('popover') popover: PopoverController;
  @ViewChild('mainContent', { static: false }) mainContent: IonContent;
  segment = 'chats';
  query: string;
  searchs: Observable<any[]>;
  open_new_chat = false;
  users: Observable<any[]>;
  currentUser: any;
  dm: string;
  medecins: Observable<any[]>;
  chatRooms: Observable<any[]>;
  message: string;
  model = {
    icon: 'chatbubble-ellipses-outline',
    title: '',
    color: 'dark',
  };

  constructor(
    private router: Router,
    public chatService: ChatService,
    private api: ApiService,
    private authService: AuthService,
    private translate: TranslateService,
    private interactionGuard: InteractionGuardService,
    private rudolfService: RudolfService,
    private alertController: AlertController,
  ) {}
  

  // Fabrique un petit extrait lisible
  roomPreview(room: any): string {
    if (room?.lastMessage) return room.lastMessage;

    return 'Start the conversation';
  }

 

  pickPhoto(u: any): string {
    return (
      u?.photoURL ||
      u?.photo ||
      u?.avatar ||
      u?.profilePicture ||
      'assets/default-profile.png'
    );
  }
  pickName(u: any): string {
    return (
      u?.username ||
      u?.name ||
      [u?.firstName, u?.lastName].filter(Boolean).join(' ') ||
      u?.email ||
      'Utilisateur'
    );
  }
  private toDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v?.seconds) return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  formatRoomTime(value: any): string {
    const d = this.toDate(value);
    if (!d) return '';
    const now = new Date();
    const isSameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    if (isSameDay)
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    if (d.toDateString() === yest.toDateString()) return this.translate.instant('HOME.YESTERDAY');
    return d.toLocaleDateString('fr-FR');
  }
  unreadCount(room: any): number {
    const uid =
      this.chatService.currentUserId || this.authService._uid.getValue();
    return room?.unread?.[uid] || 0;
  }
  formatPreview(last: any, roomFallback: any): string {
    if (last) {
      const mine =
        last?.sender ===
        (this.chatService.currentUserId || this.authService._uid.getValue());
      const prefix = mine ? this.translate.instant('HOME.YOU_PREFIX') : '';
      const body = last?.message?.trim()
        ? last.message.trim().slice(0, 60)
        : last?.imageUrl
        ? this.translate.instant('HOME.PHOTO_PREVIEW')
        : '';
      if (body) return prefix + body;
    }
    // fallback: ancien champ room.lastMessage si présent, sinon phrase par défaut
    return roomFallback?.lastMessage || this.translate.instant('HOME.START_CONVERSATION');
  }

  isLoading = true;
  rudolfMessages: RudolfMessage[] = [];
  rudolfInput = '';
  rudolfConfigured = true;
  rudolfLoading = false;
  rudolfSending = false;
  rudolfLoaded = false;
  rudolfError = '';

  

  async ngOnInit() {
    this.translate.get('HOME.EMPTY_TITLE').subscribe((t) => (this.model.title = t));
    if (!(await this.interactionGuard.requireAuth())) {
      void this.router.navigateByUrl('/tabs/dashbord', { replaceUrl: true });
      return;
    }
    this.getRooms();
    void this.loadRudolfConversation();
    this.chatService
      .getCurrentUserProfil()
      .subscribe((user) => (this.currentUser = user[0]));

    // Suit l'URL pour savoir si une conversation est ouverte (vue 2 volets PC).
    this.conversationOpen = this.router.url.includes('/home/chats/');
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.conversationOpen = this.router.url.includes('/home/chats/');
      }
    });

    // Rafraichit periodiquement la liste des conversations (nouveaux messages / non-lus).
    this.roomsRefreshTimer = setInterval(() => this.getRooms(), 10000);
  }

  ngOnDestroy() {
    if (this.roomsRefreshTimer) {
      clearInterval(this.roomsRefreshTimer);
      this.roomsRefreshTimer = null;
    }
    this.routerSub?.unsubscribe();
  }

  private scrollRudolfToBottom(): void {
    setTimeout(() => void this.mainContent?.scrollToBottom(300), 0);
  }

  searchMed(event) {
    const query1 = event.target.value.toLowerCase();
    this.users = this.chatService
      .getUsers()
      .pipe(
        map((users) =>
          users.filter((user) =>
            user.typeMedecin.toLowerCase().includes(query1)
          )
        )
      );
    this.dm = query1;
  }

  // searchUsers(event) {
  //   const query2 = event.target.value.toLowerCase();
  //   this.users = this.chatService
  //     .getUsers()
  //     .pipe(
  //       map((users) =>
  //         users.filter(
  //           (user) =>
  //             user.name.toLowerCase().includes(query2) &&
  //             user.typeMedecin.toLowerCase().includes(this.dm)
  //         )
  //       )
  //     );
  //   console.log(query2, this.dm);
  // }

  searchUsers(event: any) {
    // Recherche côté serveur (toute la base, pas seulement les 100 derniers).
    const q = (event?.target?.value || '').trim();
    this.users = this.chatService.getUsers(q);
  }

  getRooms() {
    // this.chatService.getId();
    this.chatService.getChatRooms();
    this.chatRooms = this.chatService.chatRooms;
  }

  async logout() {
    this.blurActive(); 
  try {
    const uid = this.chatService.currentUserId || this.authService._uid.getValue();
    await this.chatService.clearRoomsCacheFor(uid);  // ⬅️ vide le cache rooms
    await this.chatService.auth.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  } catch (e) {
    console.error(e);
  }
}


  onSegmentChanged(event: any) {
    this.segment = event.detail.value;
    if (this.segment === 'rudolf' && !this.rudolfLoaded) {
      void this.loadRudolfConversation();
    }
  }

  async loadRudolfConversation(): Promise<void> {
    if (this.rudolfLoading) return;
    this.rudolfLoading = true;
    this.rudolfError = '';
    try {
      const conversation = await firstValueFrom(
        this.rudolfService.getConversation(),
      );
      this.rudolfConfigured = conversation.configured;
      this.rudolfMessages = conversation.messages || [];
      this.rudolfLoaded = true;
      this.scrollRudolfToBottom();
    } catch {
      this.rudolfError = this.translate.instant('RUDOLF.LOAD_ERROR');
    } finally {
      this.rudolfLoading = false;
    }
  }

  async sendRudolfMessage(): Promise<void> {
    const message = this.rudolfInput.trim();
    if (!message || this.rudolfSending || !this.rudolfConfigured) return;

    const optimisticMessage: RudolfMessage = {
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    this.rudolfMessages = [...this.rudolfMessages, optimisticMessage];
    this.rudolfInput = '';
    this.rudolfSending = true;
    this.rudolfError = '';
    this.scrollRudolfToBottom();

    try {
      const response = await firstValueFrom(
        this.rudolfService.sendMessage(message),
      );
      this.rudolfMessages = [...this.rudolfMessages, response.message];
      this.rudolfLoaded = true;
    } catch (error: any) {
      this.rudolfMessages = this.rudolfMessages.filter(
        (item) => item !== optimisticMessage,
      );
      this.rudolfInput = message;
      this.rudolfError = this.translate.instant(
        error?.status === 429 ? 'RUDOLF.LIMIT_ERROR' : 'RUDOLF.SEND_ERROR',
      );
    } finally {
      this.rudolfSending = false;
      this.scrollRudolfToBottom();
    }
  }

  useRudolfSuggestion(suggestion: string): void {
    this.rudolfInput = suggestion;
    void this.sendRudolfMessage();
  }

  getRudolfSuggestion(key: string): string {
    return this.translate.instant(key);
  }

  async confirmRudolfReset(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('RUDOLF.RESET_TITLE'),
      message: this.translate.instant('RUDOLF.RESET_TEXT'),
      buttons: [
        {
          text: this.translate.instant('RUDOLF.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('RUDOLF.RESET_CONFIRM'),
          role: 'destructive',
          handler: () => void this.resetRudolfConversation(),
        },
      ],
    });
    await alert.present();
  }

  private async resetRudolfConversation(): Promise<void> {
    try {
      await firstValueFrom(this.rudolfService.resetConversation());
      this.rudolfMessages = [];
      this.rudolfError = '';
    } catch {
      this.rudolfError = this.translate.instant('RUDOLF.SEND_ERROR');
    }
  }

  blurActive() {
  const el = document.activeElement as HTMLElement | null;
  if (el) el.blur();
}

  newChat() {
    // this.open_new_chat = true;
    // if (!this.users) this.getUsers();
     this.blurActive(); 
    this.open_new_chat = true;
  this.getUsers();
  }

  getUsers() {
    // this.chatService.getUsers();
    // this.users = this.chatService.users;
    this.users = this.chatService.getUsers();
  }

  onWillDismiss(event: any) {}

  cancel() {
    this.modal.dismiss();
    this.open_new_chat = false;
  }

  async startChat(item) {
    try {
      // this.global.showLoader();
      // create chatroom
      const room = await this.chatService.createChatRoom(item?.uid);
      this.cancel();
      const targetUid = item?.uid || item?.id || '';
      const navData: NavigationExtras = {
        queryParams: {
          name: item?.name,
          uid: targetUid,
        },
      };
      this.router.navigate(['/', 'tabs', 'home', 'chats', room?.id], navData);
      // this.global.hideLoader();
    } catch (e) {
      // this.global.hideLoader();
    }
  }

  getChat(item) {
    (item?.user).pipe(take(1)).subscribe(async (user_data) => {
      const targetUid = user_data?.uid || user_data?.id || '';
      const navData: NavigationExtras = {
        queryParams: { name: this.pickName(user_data), uid: targetUid },
      };
      // ➜ remettre le compteur à 0
      try {
        await this.chatService.markRoomRead(item?.id);
      } catch (error) {
        console.warn('markRoomRead ignored:', error);
      }
      this.router.navigate(['/', 'tabs', 'home', 'chats', item?.id], navData);
    });
  }

  getUser(user: any) {
    return user;
  }

  trackByRoomId(_index: number, room: any): string {
    return `${room?.id || room?._id || _index}`;
  }

  trackByUserId(_index: number, user: any): string {
    return `${user?.uid || user?.id || user?.email || _index}`;
  }

  trackByRudolfMessage(index: number, message: RudolfMessage): string {
    return `${message.createdAt}-${message.role}-${index}`;
  }
}
