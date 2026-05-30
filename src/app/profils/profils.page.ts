import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { IonPopover, ToastController } from '@ionic/angular';
import { combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { UploadService } from '../core/services/upload.service';
import { UsersService } from '../core/services/users.service';
import { ShareLinkService } from '../core/services/share-link.service';
import { resolveMediaUrl } from '../core/utils/media-url.util';
import { AuthService } from '../services/auth/auth.service';
import { ChatService } from '../services/chat/chat.service';
import { PublishService, Post, PostAttachment } from 'src/app/services/publish/publish.service';

@Component({
  selector: 'app-profils',
  templateUrl: './profils.page.html',
  styleUrls: ['./profils.page.scss'],
  standalone: false,
})
export class ProfilsPage implements OnInit {
  private static readonly COLLAPSE_CHAR_LIMIT = 220;
  private static readonly COLLAPSE_LINE_LIMIT = 6;

  @ViewChild('popover') popover?: IonPopover;

  user: any = {};
  posts: Post[] = [];
  userId: string = '';
  currentUserId = '';
  photoURL: string = 'assets/default-profile.png';
  coverPhotoURL: string = 'assets/images/bg1.avif';

  posts$: Observable<Post[]> = of([]);
  loadingPosts = true;
  uploadingCover = false;
  followProcessing = false;
  expanded: Record<string, boolean> = {};
  longPost: Record<string, boolean> = {};

  constructor(
    private authService: AuthService,
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
    private readonly sanitizer: DomSanitizer,
    private readonly toastController: ToastController,
    private readonly shareLinkService: ShareLinkService,
    public chatService: ChatService,
    private router: Router,
    private route: ActivatedRoute,
    private publishService: PublishService
  ) { }

  ngOnInit() {
    combineLatest([this.authService.getAuthState(), this.route.paramMap]).subscribe({
      next: ([logged, params]) => this.syncProfileContext(logged?.uid || '', params),
      error: (error) => console.error('Erreur de synchronisation profil:', error),
    });
  }

  get isOwnProfile(): boolean {
    return !!this.currentUserId && this.currentUserId === this.userId;
  }

  get displayName(): string {
    const fullName = `${this.user?.firstName || ''} ${this.user?.lastName || ''}`.trim();
    return fullName || this.user?.username || 'OneHealth Member';
  }

  get displayRole(): string {
    return this.user?.institution || this.user?.typeMedecin || 'Membre OneHealth';
  }

  get bioText(): string {
    return (
      this.user?.bio ||
      'Designing fluid communication experiences for healthcare professionals.'
    );
  }

  get postsCount(): string {
    return this.formatCount(this.posts.length);
  }

  get followersCount(): string {
    return this.formatCount(
      this.resolveMetricValue(
        this.user?.followers,
        this.user?.followersCount ?? 0,
      ),
    );
  }

  get followingCount(): string {
    return this.formatCount(
      this.resolveMetricValue(
        this.user?.following,
        this.user?.followingCount ?? 0,
      ),
    );
  }

  get isFollowingUser(): boolean {
    return !!this.user?.isFollowing;
  }

  get followButtonLabel(): string {
    return this.isFollowingUser ? 'Following' : 'Follow';
  }

  blurActive() {
    const el = document.activeElement as HTMLElement | null;
    if (el && typeof el.blur === 'function') {
      el.blur();
    }
  }

  async loadUserProfile() {
    if (!this.userId) {
      return;
    }

    try {
      const user = await firstValueFrom(this.usersService.getUserById(this.userId));
      if (user) {
        this.setUserData(user);
        return;
      }
      const legacyUser = await this.authService.getUserData(this.userId);
      if (legacyUser) {
        this.setUserData(legacyUser);
        return;
      }
      console.warn('Profil introuvable pour uid:', this.userId);
    } catch (error) {
      console.error('Erreur chargement profil :', error);
      this.user = {};
      this.photoURL = 'assets/default-profile.png';
      this.coverPhotoURL = 'assets/images/bg1.avif';
    }
  }

  private setUserData(data: any) {
    this.user = data || {};
    this.photoURL =
      resolveMediaUrl(data?.photoURL || data?.photo) || 'assets/default-profile.png';
    this.coverPhotoURL =
      resolveMediaUrl(data?.coverPhotoURL) || 'assets/images/bg1.avif';
    const followersCount = this.resolveMetricValue(
      data?.followers,
      data?.followersCount ?? 0,
    );
    const followingCount = this.resolveMetricValue(
      data?.following,
      data?.followingCount ?? 0,
    );
    this.user.followersCount = followersCount;
    this.user.followingCount = followingCount;
    this.user.isFollowing = !!data?.isFollowing;
  }

  private syncProfileContext(currentUid: string, params: ParamMap) {
    this.currentUserId = currentUid;
    const routeUid = params.get('uid');
    const targetUid = routeUid || currentUid || '';

    if (!targetUid || targetUid === this.userId) {
      return;
    }

    this.userId = targetUid;
    this.loadingPosts = true;
    void this.loadUserProfile();
    this.posts$ = this.publishService.getPostsByAuthor(this.userId).pipe(
      tap((items) => {
        this.posts = items;
        this.preparePostTextPresentation(items);
        this.loadingPosts = false;
      }),
      catchError((e) => {
        this.loadingPosts = false;
        this.posts = [];
        this.longPost = {};
        this.expanded = {};
        console.error(e);
        return of([]);
      })
    );
  }

  private resolveMetricValue(value: any, fallback = 0): number {
    if (Array.isArray(value)) {
      return value.length;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private formatCount(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return `${value}`;
  }

  trackByPostId(index: number, post: Post): string | number {
    return post?.id || index;
  }

  toggleExpand(postId: string, event?: Event) {
    event?.stopPropagation();
    this.expanded[postId] = !this.expanded[postId];
  }

  formatPostContent(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }

    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
    const linkified = escaped.replace(urlRegex, (match: string) => {
      const href = match.startsWith('http') ? match : `https://${match}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    });

    const withBreaks = linkified.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(withBreaks);
  }

  stopPostBodyClick(event: Event) {
    event.stopPropagation();
  }

  private getAttachment(post: Post): PostAttachment | null | undefined {
    return post?.attachment;
  }

  hasVideoAttachment(post: Post): boolean {
    return this.getAttachment(post)?.type === 'video';
  }

  hasDocumentAttachment(post: Post): boolean {
    return this.getAttachment(post)?.type === 'document';
  }

  getDocumentPreviewUrl(post: Post): SafeResourceUrl {
    const attachment = this.getAttachment(post);
    if (!attachment?.url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }

    // Tous les documents (PDF inclus) sont previsualises via Google Docs Viewer.
    // Embarquer le fichier directement depuis le backend echouerait : ce dernier
    // refuse le framing cross-sous-domaine (X-Frame-Options).
    const url = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
      attachment.url,
    )}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openAttachment(post: Post, event?: Event) {
    event?.stopPropagation();
    const url = this.getAttachment(post)?.url;
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  async onCoverSelected(event: Event) {
    if (!this.isOwnProfile || this.uploadingCover) {
      return;
    }

    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (input) {
      input.value = '';
    }

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      console.warn('Veuillez choisir une image pour la photo de mur.');
      return;
    }

    this.uploadingCover = true;
    try {
      const uploaded = await firstValueFrom(this.uploadService.uploadProfile(file));
      await firstValueFrom(this.usersService.updateMe({ coverPhotoURL: uploaded.url }));
      this.coverPhotoURL = resolveMediaUrl(uploaded.url);
      this.user = { ...this.user, coverPhotoURL: resolveMediaUrl(uploaded.url) };
    } catch (error) {
      console.error('Erreur lors de la mise a jour de la photo de mur :', error);
    } finally {
      this.uploadingCover = false;
    }
  }

  openPostDetail(p: Post) {
    if (!p?.id) {
      console.warn('Post sans id');
      return;
    }
    this.router.navigate(['/post-detail'], {
      queryParams: { id: p.id },
    });
  }

  async shareProfile(event?: Event) {
    event?.stopPropagation();
    const url = this.shareLinkService.buildProfileShareUrl(this.userId);
    const title = `${this.displayName} • One Health Network`;
    const text = `${this.displayName} - ${this.displayRole}`;
    await this.shareWithFallback({ title, text, url });
  }

  async sharePost(post: Post, event?: Event) {
    event?.stopPropagation();
    const postId = `${post?.id || ''}`.trim();
    if (!postId) {
      return;
    }

    const url = this.shareLinkService.buildPostShareUrl(postId);
    const excerpt = `${post.content || post.title || ''}`.trim();
    const text = excerpt.length > 220 ? `${excerpt.slice(0, 217)}...` : excerpt;
    const title = `${post.title || 'Publication OneHealth'}`.trim();
    await this.shareWithFallback({ title, text, url });
  }

  async openMessage() {
    if (this.isOwnProfile || !this.userId) {
      return;
    }

    this.blurActive();
    await this.popover?.dismiss();
    try {
      const room = await this.chatService.createChatRoom(this.userId);
      await this.router.navigate(['/tabs/home/chats', room?.id], {
        queryParams: { name: this.displayName, uid: this.userId },
      });
    } catch (error) {
      console.error('Impossible d’ouvrir la discussion :', error);
    }
  }

  async toggleFollow() {
    if (this.isOwnProfile || !this.userId || this.followProcessing) {
      return;
    }

    this.followProcessing = true;
    try {
      const response = this.isFollowingUser
        ? await firstValueFrom(this.usersService.unfollowUser(this.userId))
        : await firstValueFrom(this.usersService.followUser(this.userId));

      if (response) {
        this.setUserData({
          ...this.user,
          ...response,
        });
      }
    } catch (error) {
      console.error('Erreur follow/unfollow :', error);
    } finally {
      this.followProcessing = false;
    }
  }

  async editProfile() {
    this.blurActive();
    await this.popover?.dismiss();
    await this.router.navigate(['/edit-profile']);
  }

  async logout() {
    this.blurActive();
    await this.popover?.dismiss();
    try {
      await this.chatService.auth.logout();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (e) {
      console.error('Erreur lors de la déconnexion :', e);
    }
  }

  private preparePostTextPresentation(posts: Post[]) {
    const nextLongPost: Record<string, boolean> = {};
    const nextExpanded = { ...this.expanded };

    for (const post of posts) {
      const postId = (post?.id || '').trim();
      if (!postId) {
        continue;
      }

      const content = `${post?.content || post?.title || ''}`;
      const lineBreakCount = (content.match(/\n/g) || []).length;
      const isLong =
        content.length > ProfilsPage.COLLAPSE_CHAR_LIMIT ||
        lineBreakCount > ProfilsPage.COLLAPSE_LINE_LIMIT;

      nextLongPost[postId] = isLong;

      if (nextExpanded[postId] === undefined) {
        nextExpanded[postId] = false;
      }
    }

    this.longPost = nextLongPost;
    this.expanded = nextExpanded;
  }

  private async shareWithFallback(payload: {
    title: string;
    text: string;
    url: string;
  }) {
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // Fallback clipboard below.
      }
    }

    try {
      await navigator.clipboard.writeText(
        [payload.title, payload.text, payload.url].filter(Boolean).join('\n\n').trim(),
      );
      const toast = await this.toastController.create({
        message: 'Lien copié',
        duration: 1500,
        icon: 'copy',
      });
      await toast.present();
    } catch {
      const toast = await this.toastController.create({
        message: 'Partage impossible',
        duration: 1500,
        color: 'danger',
      });
      await toast.present();
    }
  }
}
