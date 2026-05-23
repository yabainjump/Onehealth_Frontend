import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AlertController,
  PopoverController,
  ActionSheetController,
  ToastController,
  InfiniteScrollCustomEvent,
} from '@ionic/angular';
import { ApiService } from 'src/app/services/api/api.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import {
  CommentData,
  PostAttachment,
  Post,
  PublishService,
} from 'src/app/services/publish/publish.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-dashbord',
  templateUrl: './dashbord.page.html',
  styleUrls: ['./dashbord.page.scss'],
  standalone: false,
})
export class DashbordPage implements OnInit {
  @ViewChild('popover') popover: PopoverController;

  userPhoto: string = 'assets/default-profile.png';
  posts: Post[] = [];
  currentUserId: string;
  pageSize = 4;
  feedPageSize = 7;
  userId: string = '';
  filteredPosts: Post[] = [];
  searchQuery: string = '';
  canShare = true;
  private _relTimer: any;
  isLoadingFeed = true;
  isLoadingMore = false;
  hasMorePosts = true;
  currentPage = 1;
  skeletonItems = Array.from({ length: 6 });
  expanded: Record<string, boolean> = {};
  longPost: Record<string, boolean> = {};
  commentsOpen: Record<string, boolean> = {};
  commentDrafts: Record<string, string> = {};
  commentSending: Record<string, boolean> = {};

  constructor(
    public apiService: ApiService,
    private router: Router,
    private authService: AuthService,
    private publicationService: PublishService,
    private alertController: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
    private sanitizer: DomSanitizer
  ) {}

  private buildPostUrl(id: string): string {
    const origin = window.location.origin;
    return `${origin}/post-detail?id=${encodeURIComponent(id)}`;
  }

  blurActive() {
    const el = document.activeElement as HTMLElement | null;
    if (el && typeof el.blur === 'function') el.blur();
  }

  goPushPub(ev: Event) {
    ev.preventDefault(); // évite la navigation du <a> interne
    this.blurActive(); // enlève le focus du bouton
    this.router.navigateByUrl('/tabs/pushpub', { replaceUrl: false });
  }

  filterPosts() {
    const normalizedQuery = this.normalizeSearchValue(this.searchQuery);
    if (!normalizedQuery) {
      this.filteredPosts = [...this.posts];
      return;
    }

    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    this.filteredPosts = this.posts.filter((post) => {
      const searchable = this.buildSearchablePostText(post);
      return queryTokens.every((token) => searchable.includes(token));
    });
  }
  // async ngOnInit() {
  //   this.authService.getAuthState().subscribe((user) => {
  //     if (user) {
  //       this.userId = user.uid;
  //       this.loadUserPhoto();
  //     }
  //   });

  //   this.publicationService.getPosts().subscribe(async (posts) => {
  //     const processedPosts = await Promise.all(
  //       posts.map(async (post: Post) => {
  //         post.relativeTime = this.getRelativeTime(post.timestamp);
  //         const user = await this.publicationService.getUser(post.authorId);

  //         if (user) {
  //           post.author = {
  //             userName: user.username,
  //             firstName: user.firstName,
  //             lastName: user.lastName,
  //             institution: user.institution || 'No Institution',
  //             photoURL: user.photoURL,
  //           };
  //         }

  //         post.likedBy = post.likedBy || [];
  //         return post;
  //       })
  //     );

  //     this.posts = processedPosts;
  //     this.filteredPosts = [...processedPosts];
  //   });

  //   setInterval(() => {
  //     this.posts.forEach((post) => {
  //       post.relativeTime = this.getRelativeTime(post.timestamp);
  //     });
  //   }, 60000);

  //   if ((Share as any).canShare) {
  //     const { value } = await (Share as any).canShare();
  //     this.canShare = value;
  //   } else {
  //     this.canShare =
  //       !!(navigator as any).share || Capacitor.isNativePlatform();
  //   }
  // }

  async ngOnInit() {
    // 1) récupère l’UID et stocke-le dans currentUserId
    this.authService.getAuthState().subscribe((user) => {
      if (user) {
        this.currentUserId = (user.uid || '').trim();
        this.loadUserPhoto(); // si tu en as besoin
      } else {
        this.currentUserId = '';
      }
    });

    await this.loadInitialPosts();

    // 3) rafraîchir le relativeTime chaque minute (avec garde)
    this._relTimer = setInterval(() => {
      if (Array.isArray(this.posts)) {
        this.posts.forEach((post) => {
          post.relativeTime = this.getRelativeTime(post.timestamp);
        });
      }
    }, 60_000);

    // 4) détection du partage (inchangé)
    this.canShare = !!(navigator as any).share || Capacitor.isNativePlatform();
  }

  toggleExpand(id: string) {
    this.expanded[id] = !this.expanded[id];
  }

  private decoratePost(post: Post): Post {
    post.relativeTime = this.getRelativeTime(post.timestamp);
    const content = (post.content || '') as string;
    const isLong = content.length > 220 || (content.match(/\n/g)?.length || 0) > 6;
    const postId = post.id || '';
    this.longPost[postId] = isLong;
    if (this.expanded[postId] === undefined) {
      this.expanded[postId] = false;
    }
    return post;
  }

  private applyPosts(posts: Post[], append = false) {
    const prepared = posts.map((post) => this.decoratePost(post));
    this.posts = append ? [...this.posts, ...prepared] : prepared;
    this.filterPosts();
  }

  private async loadInitialPosts() {
    this.isLoadingFeed = true;
    this.currentPage = 1;
    this.hasMorePosts = true;
    this.applyPosts([], false);

    try {
      const posts = await this.publicationService.getPostsPage(
        this.currentPage,
        this.feedPageSize,
      );
      this.applyPosts(posts, false);
      this.hasMorePosts = posts.length === this.feedPageSize;
    } catch (error) {
      this.hasMorePosts = false;
      console.error('Erreur lors du chargement initial des posts :', error);
    } finally {
      this.isLoadingFeed = false;
    }
  }

  async loadMorePosts(event?: InfiniteScrollCustomEvent) {
    if (this.isLoadingMore || !this.hasMorePosts || this.isLoadingFeed) {
      event?.target.complete();
      return;
    }

    this.isLoadingMore = true;
    try {
      const nextPage = this.currentPage + 1;
      const posts = await this.publicationService.getPostsPage(
        nextPage,
        this.feedPageSize,
      );

      if (!posts.length) {
        this.hasMorePosts = false;
      } else {
        this.currentPage = nextPage;
        this.applyPosts(posts, true);
        this.hasMorePosts = posts.length === this.feedPageSize;
      }
    } catch (error) {
      console.error('Erreur lors du chargement des posts suivants :', error);
    } finally {
      this.isLoadingMore = false;
      event?.target.complete();
    }
  }

  // pour bien nettoyer l’intervalle
  ngOnDestroy() {
    if (this._relTimer) clearInterval(this._relTimer);
  }

  async loadUserPhoto() {
    try {
      const userData = await this.authService.getUserData(this.currentUserId);
      this.userPhoto =
        userData?.photoURL || userData?.photo || 'assets/default-profile.png';
    } catch (error) {
      console.error(
        'Erreur lors du chargement de la photo utilisateur :',
        error
      );
    }
  }

  getRelativeTime(timestamp: any): string {
    if (!(timestamp instanceof Date)) return 'Date invalide';

    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - timestamp.getTime()) / 1000
    );

    if (diffInSeconds < 60) {
      return `il y a ${diffInSeconds} seconde${diffInSeconds > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  }
  openPostDetail(post: Post) {
    this.router.navigate(['/post-detail'], { queryParams: { id: post.id } });
  }

  openAuthorProfile(post: Post, event?: Event) {
    event?.stopPropagation();
    const authorId = (post?.authorId || '').trim();
    if (!authorId) {
      return;
    }
    this.router.navigate(['/tabs/profils', authorId]);
  }

  async addComment(post: Post) {
    const postId = post?.id || '';
    if (!postId) return;
    this.commentsOpen[postId] = !this.commentsOpen[postId];
  }

  private async publishComment(post: Post, text: string): Promise<CommentData | null> {
    try {
      // 🔐 récupère l’UID de manière fiable (utilise la version que je t’ai donnée)
      const userId = await this.authService.getUserIdOrThrow();

      // (optionnel) récupère le profil pour afficher nom/photo dans le fil
      const prof = await this.publicationService.getUser(userId);

      const commentData: CommentData = {
        comment: text,
        userId,
        userName:
          prof?.name ??
          (prof?.firstName
            ? `${prof.firstName} ${prof.lastName ?? ''}`.trim()
            : undefined),
        userPhoto: prof?.photo ?? prof?.photoURL,
        likesCount: 0,
        userHasLiked: false,
        createdAt: new Date().toISOString(),
      };

      const createdComment = await this.publicationService.addComment(
        post.id!,
        commentData,
      );
      if (createdComment) {
        commentData.id = createdComment.id;
        commentData.createdAt = createdComment.createdAt || commentData.createdAt;
      }

      // ✅ mise à jour optimiste + déclenchement détection de changements
      post.comments = [...(post.comments ?? []), commentData];
      return commentData;
    } catch (e: any) {
      if (e?.message === 'not-auth') {
        console.warn('Veuillez vous connecter pour commenter.');
        // this.router.navigate(['/login']);
      } else {
        console.error('Erreur lors de l’ajout du commentaire :', e);
      }
      return null;
    }
  }

  async submitInlineComment(post: Post) {
    const postId = post?.id || '';
    if (!postId || this.commentSending[postId]) return;

    const text = (this.commentDrafts[postId] || '').trim();
    if (!text) return;

    this.commentSending[postId] = true;
    try {
      const saved = await this.publishComment(post, text);
      if (saved) {
        this.commentDrafts[postId] = '';
        this.commentsOpen[postId] = true;
      }
    } finally {
      this.commentSending[postId] = false;
    }
  }

  getComments(post: Post): CommentData[] {
    return post?.comments ?? [];
  }

  async likePost(post: Post) {
    try {
      const userId = await this.authService.getUserIdOrThrow();

      const alreadyLiked = !!post.userHasLiked || post.likedBy?.includes(userId);

      if (alreadyLiked) {
        await this.publicationService.unlikePost(post.id!);
        post.likes = Math.max(0, (post.likes ?? 0) - 1);
        post.userHasLiked = false;
        post.likedBy = (post.likedBy ?? []).filter((id) => id !== userId);
        return;
      }

      await this.publicationService.likePost(post.id!, userId);
      post.likes = (post.likes ?? 0) + 1;
      post.userHasLiked = true;
      post.likedBy = [...(post.likedBy ?? []), userId];
      (post as any).userHasLiked = true;
    } catch (e: any) {
      if (e?.message === 'not-auth') {
        console.warn('Utilisateur non connecté');
        // éventuellement rediriger vers /login
      } else {
        console.error('Erreur lors du like :', e);
      }
    }
  }

  async toggleCommentLike(post: Post, comment: CommentData) {
    try {
      await this.authService.getUserIdOrThrow();

      const commentId = comment.id || '';
      if (!post?.id) return;
      if (!commentId) {
        await this.retryCommentLikeAfterSync(post, comment);
        return;
      }

      if (comment.userHasLiked) {
        await this.publicationService.unlikeComment(post.id, commentId, comment);
        comment.userHasLiked = false;
        comment.likesCount = Math.max(0, (comment.likesCount ?? 0) - 1);
      } else {
        await this.publicationService.likeComment(post.id, commentId, comment);
        comment.userHasLiked = true;
        comment.likesCount = (comment.likesCount ?? 0) + 1;
      }
    } catch (error: any) {
      if (error?.status === 404 && post?.id) {
        const retried = await this.retryCommentLikeAfterSync(post, comment);
        if (retried) {
          return;
        }
      }
      console.error('Erreur lors du like commentaire :', error);
    }
  }

  private async retryCommentLikeAfterSync(post: Post, comment: CommentData) {
    const latest = await this.publicationService.getPostById(post.id!);
    if (!latest) return false;

    const mergedComments = latest.comments || [];
    post.comments = mergedComments;

    const target = mergedComments.find((item) => {
      if (comment.id && item.id === comment.id) return true;
      const sameAuthor = (item.userId || '') === (comment.userId || '');
      const sameText =
        (item.comment || '').trim() === (comment.comment || '').trim();
      if (!sameAuthor || !sameText) {
        return false;
      }

      if (comment.createdAt && item.createdAt) {
        const sourceTime = new Date(comment.createdAt).getTime();
        const candidateTime = new Date(item.createdAt).getTime();
        if (!Number.isNaN(sourceTime) && !Number.isNaN(candidateTime)) {
          return sourceTime === candidateTime;
        }
      }

      return true;
    });

    if (!target?.id) return false;

    if (target.userHasLiked) {
      await this.publicationService.unlikeComment(post.id!, target.id, target);
      target.userHasLiked = false;
      target.likesCount = Math.max(0, (target.likesCount ?? 0) - 1);
    } else {
      await this.publicationService.likeComment(post.id!, target.id, target);
      target.userHasLiked = true;
      target.likesCount = (target.likesCount ?? 0) + 1;
    }

    const idx = (post.comments || []).findIndex((item) => item.id === target.id);
    if (idx >= 0) {
      post.comments![idx] = { ...target };
    }
    return true;
  }

  async sharePost(post: Post) {
    if (!post?.id) {
      console.warn('Post sans id');
      return;
    }
    const payload = this.buildSharePayload(post);

    try {
      if ((navigator as any).share) {
        await (navigator as any).share(payload);
      } else {
        throw new Error('native-share-unavailable');
      }
    } catch (err) {
      try {
        await navigator.clipboard.writeText(
          [payload.title, payload.text, payload.url].filter(Boolean).join('\n\n').trim(),
        );
        const t = await this.toastCtrl.create({
          message: 'Lien copié',
          duration: 1500,
          icon: 'copy',
        });
        await t.present();
      } catch (e) {
        console.error('Erreur lors du partage :', err || e);
      }
    }
  }

  async presentPostActions(post: Post) {
    // sécurité: on n’ouvre le menu que pour l’auteur
    if (post.authorId !== this.currentUserId) return;

    const sheet = await this.actionSheetCtrl.create({
      header: 'Publication',
      buttons: [
        {
          text: 'Supprimer',
          role: 'destructive',
          icon: 'trash',
          handler: () => this.confirmDelete(post),
        },
        {
          text: 'Annuler',
          role: 'cancel',
        },
      ],
    });
    await sheet.present();
  }

  private async confirmDelete(post: Post) {
    const alert = await this.alertController.create({
      header: 'Supprimer ?',
      message: 'Cette action est définitive.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => this.deletePost(post),
        },
      ],
    });
    await alert.present();
  }

  private async deletePost(post: Post) {
    try {
      // Choisis l’une des deux:
      await this.publicationService.deletePostWithImages(post.id!);
      // ou bien :
      // await this.publicationService.deletePostWithImages(post.id!, post.imageUrls || []);

      // Si tu gères une liste locale:
      this.posts = (this.posts || []).filter((p) => p.id !== post.id);
      this.filterPosts();

      const t = await this.toastCtrl.create({
        message: 'Publication supprimée',
        duration: 1500,
      });
      await t.present();
    } catch (e) {
      console.error(e);
      const t = await this.toastCtrl.create({
        message: 'Suppression impossible',
        duration: 1800,
        color: 'danger',
      });
      await t.present();
    }
  }

  isOwner(post: Post): boolean {
    const a = (post?.authorId || '').trim();
    const b = (this.currentUserId || '').trim();
    return !!a && !!b && a === b;
  }

  trackByPostId(_index: number, post: Post): string {
    return post.id || String(_index);
  }

  trackByImageUrl(_index: number, url: string): string {
    return url || String(_index);
  }

  trackByComment(_index: number, comment: CommentData): string {
    if (comment.id) return comment.id;
    return `${comment.userId || 'anon'}-${comment.comment || ''}-${_index}`;
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

  isPdfAttachment(post: Post): boolean {
    const attachment = this.getAttachment(post);
    if (!attachment) return false;
    const fileName = attachment.fileName?.toLowerCase() || '';
    return attachment.mimeType === 'application/pdf' || fileName.endsWith('.pdf');
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(size < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
  }

  getDocumentPreviewUrl(post: Post): SafeResourceUrl {
    const attachment = this.getAttachment(post);
    if (!attachment?.url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }

    const url = this.isPdfAttachment(post)
      ? `${attachment.url}#view=FitH`
      : `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(attachment.url)}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openAttachment(post: Post, event?: Event) {
    event?.stopPropagation();
    const url = this.getAttachment(post)?.url;
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  private normalizeSearchValue(value: unknown): string {
    return `${value || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s@#._-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getAuthorFullName(post: Post): string {
    const firstName = `${post.author?.firstName || ''}`.trim();
    const lastName = `${post.author?.lastName || ''}`.trim();
    const merged = `${firstName} ${lastName}`.trim();
    return merged || `${post.author?.userName || ''}`.trim() || 'Utilisateur';
  }

  private formatTimestampForSearch(timestamp: Date): string {
    if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
      return '';
    }
    return timestamp.toISOString();
  }

  private getImageNameParts(post: Post): string {
    const urls = [...(post.imageUrls || []), post.imageUrl || ''].filter(Boolean);
    const names = urls.map((rawUrl) => {
      try {
        const pathname = new URL(rawUrl, window.location.origin).pathname;
        const fileName = pathname.split('/').pop() || '';
        return decodeURIComponent(fileName);
      } catch {
        return rawUrl;
      }
    });
    return names.join(' ');
  }

  private buildPostMetadata(post: Post): string {
    const commentCount = post.comments?.length || 0;
    const commentsText = (post.comments || [])
      .map((comment) => `${comment.userName || ''} ${comment.comment || ''}`.trim())
      .join(' ');
    const dynamicMeta = this.extractDynamicMetadata(post);

    const metadataParts = [
      this.getAuthorFullName(post),
      post.author?.userName || '',
      post.author?.institution || '',
      post.attachment?.fileName || '',
      post.attachment?.mimeType || '',
      post.title || '',
      post.content || '',
      post.id || '',
      `${post.likes || 0}`,
      `${commentCount}`,
      this.formatTimestampForSearch(post.timestamp),
      post.relativeTime || '',
      commentsText,
      this.getImageNameParts(post),
      dynamicMeta,
    ];

    return metadataParts.filter(Boolean).join(' ');
  }

  private buildSearchablePostText(post: Post): string {
    return this.normalizeSearchValue(this.buildPostMetadata(post));
  }

  private buildSharePayload(post: Post): { title: string; text: string; url: string } {
    const url = this.buildPostUrl(post.id!);
    const authorName = this.getAuthorFullName(post);
    const institution = `${post.author?.institution || ''}`.trim();
    const publishedAt =
      post.timestamp instanceof Date && !Number.isNaN(post.timestamp.getTime())
        ? post.timestamp.toLocaleString('fr-FR')
        : '';
    const commentCount = post.comments?.length || 0;
    const excerpt = `${post.content || ''}`.trim();
    const trimmedExcerpt = excerpt.length > 220 ? `${excerpt.slice(0, 217)}...` : excerpt;

    const metadataLines = [
      `Auteur: ${authorName}`,
      institution ? `Institution: ${institution}` : '',
      publishedAt ? `Publié: ${publishedAt}` : '',
      `Likes: ${post.likes || 0}`,
      `Commentaires: ${commentCount}`,
      this.extractDynamicMetadata(post),
    ].filter(Boolean);

    const shareTitle = `${post.title || 'Publication OneHealth'}`.trim();
    const shareText = [trimmedExcerpt, metadataLines.join(' | ')].filter(Boolean).join('\n\n');

    return {
      title: shareTitle,
      text: shareText,
      url,
    };
  }

  private extractDynamicMetadata(post: Post): string {
    const anyPost = post as Post & {
      metadata?: unknown;
      meta?: unknown;
      sharedBy?: unknown;
      sharedAt?: unknown;
      shareContext?: unknown;
    };

    const candidates = [
      anyPost.metadata,
      anyPost.meta,
      anyPost.sharedBy,
      anyPost.sharedAt,
      anyPost.shareContext,
    ];

    const flatten = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return `${value}`;
      }
      if (Array.isArray(value)) {
        return value.map((item) => flatten(item)).filter(Boolean).join(' ');
      }
      if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>)
          .map((entry) => flatten(entry))
          .filter(Boolean)
          .join(' ');
      }
      return '';
    };

    return candidates.map((item) => flatten(item)).filter(Boolean).join(' ');
  }
}
