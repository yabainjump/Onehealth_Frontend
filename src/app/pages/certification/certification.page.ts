import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../services/auth/auth.service';
import { UploadService } from '../../core/services/upload.service';
import {
  CertificationRequest,
  CertificationService,
} from '../../core/services/certification.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';
import { firstValueFrom } from 'rxjs';

/** Demande de certification de profil (professionnels de santé / institutions). */
@Component({
  selector: 'app-certification',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule],
  templateUrl: './certification.page.html',
  styleUrls: ['./certification.page.scss'],
})
export class CertificationPage implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly uploadService = inject(UploadService);
  private readonly certificationService = inject(CertificationService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);

  private static readonly MAX_DOCUMENTS = 5;

  loading = true;
  submitting = false;
  uploading = false;

  isCertified = false;
  request: CertificationRequest | null = null;

  message = '';
  documents: string[] = [];

  async ngOnInit(): Promise<void> {
    const user = await this.authService.checkAuth();
    if (!user?.uid) {
      void this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
    this.isCertified = !!user['isCertified'];
    try {
      this.request = await this.certificationService.getMyRequest();
    } catch {
      // Pas bloquant : le formulaire reste utilisable.
    }
    this.loading = false;
  }

  /** Nouvelle demande possible si non certifié et aucune demande en attente. */
  get canSubmitNew(): boolean {
    return !this.isCertified && this.request?.status !== 'pending';
  }

  get canAddDocument(): boolean {
    return this.documents.length < CertificationPage.MAX_DOCUMENTS;
  }

  get canSend(): boolean {
    return !this.submitting && !this.uploading && this.documents.length > 0;
  }

  docSrc(url: string): string {
    return resolveMediaUrl(url) || url;
  }

  isImage(url: string): boolean {
    return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
  }

  fileName(url: string): string {
    return url.split('/').pop() || url;
  }

  async handleFiles(event: any): Promise<void> {
    const files: File[] = Array.from(event?.target?.files || []);
    if (event?.target) {
      event.target.value = '';
    }
    if (!files.length) {
      return;
    }
    const room = Math.max(0, CertificationPage.MAX_DOCUMENTS - this.documents.length);
    this.uploading = true;
    try {
      const uploads = await Promise.all(
        files
          .slice(0, room)
          .map((file) => firstValueFrom(this.uploadService.uploadPost(file))),
      );
      this.documents = [...this.documents, ...uploads.map((u) => u.url)];
    } catch {
      await this.toast(this.translate.instant('CERT.UPLOAD_ERR'), 'danger');
    } finally {
      this.uploading = false;
    }
  }

  removeDocument(url: string): void {
    this.documents = this.documents.filter((d) => d !== url);
  }

  trackByUrl(_i: number, url: string): string {
    return url;
  }

  async submit(): Promise<void> {
    if (!this.canSend) {
      return;
    }
    this.submitting = true;
    try {
      this.request = await this.certificationService.submitRequest(
        this.documents,
        this.message.trim(),
      );
      this.documents = [];
      this.message = '';
      await this.toast(this.translate.instant('CERT.SUBMITTED'), 'success');
    } catch {
      await this.toast(this.translate.instant('CERT.SUBMIT_ERR'), 'danger');
    } finally {
      this.submitting = false;
    }
  }

  back(): void {
    void this.router.navigateByUrl('/tabs/dashbord');
  }

  private async toast(
    message: string,
    color: 'success' | 'danger' = 'success',
  ): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2200, color });
    await t.present();
  }
}
