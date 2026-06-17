import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';

import {
  AlertCategory,
  AlertsService,
  CreateAlertPayload,
  HealthAlert,
} from '../../core/services/alerts.service';
import { InteractionGuardService } from '../../core/services/interaction-guard.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule],
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
})
export class AlertsPage implements OnInit {
  private readonly alertsService = inject(AlertsService);
  private readonly interactionGuard = inject(InteractionGuardService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);

  @ViewChild('mapEl', { static: false }) mapEl?: ElementRef<HTMLElement>;

  alerts: HealthAlert[] = [];
  loading = true;
  activeCategory: 'all' | AlertCategory = 'all';

  reportOpen = false;
  submitting = false;
  form: CreateAlertPayload = this.emptyForm();

  private map?: L.Map;
  private markersLayer?: L.LayerGroup;

  ngOnInit(): void {
    this.loadAlerts();
  }

  // La carte ne s'initialise qu'une fois la page affichée (sinon Leaflet
  // calcule mal sa taille à cause de l'animation d'entrée Ionic).
  ionViewDidEnter(): void {
    this.initMap();
    setTimeout(() => this.map?.invalidateSize(), 250);
  }

  private initMap(): void {
    if (this.map || !this.mapEl) {
      this.map?.invalidateSize();
      return;
    }
    this.map = L.map(this.mapEl.nativeElement, {
      center: [6.5, 16], // Afrique centrale par défaut
      zoom: 3,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers();
  }

  setCategory(category: 'all' | AlertCategory): void {
    this.activeCategory = category;
    this.loadAlerts();
  }

  private loadAlerts(): void {
    this.loading = true;
    const filters =
      this.activeCategory === 'all' ? {} : { category: this.activeCategory };
    this.alertsService.list({ ...filters, limit: 100 }).subscribe({
      next: (items) => {
        this.alerts = (items || []).map((a) => ({
          ...a,
          author: a.author
            ? {
                ...a.author,
                photoURL:
                  resolveMediaUrl(a.author.photoURL) ||
                  'assets/default-profile.png',
              }
            : null,
        }));
        this.loading = false;
        this.renderMarkers();
      },
      error: () => {
        this.alerts = [];
        this.loading = false;
        this.renderMarkers();
      },
    });
  }

  private renderMarkers(): void {
    if (!this.map || !this.markersLayer) {
      return;
    }
    this.markersLayer.clearLayers();
    const withCoords = this.alerts.filter(
      (a) => typeof a.lat === 'number' && typeof a.lng === 'number',
    );
    for (const a of withCoords) {
      const icon = L.divIcon({
        className: `alert-marker alert-marker--${a.category}`,
        html: '<span></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([a.lat as number, a.lng as number], { icon })
        .bindPopup(
          `<strong>${this.escape(a.title)}</strong><br>${this.escape(
            [a.city, a.country].filter(Boolean).join(', '),
          )}`,
        )
        .addTo(this.markersLayer);
    }
    if (withCoords.length) {
      const bounds = L.latLngBounds(
        withCoords.map((a) => [a.lat as number, a.lng as number] as [number, number]),
      );
      this.map.fitBounds(bounds.pad(0.25), { maxZoom: 8 });
    }
  }

  focusAlert(a: HealthAlert): void {
    if (this.map && typeof a.lat === 'number' && typeof a.lng === 'number') {
      this.map.setView([a.lat, a.lng], 9);
    }
  }

  // ===== Signalement =====
  async openReport(): Promise<void> {
    if (!(await this.interactionGuard.requireAuth())) {
      return;
    }
    this.form = this.emptyForm();
    this.reportOpen = true;
  }

  closeReport(): void {
    this.reportOpen = false;
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      void this.toast(this.translate.instant('ALERTS.LOCATION_ERR'), 'danger');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.lat = pos.coords.latitude;
        this.form.lng = pos.coords.longitude;
        void this.toast(this.translate.instant('ALERTS.LOCATION_OK'), 'success');
      },
      () => void this.toast(this.translate.instant('ALERTS.LOCATION_ERR'), 'danger'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  submitReport(): void {
    if (this.submitting) {
      return;
    }
    if (!this.form.title?.trim()) {
      void this.toast(this.translate.instant('ALERTS.TITLE_REQUIRED'), 'danger');
      return;
    }
    this.submitting = true;
    const payload: CreateAlertPayload = {
      category: this.form.category,
      title: this.form.title.trim(),
      description: this.form.description?.trim() || undefined,
      country: this.form.country?.trim() || undefined,
      city: this.form.city?.trim() || undefined,
      severity: this.form.severity,
      lat: typeof this.form.lat === 'number' ? this.form.lat : undefined,
      lng: typeof this.form.lng === 'number' ? this.form.lng : undefined,
    };
    this.alertsService.create(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.reportOpen = false;
        void this.toast(this.translate.instant('ALERTS.REPORT_DONE'), 'success');
        this.loadAlerts();
      },
      error: () => {
        this.submitting = false;
        void this.toast(this.translate.instant('ALERTS.REPORT_ERR'), 'danger');
      },
    });
  }

  trackById(_index: number, a: HealthAlert): string {
    return a.id || String(_index);
  }

  private emptyForm(): CreateAlertPayload {
    return {
      category: 'animal',
      title: '',
      description: '',
      country: '',
      city: '',
      severity: 'medium',
    };
  }

  private escape(value: string): string {
    return `${value || ''}`.replace(
      /[&<>"]/g,
      (c) =>
        (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }) as Record<
          string,
          string
        >)[c],
    );
  }

  private async toast(
    message: string,
    color: 'success' | 'danger' | 'medium' = 'medium',
  ): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 1800, color });
    await t.present();
  }
}
