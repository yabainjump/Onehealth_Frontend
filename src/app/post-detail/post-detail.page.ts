import { Component, OnInit, ViewChild } from '@angular/core';
import { CommentData, Post, PostAttachment, PublishService } from '../services/publish/publish.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { buildPostHtml, hashtagFromClick } from '../shared/utils/post-html.util';
import { IonInput, ToastController } from '@ionic/angular';
import { ShareLinkService } from '../core/services/share-link.service';
import { AuthService } from '../services/auth/auth.service';
import { InteractionGuardService } from '../core/services/interaction-guard.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-post-detail',
  templateUrl: './post-detail.page.html',
  styleUrls: ['./post-detail.page.scss'],
  
  standalone: false,
})
export class PostDetailPage implements OnInit {
  post: Post | null = null;
  posts: Post[] = [];
  expanded: Record<string, boolean> = {};
longPost:   Record<string, boolean> = {};
  commentsWithUsers: {
    text: string;
    username: string;
    userPhotoURL: string;
    userIsCertified?: boolean;
  }[] = [];
  @ViewChild('commentInput') commentInput?: IonInput;
  commentDraft = '';
  commentSending = false;
  constructor(
    private route: ActivatedRoute,
    private publishService: PublishService,
    private sanitizer: DomSanitizer,
    private readonly toastController: ToastController,
    private readonly shareLinkService: ShareLinkService,
    private readonly authService: AuthService,
    private readonly translate: TranslateService,
    private readonly interactionGuard: InteractionGuardService,
    private readonly router: Router,
  ) {}

  /** Clic sur un #hashtag dans le contenu → page de résultats du tag. */
  onPostBodyClick(event: Event): void {
    const tag = hashtagFromClick(event);
    if (tag) {
      event.preventDefault();
      void this.router.navigate(['/tags', tag]);
    }
  }

  async ngOnInit() {
    const postId = this.resolvePostIdFromRoute();
    if (!postId) return;

    // 🔁 Appel modulaire : Promise version
    const rawPost = await this.publishService.getPostById(postId);
    if (!rawPost) {
      console.warn('Post introuvable pour id :', postId);
      return;
    }

    // ✅ CONVERSION ici
    if ((rawPost.timestamp as any)?.seconds) {
      rawPost.timestamp = new Date((rawPost.timestamp as any).seconds * 1000);
    }

    this.post = rawPost;

    const content = `${this.post.content || this.post.title || ''}`;
    const isLong = content.length > 220 || (content.match(/\n/g)?.length || 0) > 6;
    if (this.post.id) {
      this.longPost[this.post.id] = isLong;
      this.expanded[this.post.id] = false;
    }

    if (!this.post.author && rawPost.authorId) {
      const author = await this.publishService.getUser(rawPost.authorId);
      this.post.author = {
        userName: author?.username || 'Username',
        firstName: author?.firstName || 'Utilisateur',
        lastName: author?.lastName || '',
        institution: author?.institution || 'Institution inconnue',
        photoURL: author?.photoURL || 'assets/default-profile.png',
      };
    }

    this.commentsWithUsers = [];
    const rawComments = rawPost.comments || [];
    const enriched = await Promise.all(
      rawComments.map(async (rawComment) => {
        if (typeof rawComment === 'string') {
          return {
            text: rawComment,
            username: 'Anonyme',
            userPhotoURL: 'assets/default-profile.png',
          };
        }

        if (rawComment?.comment && rawComment?.userName) {
          return {
            text: rawComment.comment,
            username: rawComment.userName,
            userPhotoURL: rawComment.userPhoto || 'assets/default-profile.png',
            userIsCertified: !!rawComment.userIsCertified,
          };
        }

        if (rawComment?.comment && rawComment?.userId) {
          const user = await this.publishService.getUser(rawComment.userId);
          return {
            text: rawComment.comment,
            username: user ? `${user.firstName} ${user.lastName}` : 'Anonyme',
            userPhotoURL: user?.photoURL || 'assets/default-profile.png',
            userIsCertified: !!user?.isCertified,
          };
        }

        return null;
      }),
    );
    this.commentsWithUsers = enriched.filter(
      (value): value is NonNullable<typeof value> => !!value,
    );
    
  }

  private resolvePostIdFromRoute(): string | null {
    const queryId = this.route.snapshot.queryParamMap.get('id');
    if (queryId) {
      return queryId;
    }

    const localId = this.route.snapshot.paramMap.get('id');
    if (localId) {
      return localId;
    }

    const parentId = this.route.parent?.snapshot.paramMap.get('id');
    if (parentId) {
      return parentId;
    }

    for (let i = this.route.pathFromRoot.length - 1; i >= 0; i--) {
      const candidate = this.route.pathFromRoot[i].snapshot.paramMap.get('id');
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  toggleExpand(id: string) {
  this.expanded[id] = !this.expanded[id];
}

  private getAttachment(post: Post | null): PostAttachment | null | undefined {
    return post?.attachment;
  }

  hasVideoAttachment(post: Post | null): boolean {
    return this.getAttachment(post)?.type === 'video';
  }

  hasDocumentAttachment(post: Post | null): boolean {
    return this.getAttachment(post)?.type === 'document';
  }

  openAttachment(post: Post | null) {
    const url = this.getAttachment(post)?.url;
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  // En quittant la page (gardée en cache par Ionic), on coupe la lecture.
  ionViewWillLeave(): void {
    document
      .querySelectorAll<HTMLVideoElement>('video.post-video')
      .forEach((video) => video.pause());
  }

  /** #t=0.1 : force l'affichage de la première image même sans poster. */
  videoSrc(url?: string | null): string {
    return url ? `${url}#t=0.1` : '';
  }

  isPdfAttachment(post: Post | null): boolean {
    const attachment = this.getAttachment(post);
    if (!attachment || attachment.type !== 'document') {
      return false;
    }
    return (
      (attachment.mimeType || '').toLowerCase().includes('pdf') ||
      /\.pdf(\?.*)?$/i.test(attachment.fileName || attachment.url || '')
    );
  }

  // Mémoïsé : un nouvel objet SafeResourceUrl à chaque cycle rechargerait l'iframe.
  private readonly pdfUrlCache = new Map<string, SafeResourceUrl>();

  pdfPreviewUrl(post: Post | null): SafeResourceUrl | null {
    const url = this.getAttachment(post)?.url;
    if (!url) {
      return null;
    }
    let safe = this.pdfUrlCache.get(url);
    if (!safe) {
      safe = this.sanitizer.bypassSecurityTrustResourceUrl(
        `${url}#toolbar=0&navpanes=0&view=FitH`,
      );
      this.pdfUrlCache.set(url, safe);
    }
    return safe;
  }

  // Repli : si la miniature (/api/media/thumb) echoue, on charge l'image originale.
  onMediaError(event: Event, fallback?: string): void {
    const img = event.target as HTMLImageElement | null;
    if (img && fallback && img.getAttribute('src') !== fallback) {
      img.src = fallback;
    }
  }

  formatPostContent(value: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(buildPostHtml(value));
  }

  trackByImage(_index: number, img: string): string {
    return img || String(_index);
  }

  trackByComment(
    _index: number,
    comment: { text: string; username: string; userPhotoURL: string },
  ): string {
    return `${comment.username || 'user'}-${comment.text || ''}-${_index}`;
  }

  async likePost(): Promise<void> {
    if (!this.post?.id) {
      return;
    }
    if (!(await this.interactionGuard.requireAuth())) {
      return;
    }
    try {
      const userId = await this.authService.getUserIdOrThrow();
      if (this.post.userHasLiked) {
        await this.publishService.unlikePost(this.post.id);
        this.post.likes = Math.max(0, (this.post.likes ?? 0) - 1);
        this.post.userHasLiked = false;
      } else {
        await this.publishService.likePost(this.post.id, userId);
        this.post.likes = (this.post.likes ?? 0) + 1;
        this.post.userHasLiked = true;
      }
    } catch (error) {
      console.error('Erreur lors du like :', error);
    }
  }

  focusComposer(): void {
    setTimeout(() => {
      void this.commentInput?.setFocus();
    }, 50);
  }

  async submitComment(): Promise<void> {
    if (!(await this.interactionGuard.requireAuth())) {
      return;
    }
    const text = (this.commentDraft || '').trim();
    if (!text || this.commentSending || !this.post?.id) {
      return;
    }

    this.commentSending = true;
    try {
      const userId = await this.authService.getUserIdOrThrow();
      const profile = await this.publishService.getUser(userId);
      const commentData: CommentData = {
        comment: text,
        userId,
        userName:
          profile?.name ??
          (profile?.firstName
            ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
            : undefined),
        userPhoto: profile?.photo ?? profile?.photoURL,
        likesCount: 0,
        userHasLiked: false,
        createdAt: new Date().toISOString(),
      };

      await this.publishService.addComment(this.post.id, commentData);

      this.commentsWithUsers = [
        ...this.commentsWithUsers,
        {
          text,
          username: commentData.userName || 'Utilisateur',
          userPhotoURL: commentData.userPhoto || 'assets/default-profile.png',
        },
      ];
      this.commentDraft = '';
    } catch (error) {
      console.error('Erreur lors de l’ajout du commentaire :', error);
      const toast = await this.toastController.create({
        message: this.translate.instant('POSTDETAIL.COMMENT_FAILED'),
        duration: 1800,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.commentSending = false;
    }
  }

  async shareCurrentPost() {
    const postId = `${this.post?.id || ''}`.trim();
    if (!postId) {
      return;
    }

    const url = this.shareLinkService.buildPostShareUrl(postId);
    const title = `${this.post?.title || 'Publication OneHealth'}`.trim();
    const excerpt = `${this.post?.content || this.post?.title || ''}`.trim();
    const text = excerpt.length > 220 ? `${excerpt.slice(0, 217)}...` : excerpt;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Fallback clipboard below.
      }
    }

    try {
      await navigator.clipboard.writeText([title, text, url].filter(Boolean).join('\n\n').trim());
      const toast = await this.toastController.create({
        message: this.translate.instant('COMMON.LINK_COPIED'),
        duration: 1500,
        icon: 'copy',
      });
      await toast.present();
    } catch {
      const toast = await this.toastController.create({
        message: this.translate.instant('COMMON.SHARE_FAILED'),
        duration: 1500,
        color: 'danger',
      });
      await toast.present();
    }
  }
}
