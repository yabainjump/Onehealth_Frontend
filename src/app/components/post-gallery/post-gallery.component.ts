import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';

interface GalleryTile {
  url: string; // miniature (affichage dans la mosaique)
  full: string; // image originale (repli d'erreur + plein ecran)
}

@Component({
  selector: 'app-post-gallery',
  templateUrl: './post-gallery.component.html',
  styleUrls: ['./post-gallery.component.scss'],
  standalone: false,
})
export class PostGalleryComponent {
  // Miniatures a afficher (forme tableau).
  @Input() images?: string[] | null;
  // Originaux correspondants (repli si la miniature echoue + visionneuse).
  @Input() fullImages?: string[] | null;
  // Ancien format : image unique (miniature + original).
  @Input() legacyImage?: string | null;
  @Input() legacyFull?: string | null;
  // Si vrai, cliquer ouvre la visionneuse plein ecran interne (detail du post).
  // Sinon, on emet (imageOpen) pour laisser le parent decider (fil -> ouvrir le detail).
  @Input() lightbox = false;

  @Output() imageOpen = new EventEmitter<number>();

  viewerOpen = false;
  viewerIndex = 0;

  // Nombre max d'images affichees dans la mosaique (au-dela -> overlay "+N").
  private static readonly MAX_TILES = 4;

  get tiles(): GalleryTile[] {
    const display = this.images || [];
    const full = this.fullImages || [];
    const list: GalleryTile[] = display
      .filter((url) => !!url)
      .map((url, i) => ({ url, full: full[i] || url }));

    if (!list.length && this.legacyImage) {
      list.push({
        url: this.legacyImage,
        full: this.legacyFull || this.legacyImage,
      });
    }
    return list;
  }

  // Tuiles reellement rendues (4 max ; la derniere porte l'overlay "+N").
  get visibleTiles(): GalleryTile[] {
    return this.tiles.slice(0, PostGalleryComponent.MAX_TILES);
  }

  get extraCount(): number {
    return Math.max(0, this.tiles.length - PostGalleryComponent.MAX_TILES);
  }

  get layoutClass(): string {
    const count = this.tiles.length;
    if (count <= 1) return 'count-1';
    if (count === 2) return 'count-2';
    if (count === 3) return 'count-3';
    if (count === 4) return 'count-4';
    return 'count-many';
  }

  onTileClick(index: number): void {
    if (this.lightbox) {
      this.openViewer(index);
    } else {
      this.imageOpen.emit(index);
    }
  }

  openViewer(index: number): void {
    if (!this.tiles.length) {
      return;
    }
    this.viewerIndex = Math.min(Math.max(index, 0), this.tiles.length - 1);
    this.viewerOpen = true;
  }

  closeViewer(event?: Event): void {
    event?.stopPropagation();
    this.viewerOpen = false;
  }

  prev(event?: Event): void {
    event?.stopPropagation();
    const count = this.tiles.length;
    if (!count) {
      return;
    }
    this.viewerIndex = (this.viewerIndex - 1 + count) % count;
  }

  next(event?: Event): void {
    event?.stopPropagation();
    const count = this.tiles.length;
    if (!count) {
      return;
    }
    this.viewerIndex = (this.viewerIndex + 1) % count;
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  // Repli : si la miniature (/media/thumb) echoue, on bascule sur l'original.
  // Si l'original est lui aussi absent, masquer l'element natif casse (alt-text)
  // et afficher l'etat indisponible prevu par la galerie.
  onImgError(event: Event, fallback?: string): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) {
      return;
    }

    if (
      fallback &&
      img.dataset['fallbackApplied'] !== 'true' &&
      img.getAttribute('src') !== fallback
    ) {
      img.dataset['fallbackApplied'] = 'true';
      img.src = fallback;
      return;
    }

    img.classList.add('is-unavailable');
  }

  trackByIndex(index: number): number {
    return index;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.viewerOpen) {
      return;
    }
    if (event.key === 'Escape') {
      this.closeViewer();
    } else if (event.key === 'ArrowLeft') {
      this.prev();
    } else if (event.key === 'ArrowRight') {
      this.next();
    }
  }
}
