import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subject, catchError, distinctUntilChanged, map, of, startWith, switchMap, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as L from 'leaflet';

import {
  AlertComment,
  AlertsService,
  HealthAlert,
  UpdateAlertPayload,
} from '../../core/services/alerts.service';
import { AuthService } from '../../services/auth/auth.service';
import { InteractionGuardService } from '../../core/services/interaction-guard.service';
import { PublishService } from '../../services/publish/publish.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

type AlertLoadResult =
  | { id: string; status: 'success'; alert: HealthAlert }
  | { id: string; status: 'not-found' | 'error' };

@Component({
  selector: 'app-alert-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule],
  templateUrl: './alert-detail.page.html',
  styleUrls: ['./alert-detail.page.scss'],
})
export class AlertDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertsService = inject(AlertsService);
  private readonly authService = inject(AuthService);
  private readonly interactionGuard = inject(InteractionGuardService);
  private readonly publishService = inject(PublishService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  alert?: HealthAlert;
  images: string[] = [];
  loading = true;
  loadError = false;
  currentUserId = '';

  // Réaction / commentaire
  liking = false;
  newComment = '';
  commentSubmitting = false;

  // Édition (auteur)
  editOpen = false;
  editSubmitting = false;
  editPhotoUploading = false;
  editForm: UpdateAlertPayload = {};

  private map?: L.Map;
  private alertId = '';
  private readonly reload$ = new Subject<void>();

  ngOnInit(): void {
    this.currentUserId = (
      this.authService.getCurrentUserSync()?.uid || ''
    ).trim();
    this.authService
      .getAuthState()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUserId = (user?.uid || '').trim();
      });

    // Ionic conserve certaines pages dans sa pile de navigation. Écouter
    // paramMap garantit donc que le bon détail est chargé même lorsque le
    // composant est réutilisé pour une autre alerte.
    this.route.paramMap
      .pipe(
        map((params) => (params.get('id') || '').trim()),
        distinctUntilChanged(),
        switchMap((id) =>
          this.reload$.pipe(
            startWith(undefined),
            switchMap(() => this.loadAlert(id)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        // Ignore toute réponse devenue obsolète après un changement de route.
        if (result.id !== this.alertId) {
          return;
        }

        this.loading = false;
        this.loadError = result.status === 'error';

        if (result.status !== 'success') {
          return;
        }

        this.applyAlert(result.alert);
        setTimeout(() => this.tryInitMap(), 300);
      });
  }

  ionViewDidEnter(): void {
    setTimeout(() => this.tryInitMap(), 300);
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  retryLoad(): void {
    if (this.alertId && !this.loading) {
      this.reload$.next();
    }
  }

  get isAuthor(): boolean {
    return (
      !!this.alert?.author?.id && this.alert.author.id === this.currentUserId
    );
  }

  private applyAlert(a: HealthAlert): void {
    this.alert = {
      ...a,
      verificationStatus: a.verificationStatus || 'pending',
      reviewedAt: a.reviewedAt || null,
      author: a.author
        ? {
            ...a.author,
            photoURL:
              resolveMediaUrl(a.author.photoURL) ||
              'assets/default-profile.png',
          }
        : null,
      comments: (a.comments || []).map((c) => ({
        ...c,
        author: c.author
          ? {
              ...c.author,
              photoURL:
                resolveMediaUrl(c.author.photoURL) ||
                'assets/default-profile.png',
            }
          : null,
      })),
    };
    this.images = (a.imageUrls || []).map((u) => resolveMediaUrl(u) || u);
  }

  // ===== Réaction =====
  async toggleLike(): Promise<void> {
    if (this.liking || !this.alert) {
      return;
    }
    if (!(await this.interactionGuard.requireAuth())) {
      return;
    }
    this.liking = true;
    const liked = this.alert.userHasLiked;
    const obs = liked
      ? this.alertsService.unlike(this.alertId)
      : this.alertsService.like(this.alertId);
    obs.subscribe({
      next: (a) => {
        this.applyAlert(a);
        this.liking = false;
      },
      error: () => {
        this.liking = false;
      },
    });
  }

  // ===== Commentaires =====
  async submitComment(): Promise<void> {
    const text = (this.newComment || '').trim();
    if (!text || this.commentSubmitting) {
      return;
    }
    if (!(await this.interactionGuard.requireAuth())) {
      return;
    }
    this.commentSubmitting = true;
    this.alertsService.addComment(this.alertId, text).subscribe({
      next: (a) => {
        this.applyAlert(a);
        this.newComment = '';
        this.commentSubmitting = false;
      },
      error: () => {
        this.commentSubmitting = false;
        void this.toast(this.translate.instant('ALERTS.COMMENT_ERR'), 'danger');
      },
    });
  }

  canDeleteComment(c: AlertComment): boolean {
    return (
      this.isAuthor || (!!c.author?.id && c.author.id === this.currentUserId)
    );
  }

  async deleteComment(c: AlertComment): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: this.translate.instant('ALERTS.COMMENT_DELETE'),
      message: this.translate.instant('ALERTS.COMMENT_DELETE_CONFIRM'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('ALERTS.DELETE'),
          role: 'destructive',
          handler: () => {
            this.alertsService.deleteComment(this.alertId, c.id).subscribe({
              next: (a) => this.applyAlert(a),
              error: () =>
                void this.toast(
                  this.translate.instant('ALERTS.COMMENT_ERR'),
                  'danger',
                ),
            });
          },
        },
      ],
    });
    await confirm.present();
  }

  // ===== Édition (auteur) =====
  openEdit(): void {
    if (!this.alert) {
      return;
    }
    this.editForm = {
      category: this.alert.category,
      title: this.alert.title,
      description: this.alert.description,
      country: this.alert.country,
      city: this.alert.city,
      severity: this.alert.severity,
      imageUrls: [...(this.alert.imageUrls || [])],
    };
    this.editOpen = true;
  }

  closeEdit(): void {
    this.editOpen = false;
  }

  async handleEditPhoto(event: any): Promise<void> {
    const files: File[] = Array.from(event?.target?.files || []);
    if (event?.target) {
      event.target.value = '';
    }
    if (!files.length) {
      return;
    }
    const current = this.editForm.imageUrls?.length || 0;
    const room = Math.max(0, 4 - current);
    this.editPhotoUploading = true;
    try {
      for (const file of files.slice(0, room)) {
        const url = await this.publishService.uploadImage(file);
        this.editForm.imageUrls = [...(this.editForm.imageUrls || []), url];
      }
    } catch {
      void this.toast(this.translate.instant('ALERTS.PHOTO_ERR'), 'danger');
    } finally {
      this.editPhotoUploading = false;
    }
  }

  removeEditPhoto(url: string): void {
    this.editForm.imageUrls = (this.editForm.imageUrls || []).filter(
      (u) => u !== url,
    );
  }

  submitEdit(): void {
    if (this.editSubmitting) {
      return;
    }
    if (!(this.editForm.title || '').trim()) {
      void this.toast(
        this.translate.instant('ALERTS.TITLE_REQUIRED'),
        'danger',
      );
      return;
    }
    this.editSubmitting = true;
    this.alertsService.update(this.alertId, this.editForm).subscribe({
      next: (a) => {
        this.applyAlert(a);
        this.editSubmitting = false;
        this.editOpen = false;
        void this.toast(this.translate.instant('ALERTS.EDIT_DONE'), 'success');
      },
      error: () => {
        this.editSubmitting = false;
        void this.toast(this.translate.instant('ALERTS.EDIT_ERR'), 'danger');
      },
    });
  }

  // ===== Suppression (auteur) =====
  async confirmDelete(): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: this.translate.instant('ALERTS.DELETE'),
      message: this.translate.instant('ALERTS.DELETE_CONFIRM'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('ALERTS.DELETE'),
          role: 'destructive',
          handler: () => {
            this.alertsService.remove(this.alertId).subscribe({
              next: () => {
                void this.toast(
                  this.translate.instant('ALERTS.DELETE_DONE'),
                  'success',
                );
                void this.router.navigate(['/tabs/alerts']);
              },
              error: () =>
                void this.toast(
                  this.translate.instant('ALERTS.DELETE_ERR'),
                  'danger',
                ),
            });
          },
        },
      ],
    });
    await confirm.present();
  }

  photoSrc(url: string): string {
    return resolveMediaUrl(url) || url;
  }

  trackByComment(_i: number, c: AlertComment): string {
    return c.id || String(_i);
  }

  private loadAlert(id: string): Observable<AlertLoadResult> {
    this.alertId = id;
    this.alert = undefined;
    this.images = [];
    this.loading = !!id;
    this.loadError = false;
    this.destroyMap();

    if (!id) {
      return of({ id, status: 'not-found' });
    }

    return this.alertsService.getById(id).pipe(
      timeout({ first: 15_000 }),
      map((alert): AlertLoadResult => ({ id, status: 'success', alert })),
      catchError((error: { status?: number } | null) =>
        of({
          id,
          status: error?.status === 404 ? 'not-found' : 'error',
        } as AlertLoadResult),
      ),
    );
  }

  private destroyMap(): void {
    this.map?.remove();
    this.map = undefined;
  }

  private tryInitMap(): void {
    if (
      this.map ||
      !this.alert ||
      typeof this.alert.lat !== 'number' ||
      typeof this.alert.lng !== 'number'
    ) {
      return;
    }
    const el = document.getElementById('alert-detail-map');
    if (!el) {
      return;
    }
    this.map = L.map(el, { center: [this.alert.lat, this.alert.lng], zoom: 9 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
    const icon = L.divIcon({
      className: `alert-marker alert-marker--${this.alert.category}`,
      html: '<span></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    L.marker([this.alert.lat, this.alert.lng], { icon }).addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private async toast(
    message: string,
    color: 'success' | 'danger' | 'medium' = 'medium',
  ): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 1800, color });
    await t.present();
  }
}
