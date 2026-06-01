import { ChatService } from './../../../services/chat/chat.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, NavController, ToastController } from '@ionic/angular';
import { firstValueFrom, Observable, take } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  
  standalone: false,
})
export class ChatPage implements OnInit, OnDestroy {
  private static readonly MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

  @ViewChild(IonContent, { static: false }) content: IonContent;
  @ViewChild('fileInput', { static: false })
  fileInput!: ElementRef<HTMLInputElement>;

  myPhoto = 'assets/default-profile.png';
  otherPhoto = 'assets/default-profile.png';
  otherUid = '';
  otherStatusText = 'hors ligne';
  myUid: string | null = null;
  private participantUid = '';
  private roomRecoveryInProgress = false;
  private statusRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private readSyncTimer: ReturnType<typeof setInterval> | null = null;
  private messageRefreshTimer: ReturnType<typeof setInterval> | null = null;

  id: string;
  name: string;
  chats: Observable<any[]>;
  message: string;
  isLoading: boolean;
  model = {
    icon: 'chatbubble-ellipses-outline',
    title: 'No Conversation',
    color: 'dark',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    public chatService: ChatService
  ) {}

  private pickPhoto(u: any): string {
    return (
      u?.photoURL ||
      u?.photo ||
      u?.avatar ||
      u?.profilePicture ||
      'assets/default-profile.png'
    );
  }

  async ngOnInit() {
    const data: any = this.route.snapshot.queryParams;
    const wasRecovered = `${data?.recovered || ''}` === '1';
    if (data?.name) {
      this.name = data.name;
    }
    this.participantUid = `${data?.uid || ''}`.trim();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.navCtrl.back();
      return;
    }
    this.id = id;
    this.chatService.getChatRoomMessages(this.id);
    try {
      await this.chatService.markRoomRead(this.id);
    } catch (error) {
      if (await this.tryRecoverMissingRoom(error)) {
        return;
      }
    }

    this.chats = this.chatService.selectedChatRoomMessages;
    this.startMessageRefresh();

    const authUser = await firstValueFrom(
      this.chatService.auth.getAuthState().pipe(take(1))
    );
    this.myUid = authUser?.uid ?? this.chatService.currentUserId ?? null;

    try {
      const info = await this.chatService.getRoomInfo(
        this.id,
        this.myUid || undefined
      );
      this.otherUid = info?.otherUid || '';
      if (!this.participantUid && this.otherUid) {
        this.participantUid = this.otherUid;
      }
      this.otherPhoto = this.pickPhoto(info?.otherUser);
      this.otherStatusText = this.formatPresenceStatus(info?.otherUser);
      this.myPhoto = this.pickPhoto(info?.myUser);
      this.startStatusRefresh();
      this.startReadSync();
    } catch (e) {
      if (await this.tryRecoverMissingRoom(e)) {
        return;
      }
      // silencieux: on garde les avatars par défaut
      console.warn('roomInfo error:', e);
    }
    if (wasRecovered) {
      await this.presentToast('Conversation restaurée avec succès.', 'success');
    }
  }

  triggerFile() {
    this.fileInput?.nativeElement?.click();
  }

  async onFileChosen(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > ChatPage.MAX_ATTACHMENT_BYTES) {
      await this.presentToast(
        'Fichier trop lourd. Choisis un fichier moins lourd (max 50 MB).',
      );
      input.value = '';
      return;
    }
    try {
      this.isLoading = true;
      await this.chatService.sendMessage(this.id, undefined, file);
      this.scrollToBottom();
    } catch (error: any) {
      console.error(error);
      if (
        error?.message === 'FILE_TOO_LARGE' ||
        `${error?.error?.message || ''}`.toLowerCase().includes('file too large')
      ) {
        await this.presentToast(
          'Fichier trop lourd. Choisis un fichier moins lourd (max 50 MB).',
        );
      } else {
        await this.presentToast('Impossible d’envoyer ce fichier pour le moment.');
      }
    } finally {
      this.isLoading = false;
      input.value = ''; // reset pour pouvoir re-sélectionner la même image ensuite
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.statusRefreshTimer) {
      clearInterval(this.statusRefreshTimer);
      this.statusRefreshTimer = null;
    }
    if (this.readSyncTimer) {
      clearInterval(this.readSyncTimer);
      this.readSyncTimer = null;
    }
    if (this.messageRefreshTimer) {
      clearInterval(this.messageRefreshTimer);
      this.messageRefreshTimer = null;
    }
  }

  // Quasi temps reel : re-recupere les messages periodiquement (pas de WebSocket).
  private startMessageRefresh() {
    if (!this.id || this.messageRefreshTimer) {
      return;
    }

    this.messageRefreshTimer = setInterval(() => {
      this.chatService.getChatRoomMessages(this.id);
    }, 4000);
  }

  scrollToBottom() {
    if (!this.content) return;
    this.content.scrollToBottom(300);
  }

  async sendMessage() {
    if (!this.message || this.message?.trim() == '') {
      // this.global.errorToast('Please enter a proper message', 2000);
      return;
    }
    try {
      this.isLoading = true;
      await this.chatService.sendMessage(this.id, this.message);
      this.message = '';
      this.isLoading = false;
      this.scrollToBottom();
    } catch (e) {
      this.isLoading = false;
      console.log(e);
      await this.presentToast('Impossible d’envoyer le message.');
      // this.global.errorToast();
    }
  }

  async openOptionsMenu() {
    await this.presentToast('Paramètres de discussion bientôt disponibles.');
  }

  async openOtherUserProfile() {
    if (!this.otherUid) {
      await this.presentToast('Profil utilisateur indisponible.');
      return;
    }
    await this.navCtrl.navigateForward(`/tabs/profils/${this.otherUid}`);
  }

  trackByMessageId(_index: number, message: any): string {
    return `${message?.id || _index}`;
  }

  isDocumentMessage(message: any) {
    return !!message?.fileUrl && !this.isImageMessage(message);
  }

  isImageMessage(message: any) {
    if (message?.imageUrl) {
      return true;
    }
    return `${message?.fileMimeType || ''}`.toLowerCase().startsWith('image/');
  }

  readReceiptClass(message: any) {
    if (message?.sender !== this.chatService.currentUserId) {
      return '';
    }
    return message?.isRead ? 'read' : 'delivered';
  }

  openAttachment(message: any) {
    const targetUrl = message?.fileUrl || message?.imageUrl;
    if (!targetUrl) {
      return;
    }
    window.open(targetUrl, '_blank', 'noopener');
  }

  formatFileSize(size?: number) {
    if (!size || size <= 0) {
      return '';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  private async presentToast(
    message: string,
    color: 'warning' | 'success' = 'warning',
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      position: 'top',
      color,
    });
    await toast.present();
  }

  private startStatusRefresh() {
    if (!this.otherUid || this.statusRefreshTimer) {
      return;
    }

    this.statusRefreshTimer = setInterval(() => {
      void this.refreshOtherUserStatus();
    }, 30_000);
  }

  private startReadSync() {
    if (!this.id || this.readSyncTimer) {
      return;
    }

    this.readSyncTimer = setInterval(() => {
      void this.chatService.markRoomRead(this.id).catch(() => undefined);
    }, 8_000);
  }

  private async refreshOtherUserStatus() {
    if (!this.otherUid) {
      return;
    }

    try {
      const user = await this.chatService.auth.getUserData(this.otherUid);
      this.otherStatusText = this.formatPresenceStatus(user);
    } catch {
      // keep previous status
    }
  }

  private async tryRecoverMissingRoom(error: unknown): Promise<boolean> {
    if (!this.isMissingRoomError(error)) {
      return false;
    }

    if (this.roomRecoveryInProgress) {
      return true;
    }

    const targetUid = this.participantUid?.trim();
    if (!targetUid) {
      await this.presentToast('Discussion introuvable. Ouvre-la depuis la liste de chats.');
      this.navCtrl.back();
      return true;
    }

    this.roomRecoveryInProgress = true;
    try {
      const room = await this.chatService.createChatRoom(targetUid);
      const recoveredRoomId = room?.id;
      if (!recoveredRoomId || recoveredRoomId === this.id) {
        throw new Error('ROOM_RECOVERY_FAILED');
      }

      await this.router.navigate(['/tabs/home/chats', recoveredRoomId], {
        replaceUrl: true,
        queryParams: {
          name: this.name || '',
          uid: targetUid,
          recovered: '1',
        },
      });
      return true;
    } catch (recoveryError) {
      console.error('Room recovery error:', recoveryError);
      await this.presentToast('Discussion indisponible pour le moment.');
      this.navCtrl.back();
      return true;
    } finally {
      this.roomRecoveryInProgress = false;
    }
  }

  private isMissingRoomError(error: unknown): boolean {
    const status = (error as HttpErrorResponse)?.status;
    if (status === 404) {
      return true;
    }

    const err = error as any;
    const msg = `${err?.message || err?.error?.message || ''}`.toLowerCase();
    return msg.includes('room-not-found') || msg.includes('room not found');
  }

  private formatPresenceStatus(user: any) {
    if (user?.isOnline) {
      return 'en ligne';
    }

    if (!user?.lastSeenAt) {
      return 'hors ligne';
    }

    const lastSeenDate = new Date(user.lastSeenAt);
    if (Number.isNaN(lastSeenDate.getTime())) {
      return 'hors ligne';
    }

    const formatted = new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(lastSeenDate);

    return `vu le ${formatted}`;
  }
}
