import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import * as L from 'leaflet';

import { AlertsService, HealthAlert } from '../../core/services/alerts.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

@Component({
  selector: 'app-alert-detail',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  templateUrl: './alert-detail.page.html',
  styleUrls: ['./alert-detail.page.scss'],
})
export class AlertDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly alertsService = inject(AlertsService);

  alert?: HealthAlert;
  images: string[] = [];
  loading = true;
  private map?: L.Map;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      this.loading = false;
      return;
    }
    this.alertsService.getById(id).subscribe({
      next: (a) => {
        this.alert = {
          ...a,
          author: a.author
            ? {
                ...a.author,
                photoURL:
                  resolveMediaUrl(a.author.photoURL) ||
                  'assets/default-profile.png',
              }
            : null,
        };
        this.images = (a.imageUrls || []).map((u) => resolveMediaUrl(u) || u);
        this.loading = false;
        setTimeout(() => this.tryInitMap(), 300);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  ionViewDidEnter(): void {
    setTimeout(() => this.tryInitMap(), 300);
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
}
