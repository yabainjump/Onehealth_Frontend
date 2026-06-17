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
    const post = await this.publishService.getPostById(this.postId);
    if (!post) {
      this.loading = false;
      this.notFound = true;
      return;
    }
    // Seul l'auteur peut modifier (le backend le vérifie aussi).
    const uid = (this.authService.getCurrentUserSync()?.uid || '').trim();
    if (post.author?.id && uid && post.author.id !== uid) {
      await this.toast(this.translate.instant('DASHBOARD.EDIT_ERROR'), 'danger');
      void this.router.navigate(['/tabs/dashbord']);
      return;
    }
    this.content = post.content || '';
    this.images = [...(post.rawImageUrls || [])];
    this.attachment = post.attachment || null;
    this.hasAttachment = !!post.attachment;
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
      for (const file of files.slice(0, room)) {
        const url = await this.publishService.uploadImage(file);
        this.images = [...this.images, url];
      }
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

  async save(): Promise<void> {
    if (!this.canSave) {
      return;
    }
    this.saving = true;
    try {
      const payload = this.hasAttachment
        ? { content: this.content.trim() }
        : { content: this.content.trim(), imageUrls: this.images };
      await this.publishService.updatePost(this.postId, payload);
      await this.toast(this.translate.instant('DASHBOARD.EDIT_DONE'), 'success');
      void this.router.navigate(['/tabs/dashbord']);
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
