import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'formatPost',
  standalone: false 
})
export class FormatPostPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    // 1) On échappe le HTML pour éviter les injections (XSS)
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // 2) On linkifie http(s)://... et www....
    const urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
    const linkified = escaped.replace(urlRegex, (match: string) => {
      const href = match.startsWith('http') ? match : `https://${match}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    });

    // 3) On remplace \n par des <br>
    const withBreaks = linkified.replace(/\n/g, '<br>');

    // 4) On “trust” ce HTML *après* l’avoir construit proprement
    return this.sanitizer.bypassSecurityTrustHtml(withBreaks);
  }
}
