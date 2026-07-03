import { AfterViewInit, Directive, ElementRef, OnDestroy } from '@angular/core';

/**
 * Met en pause une <video> dès qu'elle sort du viewport (comportement
 * LinkedIn) et à la destruction de la vue. À poser sur la balise :
 * <video appPauseOffscreen ...>
 */
@Directive({ selector: 'video[appPauseOffscreen]', standalone: true })
export class PauseOffscreenDirective implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(private readonly el: ElementRef<HTMLVideoElement>) {}

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        const video = this.el.nativeElement;
        for (const entry of entries) {
          if (!entry.isIntersecting && !video.paused) {
            video.pause();
          }
        }
      },
      // En dessous de 25% de surface visible, on coupe la lecture.
      { threshold: 0.25 },
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.el.nativeElement.pause();
  }
}
