import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';

import { FeedPost } from '../../core/models/post.models';
import { AuthService } from '../../core/services/auth.service';
import { PostsService } from '../../core/services/posts.service';
import { ShareLinkService } from '../../core/services/share-link.service';
import { UsersService } from '../../core/services/users.service';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.page.html',
  styleUrls: ['./feed.page.scss'],
  standalone: false,
})
export class FeedPage implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly shareLinkService = inject(ShareLinkService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  posts: FeedPost[] = [];
  filteredPosts: FeedPost[] = [];
  searchQuery = '';
  userPhoto = 'assets/default-profile.png';
  currentUserId = '';
  loading = false;
  publishing = false;
  showComposer = false;
  errorMessage = '';
  commentDrafts: Record<string, string> = {};
  expanded: Record<string, boolean> = {};
  longPost: Record<string, boolean> = {};

  readonly postForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.maxLength(120)]],
    content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(3000)]],
  });

  private buildPostUrl(id: string): string {
    return this.shareLinkService.buildPostShareUrl(id);
  }

  async ngOnInit(): Promise<void> {
    this.showComposer = this.router.url.includes('/tabs/pushpub');
    await this.loadCurrentUser();
    await this.loadPosts();
  }

  async loadPosts(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.posts = await firstValueFrom(this.postsService.listPosts());
      this.filteredPosts = [...this.posts];
      this.computeLongPosts();
    } catch {
      this.errorMessage = 'Unable to load posts right now.';
    } finally {
      this.loading = false;
    }
  }

  async publish(): Promise<void> {
    if (this.postForm.invalid || this.publishing) {
      this.postForm.markAllAsTouched();
      return;
    }

    this.publishing = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(this.postsService.createPost(this.postForm.getRawValue()));
      this.postForm.reset({ title: '', content: '' });
      await this.loadPosts();
    } catch {
      this.errorMessage = 'Unable to publish this post.';
    } finally {
      this.publishing = false;
    }
  }

  async like(postId: string): Promise<void> {
    try {
      const updated = await firstValueFrom(this.postsService.likePost(postId));
      this.posts = this.posts.map((post) => (post.id === postId ? updated : post));
      this.filteredPosts = this.filteredPosts.map((post) =>
        post.id === postId ? updated : post,
      );
      this.computeLongPosts();
    } catch {
      this.errorMessage = 'Unable to like this post.';
    }
  }

  async submitComment(postId: string): Promise<void> {
    const text = (this.commentDrafts[postId] ?? '').trim();
    if (!text) {
      return;
    }

    try {
      const updated = await firstValueFrom(
        this.postsService.addComment(postId, { text }),
      );
      this.commentDrafts[postId] = '';
      this.posts = this.posts.map((post) => (post.id === postId ? updated : post));
      this.filteredPosts = this.filteredPosts.map((post) =>
        post.id === postId ? updated : post,
      );
      this.computeLongPosts();
    } catch {
      this.errorMessage = 'Unable to add comment.';
    }
  }

  async promptComment(postId: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Add a comment',
      inputs: [
        {
          name: 'text',
          type: 'text',
          placeholder: 'Type here...',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send',
          handler: async (value) => {
            const text = String(value?.text ?? '').trim();
            if (!text) {
              return false;
            }
            this.commentDrafts[postId] = text;
            await this.submitComment(postId);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  trackByPostId(_: number, post: FeedPost): string {
    return post.id;
  }

  trackByImageUrl(index: number, url: string): string {
    return url || `${index}`;
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

  toggleExpand(id: string) {
    this.expanded[id] = !this.expanded[id];
  }

  goPushPub(event: Event): void {
    event.preventDefault();
    this.showComposer = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async presentPostActions(post: FeedPost): Promise<void> {
    if (!this.isOwner(post)) {
      return;
    }

    const sheet = await this.actionSheetCtrl.create({
      header: 'Publication',
      buttons: [
        {
          text: 'Supprimer',
          role: 'destructive',
          icon: 'trash',
          handler: () => {
            void this.confirmDelete(post);
          },
        },
        {
          text: 'Annuler',
          role: 'cancel',
        },
      ],
    });

    await sheet.present();
  }

  async sharePost(post: FeedPost): Promise<void> {
    const payload = this.buildSharePayload(post);

    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        return;
      } catch {
        // fallback clipboard below
      }
    }

    try {
      await navigator.clipboard.writeText(
        [payload.title, payload.text, payload.url].filter(Boolean).join('\n\n').trim(),
      );
      const toast = await this.toastCtrl.create({
        message: 'Lien copié',
        duration: 1500,
        icon: 'copy',
      });
      await toast.present();
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Partage impossible',
        duration: 1500,
        color: 'danger',
      });
      await toast.present();
    }
  }

  isOwner(post: FeedPost): boolean {
    return !!this.currentUserId && post.author?.id === this.currentUserId;
  }

  private async loadCurrentUser() {
    try {
      const me = await firstValueFrom(this.usersService.getMe());
      this.currentUserId = me.id;
      this.userPhoto = me.photoURL || 'assets/default-profile.png';
    } catch {
      this.currentUserId = '';
      this.userPhoto = 'assets/default-profile.png';
    }
  }

  private computeLongPosts() {
    for (const post of this.filteredPosts) {
      const content = post.content ?? '';
      const isLong = content.length > 220 || (content.match(/\n/g)?.length ?? 0) > 6;
      this.longPost[post.id] = isLong;
      if (this.expanded[post.id] === undefined) {
        this.expanded[post.id] = false;
      }
    }
  }

  private async confirmDelete(post: FeedPost): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Supprimer ?',
      message: 'Cette action est définitive.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            void this.deletePost(post.id);
          },
        },
      ],
    });

    await alert.present();
  }

  private async deletePost(postId: string): Promise<void> {
    try {
      await firstValueFrom(this.postsService.deletePost(postId));
      this.posts = this.posts.filter((post) => post.id !== postId);
      this.filteredPosts = this.filteredPosts.filter((post) => post.id !== postId);
      const toast = await this.toastCtrl.create({
        message: 'Publication supprimée',
        duration: 1500,
      });
      await toast.present();
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Suppression impossible',
        duration: 1500,
        color: 'danger',
      });
      await toast.present();
    }
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

  private getAuthorFullName(post: FeedPost): string {
    const firstName = `${post.author?.firstName || ''}`.trim();
    const lastName = `${post.author?.lastName || ''}`.trim();
    const merged = `${firstName} ${lastName}`.trim();
    return merged || `${post.author?.username || ''}`.trim() || 'Utilisateur';
  }

  private formatDateForSearch(value?: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toISOString();
  }

  private getImageNameParts(post: FeedPost): string {
    const urls = post.imageUrls || [];
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

  private buildPostMetadata(post: FeedPost): string {
    const commentsText = (post.comments || [])
      .map((comment) => {
        const author = comment.author
          ? `${comment.author.firstName || ''} ${comment.author.lastName || ''} ${comment.author.username || ''}`.trim()
          : '';
        return `${author} ${comment.text || ''}`.trim();
      })
      .join(' ');
    const dynamicMeta = this.extractDynamicMetadata(post);

    return [
      this.getAuthorFullName(post),
      post.author?.username || '',
      post.author?.institution || '',
      post.author?.country || '',
      post.author?.city || '',
      post.title || '',
      post.content || '',
      post.id || '',
      `${post.likesCount || 0}`,
      `${post.comments?.length || 0}`,
      this.formatDateForSearch(post.createdAt),
      this.formatDateForSearch(post.updatedAt),
      commentsText,
      this.getImageNameParts(post),
      dynamicMeta,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private buildSearchablePostText(post: FeedPost): string {
    return this.normalizeSearchValue(this.buildPostMetadata(post));
  }

  private buildSharePayload(post: FeedPost): { title: string; text: string; url: string } {
    const url = this.buildPostUrl(post.id);
    const authorName = this.getAuthorFullName(post);
    const institution = `${post.author?.institution || ''}`.trim();
    const publishedAt = this.formatDateForDisplay(post.createdAt);
    const excerpt = `${post.content || ''}`.trim();
    const trimmedExcerpt = excerpt.length > 220 ? `${excerpt.slice(0, 217)}...` : excerpt;
    const dynamicMeta = this.extractDynamicMetadata(post);

    const metadataLines = [
      `Auteur: ${authorName}`,
      institution ? `Institution: ${institution}` : '',
      publishedAt ? `Publié: ${publishedAt}` : '',
      `Likes: ${post.likesCount || 0}`,
      `Commentaires: ${post.comments?.length || 0}`,
      dynamicMeta,
    ].filter(Boolean);

    const shareTitle = `${post.title || 'Publication OneHealth'}`.trim();
    const shareText = [trimmedExcerpt, metadataLines.join(' | ')].filter(Boolean).join('\n\n');

    return {
      title: shareTitle,
      text: shareText,
      url,
    };
  }

  private formatDateForDisplay(value?: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('fr-FR');
  }

  private extractDynamicMetadata(post: FeedPost): string {
    const anyPost = post as FeedPost & {
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
