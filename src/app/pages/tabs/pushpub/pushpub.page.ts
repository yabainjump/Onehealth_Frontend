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
  readonly maxImages = 8;

  /** URLs deja envoyees pour pouvoir reprendre un lot interrompu. */
  private uploadedImageUrls: Array<string | null> = [];
  private failedImagePosition: number | null = null;

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

  /**
   * L'onglet « Publier » n'est jamais détruit (page Ionic mise en cache) : on
   * réarme donc l'état à chaque entrée et on ferme tout loader fantôme résiduel,
   * pour ne jamais rester bloqué après une publication précédente.
   */
  async ionViewWillEnter(): Promise<void> {
    this.isPublishing = false;
    try {
      const top = await this.loadingCtrl.getTop();
      await top?.dismiss();
    } catch {
      /* aucun overlay résiduel */
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
    if (this.isPublishing) return;

    const selectedFiles: File[] = Array.from(event?.target?.files || []);
    if (!selectedFiles.length) return;

    // On vide l'input tout de suite (les File restent valides) pour pouvoir
    // re-sélectionner le MÊME fichier plus tard (sinon l'event change ne refire pas).
    if (event?.target) {
      event.target.value = '';
    }

    const oversized = selectedFiles.find((file) => file.size > this.maxAttachmentBytes);
    if (oversized) {
      this.presentToast(this.translate.instant('PUSHPUB.FILE_TOO_LARGE'), 'danger');
      this.clearSelection();
      return;
    }

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));
    const nonImageFiles = selectedFiles.filter((file) => !file.type.startsWith('image/'));

    if (imageFiles.length > this.maxImages) {
      this.presentToast(
        this.translate.instant('PUSHPUB.TOO_MANY_IMAGES', { max: this.maxImages }),
        'danger',
      );
      this.clearSelection();
      return;
    }

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
      this.uploadedImageUrls = imageFiles.map(() => null);
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

    let published = false;
    try {
      // Envoi sequentiel : plusieurs compressions et requetes simultanees
      // saturent facilement la memoire mobile et une faible connexion montante.
      const imageUrls = this.imageFiles?.length
        ? await this.uploadSelectedImages(loading)
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
      published = true;
    } catch (error: any) {
      // Log détaillé (status + corps) pour diagnostiquer en prod.
      console.error('Error uploading/adding post:', error?.status, error?.error || error);
      await this.presentToast(this.publishErrorMessage(error), 'danger');
    } finally {
      // dismiss DÉFENSIF : ne doit JAMAIS empêcher la réinitialisation de l'état,
      // sinon isPublishing reste bloqué à true et plus aucune publication ne passe.
      try {
        await loading.dismiss();
      } catch {
        /* overlay déjà détaché (page d'onglet masquée) — sans gravité */
      }
      this.isPublishing = false;
    }

    // Navigation APRÈS la fermeture de l'overlay (évite loader fantôme + état bloqué).
    if (published) {
      await this.router.navigate(['/', 'tabs', 'dashbord']);
    }
  }

  private async uploadSelectedImages(loading: HTMLIonLoadingElement): Promise<string[]> {
    if (this.uploadedImageUrls.length !== this.imageFiles.length) {
      this.uploadedImageUrls = this.imageFiles.map(() => null);
    }

    for (let index = 0; index < this.imageFiles.length; index += 1) {
      if (this.uploadedImageUrls[index]) continue;

      const position = index + 1;
      this.failedImagePosition = position;
      loading.message = this.translate.instant('PUSHPUB.UPLOADING_IMAGE', {
        current: position,
        total: this.imageFiles.length,
      });

      const url = await this.publicationService.uploadImage(this.imageFiles[index]);
      if (!url) {
        throw new Error('Upload response did not contain a media URL');
      }
      this.uploadedImageUrls[index] = url;
    }

    this.failedImagePosition = null;
    return this.uploadedImageUrls.map((url) => url as string);
  }

  private publishErrorMessage(error: any): string {
    if (this.failedImagePosition === null) {
      return this.translate.instant('PUSHPUB.PUBLISH_ERROR');
    }

    const params = {
      current: this.failedImagePosition,
      total: this.imageFiles.length,
    };
    const status = Number(error?.status || 0);

    if (status === 413) {
      return this.translate.instant('PUSHPUB.FILE_TOO_LARGE');
    }

    const isOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;
    const isTemporary =
      isOffline || status === 0 || status === 408 || status === 429 || status >= 500;

    return this.translate.instant(
      isTemporary ? 'PUSHPUB.UPLOAD_RESUME' : 'PUSHPUB.IMAGE_UPLOAD_ERROR',
      params,
    );
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const t = await this.toastCtrl.create({
      message,
      duration: color === 'danger' ? 4000 : 1800,
      color,
    });
    await t.present();
  }

  private revokePreviewUrls() {
    for (const previewUrl of this.previewUrls) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  private clearSelection(clearInput = true) {
    this.imageFiles = [];
    this.uploadedImageUrls = [];
    this.failedImagePosition = null;
    this.revokePreviewUrls();
    this.previewUrls = [];
    if (this.attachmentPreviewUrl) {
      URL.revokeObjectURL(this.attachmentPreviewUrl);
    }
    this.attachmentPreviewUrl = null;
    this.attachmentFile = null;
    this.attachmentType = null;
    if (clearInput) {
      // Il y a 3 inputs (photo / vidéo / document) : on les vide TOUS.
      document.querySelectorAll('input[type="file"]').forEach((el) => {
        (el as HTMLInputElement).value = '';
      });
    }
  }
}
