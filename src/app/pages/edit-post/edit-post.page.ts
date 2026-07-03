import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Post, PublishService } from '../../services/publish/publish.service';
import { AuthService } from '../../services/auth/auth.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

@Component({
  selector: 'app-edit-post',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule],
  templateUrl: './edit-post.page.html',
  styleUrls: ['./edit-post.page.scss'],
})
export class EditPostPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publishService = inject(PublishService);
  private readonly authService = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);

  private static readonly MAX_IMAGES = 8;

  loading = true;
  saving = false;
  photoUploading = false;
  notFound = false;

  postId = '';
  content = '';
  /** Chemins BRUTS (existants + nouvellement envoyés), prêts à ré-enregistrer. */
  images: string[] = [];
  hasAttachment = false;
  attachment: Post['attachment'] = null;

  /** Valeurs chargées initialement, pour détecter une sauvegarde sans changement. */
  private originalContent = '';
  private originalImages: string[] = [];

  ngOnInit(): void {
    this.postId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.postId) {
      this.loading = false;
      this.notFound = true;
      return;
    }
    void this.load();
  }

  private async load(): Promise<void> {
    let post: Post | undefined;
    try {
      post = await this.publishService.getPostById(this.postId);
    } catch {
      this.loading = false;
      await this.toast(this.translate.instant('EDITPOST.LOAD_ERROR'), 'danger');
      void this.router.navigate(['/tabs/dashbord']);
      return;
    }
    if (!post) {
      this.loading = false;
      this.notFound = true;
      return;
    }
    // Seul l'auteur peut modifier (le backend le vérifie aussi). On attend la
    // résolution de l'identité (checkAuth) au lieu de lire un snapshot
    // synchrone qui peut encore être vide au démarrage/deep-link, et on
    // refuse par défaut si l'identité ne peut pas être confirmée.
    const currentUser = await this.authService.checkAuth();
    const uid = (currentUser?.uid || '').trim();
    if (!uid || (post.author?.id && post.author.id !== uid)) {
      await this.toast(this.translate.instant('DASHBOARD.EDIT_ERROR'), 'danger');
      void this.router.navigate(['/tabs/dashbord']);
      return;
    }
    this.content = post.content || '';
    this.images = [...(post.rawImageUrls || [])];
    this.attachment = post.attachment || null;
    this.hasAttachment = !!post.attachment;
    this.originalContent = this.content;
    this.originalImages = [...this.images];
    this.loading = false;
  }

  get canSave(): boolean {
    if (this.saving) {
      return false;
    }
    if (this.hasAttachment) {
      return true;
    }
    return !!(this.content.trim() || this.images.length);
  }

  get canAddPhoto(): boolean {
    return !this.hasAttachment && this.images.length < EditPostPage.MAX_IMAGES;
  }

  photoSrc(url: string): string {
    return resolveMediaUrl(url) || url;
  }

  async handlePhoto(event: any): Promise<void> {
    const files: File[] = Array.from(event?.target?.files || []);
    if (event?.target) {
      event.target.value = '';
    }
    if (!files.length) {
      return;
    }
    const room = Math.max(0, EditPostPage.MAX_IMAGES - this.images.length);
    this.photoUploading = true;
    try {
      const urls = await Promise.all(
        files.slice(0, room).map((file) => this.publishService.uploadImage(file)),
      );
      this.images = [...this.images, ...urls];
    } catch {
      await this.toast(this.translate.instant('EDITPOST.PHOTO_ERR'), 'danger');
    } finally {
      this.photoUploading = false;
    }
  }

  removeImage(url: string): void {
    this.images = this.images.filter((u) => u !== url);
  }

  trackByUrl(_i: number, url: string): string {
    return url;
  }

  /** Vrai si le contenu ou les images diffèrent de ce qui a été chargé. */
  private get hasChanges(): boolean {
    if (this.content.trim() !== this.originalContent) {
      return true;
    }
    if (this.hasAttachment) {
      return false;
    }
    if (this.images.length !== this.originalImages.length) {
      return true;
    }
    return this.images.some((url, i) => url !== this.originalImages[i]);
  }

  async save(): Promise<void> {
    if (!this.canSave) {
      return;
    }
    if (!this.hasChanges) {
      void this.router.navigate(['/tabs/dashbord']);
      return;
    }
    this.saving = true;
    try {
      const payload = this.hasAttachment
        ? { content: this.content.trim() }
        : { content: this.content.trim(), imageUrls: this.images };
      const updated = await this.publishService.updatePost(this.postId, payload);
      await this.toast(this.translate.instant('DASHBOARD.EDIT_DONE'), 'success');
      void this.router.navigate(['/tabs/dashbord'], { state: { updatedPost: updated } });
    } catch {
      await this.toast(this.translate.instant('DASHBOARD.EDIT_ERROR'), 'danger');
    } finally {
      this.saving = false;
    }
  }

  cancel(): void {
    void this.router.navigate(['/tabs/dashbord']);
  }

  private async toast(
    message: string,
    color: 'success' | 'danger' | 'medium' = 'medium',
  ): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 1800, color });
    await t.present();
  }
}
