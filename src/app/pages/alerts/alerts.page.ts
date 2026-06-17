import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet.markercluster';

import {
  AlertCategory,
  AlertsService,
  CreateAlertPayload,
  HealthAlert,
} from '../../core/services/alerts.service';
import { InteractionGuardService } from '../../core/services/interaction-guard.service';
import { PublishService } from '../../services/publish/publish.service';
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
  private readonly router = inject(Router);
  private readonly publishService = inject(PublishService);

  @ViewChild('mapEl', { static: false }) mapEl?: ElementRef<HTMLElement>;

  alerts: HealthAlert[] = [];
  loading = true;
  activeCategory: 'all' | AlertCategory = 'all';
  nearActive = false;

  reportOpen = false;
  submitting = false;
  locating = false;
  photoUploading = false;
  form: CreateAlertPayload = this.emptyForm();

  private map?: L.Map;
  private markersLayer?: L.MarkerClusterGroup;
  private pickMap?: L.Map;
  private pickMarker?: L.Marker;

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
    this.markersLayer = L.markerClusterGroup({ maxClusterRadius: 50 });
    this.map.addLayer(this.markersLayer);
    this.renderMarkers();
  }

  setCategory(category: 'all' | AlertCategory): void {
    this.activeCategory = category;
    this.nearActive = false;
    this.loadAlerts();
  }

  private mapAlerts(items: HealthAlert[]): HealthAlert[] {
    return (items || []).map((a) => ({
      ...a,
      author: a.author
        ? {
            ...a.author,
            photoURL:
              resolveMediaUrl(a.author.photoURL) || 'assets/default-profile.png',
          }
        : null,
    }));
  }

  private loadAlerts(): void {
    this.loading = true;
    const filters =
      this.activeCategory === 'all' ? {} : { category: this.activeCategory };
    this.alertsService.list({ ...filters, limit: 100 }).subscribe({
      next: (items) => {
        this.alerts = this.mapAlerts(items);
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

  /** Charge les alertes les plus proches de ma position (GPS). */
  nearMe(): void {
    if (!navigator.geolocation) {
      void this.toast(this.translate.instant('ALERTS.LOCATION_UNSUPPORTED'), 'danger');
      return;
    }
    this.loading = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const cat =
          this.activeCategory === 'all' ? undefined : this.activeCategory;
        this.alertsService
          .near(pos.coords.latitude, pos.coords.longitude, 200, cat)
          .subscribe({
            next: (items) => {
              this.nearActive = true;
              this.alerts = this.mapAlerts(items);
              this.loading = false;
              this.renderMarkers();
              this.map?.setView(
                [pos.coords.latitude, pos.coords.longitude],
                7,
              );
            },
            error: () => {
              this.loading = false;
              void this.toast(this.translate.instant('ALERTS.NEAR_ERR'), 'danger');
            },
          });
      },
      (err) => {
        this.loading = false;
        let key = 'ALERTS.LOCATION_ERR';
        if (err?.code === 1) {
          key = 'ALERTS.LOCATION_DENIED';
        } else if (err?.code === 2) {
          key = 'ALERTS.LOCATION_UNAVAILABLE';
        } else if (err?.code === 3) {
          key = 'ALERTS.LOCATION_TIMEOUT';
        }
        void this.toast(this.translate.instant(key), 'danger');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }

  /** Ouvre la page de détail d'une alerte. */
  openDetail(a: HealthAlert): void {
    if (a?.id) {
      void this.router.navigate(['/tabs/alerts', a.id]);
    }
  }

  // ===== Photos =====
  async handlePhoto(event: any): Promise<void> {
    const files: File[] = Array.from(event?.target?.files || []);
    if (event?.target) {
      event.target.value = '';
    }
    if (!files.length) {
      return;
    }
    const current = this.form.imageUrls?.length || 0;
    const room = Math.max(0, 4 - current);
    this.photoUploading = true;
    try {
      for (const file of files.slice(0, room)) {
        const url = await this.publishService.uploadImage(file);
        this.form.imageUrls = [...(this.form.imageUrls || []), url];
      }
    } catch {
      void this.toast(this.translate.instant('ALERTS.PHOTO_ERR'), 'danger');
    } finally {
      this.photoUploading = false;
    }
  }

  removePhoto(url: string): void {
    this.form.imageUrls = (this.form.imageUrls || []).filter((u) => u !== url);
  }

  photoSrc(url: string): string {
    return resolveMediaUrl(url) || url;
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
    if (this.pickMap) {
      this.pickMap.remove();
      this.pickMap = undefined;
      this.pickMarker = undefined;
    }
  }

  // Mini-carte du formulaire : on l'initialise une fois la modale affichée.
  onReportPresent(): void {
    setTimeout(() => this.initPickMap(), 200);
  }

  private initPickMap(): void {
    const el = document.getElementById('alert-pick-map');
    if (!el) {
      return;
    }
    if (this.pickMap) {
      this.pickMap.invalidateSize();
      return;
    }
    const hasPoint =
      typeof this.form.lat === 'number' && typeof this.form.lng === 'number';
    const center: [number, number] = hasPoint
      ? [this.form.lat as number, this.form.lng as number]
      : [6.5, 16];
    this.pickMap = L.map(el, { center, zoom: hasPoint ? 9 : 3 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(this.pickMap);

    if (hasPoint) {
      this.pickMarker = L.marker(center, { icon: this.pickIcon() }).addTo(this.pickMap);
    }

    this.pickMap.on('click', (e: L.LeafletMouseEvent) => {
      this.form.lat = e.latlng.lat;
      this.form.lng = e.latlng.lng;
      if (this.pickMarker) {
        this.pickMarker.setLatLng(e.latlng);
      } else {
        this.pickMarker = L.marker(e.latlng, { icon: this.pickIcon() }).addTo(
          this.pickMap as L.Map,
        );
      }
    });

    setTimeout(() => this.pickMap?.invalidateSize(), 250);
  }

  private pickIcon(): L.DivIcon {
    return L.divIcon({
      className: 'pick-marker',
      html: '<span></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      void this.toast(this.translate.instant('ALERTS.LOCATION_UNSUPPORTED'), 'danger');
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating = false;
        this.form.lat = pos.coords.latitude;
        this.form.lng = pos.coords.longitude;
        void this.toast(this.translate.instant('ALERTS.LOCATION_OK'), 'success');
      },
      (err) => {
        this.locating = false;
        // Message précis selon la cause (permission / GPS éteint / délai).
        let key = 'ALERTS.LOCATION_ERR';
        if (err?.code === 1) {
          key = 'ALERTS.LOCATION_DENIED';
        } else if (err?.code === 2) {
          key = 'ALERTS.LOCATION_UNAVAILABLE';
        } else if (err?.code === 3) {
          key = 'ALERTS.LOCATION_TIMEOUT';
        }
        void this.toast(this.translate.instant(key), 'danger');
      },
      // Précision réseau (rapide, marche en intérieur) + délai large + cache récent.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
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
      imageUrls: this.form.imageUrls?.length ? this.form.imageUrls : undefined,
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
