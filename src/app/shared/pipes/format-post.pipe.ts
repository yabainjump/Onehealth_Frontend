import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { buildPostHtml } from '../utils/post-html.util';

@Pipe({
  name: 'formatPost',
  standalone: false
})
export class FormatPostPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    // Échappe le HTML, linkifie URLs + #hashtags, gère les sauts de ligne.
    return this.sanitizer.bypassSecurityTrustHtml(buildPostHtml(value));
  }
}
