import { ChatService } from './../../services/chat/chat.service';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, NavigationExtras, Router } from '@angular/router';
import { IonContent, ModalController, PopoverController } from '@ionic/angular';
import { Observable, Subscription, map, take } from 'rxjs';
import { ApiService } from 'src/app/services/api/api.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'src/app/services/auth/auth.service';
import { InteractionGuardService } from 'src/app/core/services/interaction-guard.service';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';

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
  @ViewChild('contentChat', { static: false }) contentChat: IonContent;
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
    private http: HttpClient,
    private translate: TranslateService,
    private interactionGuard: InteractionGuardService
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
  textToSend = '';
  chats: { message: string; sender: string }[] = [];

  

  async ngOnInit() {
    this.translate.get('HOME.EMPTY_TITLE').subscribe((t) => (this.model.title = t));
    if (!(await this.interactionGuard.requireAuth())) {
      void this.router.navigateByUrl('/tabs/dashbord', { replaceUrl: true });
      return;
    }
    this.getRooms();
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

  scrollToBottom() {
    if (this.chats) this.contentChat.scrollToBottom(500);
  }

  async sendMessage() {
    const botApiUrl = (environment.botApiUrl || '').trim();
    if (!botApiUrl) {
      alert('Service momentanement indisponible');
      return;
    }

    if (environment.production && !botApiUrl.toLowerCase().startsWith('https://')) {
      alert('Configuration securite invalide (HTTPS requis).');
      return;
    }
    this.chats = [
      ...this.chats,
      {
        message: this.textToSend,
        sender: this.chatService.currentUserId,
      },
    ];
    this.scrollToBottom();
    this.http
      .post<any>(
        botApiUrl,
        {
          username: this.currentUser?.name || this.currentUser?.username || 'User',
          query: this.textToSend,
          user_id: this.chatService.currentUserId,
          sended_at: new Date().toISOString(),
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
      .subscribe(
        (data) => {

          this.chats = [
            ...this.chats,
            {
              message: data['query_response'],
              sender: '',
            },
          ];
        },
        (error) => {
          console.error(error);
          alert('An error occured! Please try again');
        }
      );
    this.textToSend = '';
   
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

  trackByChatIndex(index: number): number {
    return index;
  }
}


