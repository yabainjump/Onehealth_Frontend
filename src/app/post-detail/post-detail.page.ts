import { Component, OnInit } from '@angular/core';
import { Post, PostAttachment, PublishService } from '../services/publish/publish.service';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ToastController } from '@ionic/angular';
import { ShareLinkService } from '../core/services/share-link.service';

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
  }[] = [];
  constructor(
    private route: ActivatedRoute,
    private publishService: PublishService,
    private sanitizer: DomSanitizer,
    private readonly toastController: ToastController,
    private readonly shareLinkService: ShareLinkService,
  ) {}

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
          };
        }

        if (rawComment?.comment && rawComment?.userId) {
          const user = await this.publishService.getUser(rawComment.userId);
          return {
            text: rawComment.comment,
            username: user ? `${user.firstName} ${user.lastName}` : 'Anonyme',
            userPhotoURL: user?.photoURL || 'assets/default-profile.png',
          };
        }

        return null;
      }),
    );
    this.commentsWithUsers = enriched.filter((value): value is { text: string; username: string; userPhotoURL: string } => !!value);
    
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

  getDocumentPreviewUrl(post: Post | null): SafeResourceUrl {
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

  openAttachment(post: Post | null) {
    const url = this.getAttachment(post)?.url;
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  formatPostContent(value: string | null | undefined): SafeHtml {
    if (!value) return '';

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

  trackByImage(_index: number, img: string): string {
    return img || String(_index);
  }

  trackByComment(
    _index: number,
    comment: { text: string; username: string; userPhotoURL: string },
  ): string {
    return `${comment.username || 'user'}-${comment.text || ''}-${_index}`;
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
