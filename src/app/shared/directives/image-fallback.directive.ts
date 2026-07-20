import { Directive, HostListener, Input } from '@angular/core';

/** Remplace une image distante indisponible par un asset local fiable. */
@Directive({
  selector: 'img[appImageFallback]',
  standalone: true,
})
export class ImageFallbackDirective {
  @Input() appImageFallback = 'assets/default-profile.png';

  @HostListener('error', ['$event'])
  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    const fallback = `${this.appImageFallback || ''}`.trim();
    if (!image || !fallback || image.getAttribute('src') === fallback) return;
    image.src = fallback;
  }
}
