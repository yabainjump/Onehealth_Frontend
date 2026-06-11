import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, PopoverController, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth/auth.service';
import { Post, PublishService } from 'src/app/services/publish/publish.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-pushpub',
  templateUrl: './pushpub.page.html',
  styleUrls: ['./pushpub.page.scss'],
  
  standalone: false,
})
export class PushpubPage implements OnDestroy {
  @ViewChild('popover') popover: PopoverController;

  isPublishing = false;
  content: string = '';
  currentUserId: string = '';
  imageFiles: File[] = [];
  previewUrls: string[] = [];
  attachmentFile: File | null = null;
  attachmentPreviewUrl: string | null = null;
  attachmentType: 'video' | 'document' | null = null;
  readonly maxAttachmentBytes = 50 * 1024 * 1024;

  constructor(
    private router: Router,
    private publicationService : PublishService,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private translate: TranslateService,
  ) {
    this.authService.getAuthState().subscribe((user) => {
      if (user) {
        this.currentUserId = user.uid;
      }
    });
  }

  ngOnDestroy() {
    this.revokePreviewUrls();
    if (this.attachmentPreviewUrl) {
      URL.revokeObjectURL(this.attachmentPreviewUrl);
    }
  }

  /** Vrai s'il y a du texte ou un média : active le bouton « Publier ». */
  get canPublish(): boolean {
    return !!(
      this.content?.trim() ||
      this.previewUrls.length ||
      this.attachmentFile
    );
  }

  /** Ferme le composer et revient au fil. */
  goBack(): void {
    void this.router.navigate(['/', 'tabs', 'dashbord']);
  }

  /** Retire le(s) média(s) sélectionné(s). */
  removeMedia(): void {
    this.clearSelection();
  }

  handleImageInput(event: any) {
    const selectedFiles: File[] = Array.from(event?.target?.files || []);
    if (!selectedFiles.length) return;

    const oversized = selectedFiles.find((file) => file.size > this.maxAttachmentBytes);
    if (oversized) {
      this.presentToast(this.translate.instant('PUSHPUB.FILE_TOO_LARGE'), 'danger');
      this.clearSelection();
      return;
    }

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));
    const nonImageFiles = selectedFiles.filter((file) => !file.type.startsWith('image/'));

    if (imageFiles.length && nonImageFiles.length) {
      this.presentToast(this.translate.instant('PUSHPUB.MIX_ERROR'), 'danger');
      this.clearSelection();
      return;
    }

    if (nonImageFiles.length > 1) {
      this.presentToast(this.translate.instant('PUSHPUB.ONE_ATTACHMENT'), 'danger');
      this.clearSelection();
      return;
    }

    if (imageFiles.length) {
      this.clearSelection(false);
      this.imageFiles = imageFiles;
      this.previewUrls = imageFiles.map((file) => URL.createObjectURL(file));
      return;
    }

    const file = nonImageFiles[0];
    const detectedType = this.getAttachmentType(file);
    if (!detectedType) {
      this.presentToast(this.translate.instant('PUSHPUB.UNSUPPORTED_TYPE'), 'danger');
      this.clearSelection();
      return;
    }

    this.clearSelection(false);
    this.attachmentFile = file;
    this.attachmentType = detectedType;
    this.attachmentPreviewUrl = detectedType === 'video' ? URL.createObjectURL(file) : null;
  }

  trackByPreviewUrl(index: number, url: string): string {
    return url || `${index}`;
  }

  blurActive() {
  const el = document.activeElement as HTMLElement | null;
  if (el && typeof el.blur === 'function') el.blur();
}

  private getAttachmentType(file: File): 'video' | 'document' | null {
    if (file.type.startsWith('video/')) return 'video';
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (['pdf', 'ppt', 'pptx', 'doc', 'docx'].includes(ext)) return 'document';
    return null;
  }

  // async addPost() {
  //   this.blurActive();
  //   await this.popover?.dismiss();
  //   if (!this.content.trim() && this.imageFiles.length === 0) {
  //     alert('You must add some content or select at least one image.');
  //     return;
  //   }

  //   // Upload multiple images
  //   const uploadTasks = this.imageFiles.map((file) =>
  //     this.publicationService.uploadImage(file)
  //   );

  //   Promise.all(uploadTasks)
  //     .then((imageUrls) => {
  //       const post: Post = {
  //         authorId: this.currentUserId,
  //         content: this.content,
  //         imageUrl: '', // on peut l’ignorer ou mettre imageUrls[0]
  //         imageUrls: imageUrls, // Ajoute cette propriété à ton modèle Post
  //         likes: 0,
  //         comments: [],
  //         timestamp: new Date(),
  //       };

  //       return this.publicationService.addPost(post);
  //     })
  //     .then(() => {
  //       console.log('Post added successfully!');
  //       // 🔄 Réinitialiser tous les champs ici
  //     this.content = '';
  //     this.imageFiles = [];
  //     this.previewUrls = [];

  //     // Tu peux aussi forcer le champ file input à se vider :
  //     const inputElement = document.querySelector('input[type="file"]') as HTMLInputElement;
  //     if (inputElement) {
  //       inputElement.value = '';
  //     }
  //      this.router.navigate(['/', 'tabs', 'dashboard']);
  //     })
  //     .catch((error) => {
  //       console.error('Error uploading images:', error);
  //     });
  // }

   async addPost() {
    // 👮 garde-fou anti multi-tap
    if (this.isPublishing) return;
    this.isPublishing = true;

    // optionnel: fermer UI avant
    this.blurActive?.();
    await this.popover?.dismiss?.();

    // validation
    if (
      !this.content?.trim() &&
      (this.imageFiles?.length || 0) === 0 &&
      !this.attachmentFile
    ) {
      await this.presentToast(this.translate.instant('PUSHPUB.EMPTY'), 'danger');
      this.isPublishing = false;
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.translate.instant('PUSHPUB.PUBLISHING_PROGRESS'),
      spinner: 'crescent',
      backdropDismiss: false,
    });
    await loading.present();

    try {
      // 1) upload images (si présentes)
      const imageUrls = this.imageFiles?.length
        ? await Promise.all(this.imageFiles.map(f => this.publicationService.uploadImage(f)))
        : [];

      const attachment =
        this.attachmentFile && this.attachmentType
          ? await this.publicationService.uploadAttachment(this.attachmentFile)
          : null;

      // 2) créer le post
      const post: Post = {
        authorId: this.currentUserId,
        content: this.content?.trim() || '',
        imageUrl: '',                // optionnel
        imageUrls,                   // tableau d’URLs
        attachment:
          attachment && this.attachmentFile && this.attachmentType
            ? {
                type: this.attachmentType,
                url: attachment.url,
                fileName: attachment.originalName || this.attachmentFile.name,
                mimeType: attachment.mimetype || this.attachmentFile.type || 'application/octet-stream',
                size: attachment.size || this.attachmentFile.size,
              }
            : null,
        likes: 0,
        comments: [],
        timestamp: new Date(),
      };

      await this.publicationService.addPost(post);

      // 3) reset UI
      this.content = '';
      this.clearSelection();

      await this.presentToast(this.translate.instant('PUSHPUB.PUBLISHED'), 'success');

      // 4) navigate si besoin
      this.router.navigate(['/', 'tabs', 'dashbord']); // adapte "dashbord" vs "dashboard"
    } catch (error) {
      console.error('Error uploading/adding post:', error);
      await this.presentToast(this.translate.instant('PUSHPUB.PUBLISH_ERROR'), 'danger');
    } finally {
      await loading.dismiss();
      this.isPublishing = false;
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const t = await this.toastCtrl.create({ message, duration: 1800, color });
    await t.present();
  }

  private revokePreviewUrls() {
    for (const previewUrl of this.previewUrls) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  private clearSelection(clearInput = true) {
    this.imageFiles = [];
    this.revokePreviewUrls();
    this.previewUrls = [];
    if (this.attachmentPreviewUrl) {
      URL.revokeObjectURL(this.attachmentPreviewUrl);
    }
    this.attachmentPreviewUrl = null;
    this.attachmentFile = null;
    this.attachmentType = null;
    if (clearInput) {
      const inputEl = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      if (inputEl) inputEl.value = '';
    }
  }
}
