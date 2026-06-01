import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'fr' | 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private static readonly STORAGE_KEY = 'onehealth_app_lang';
  private static readonly SUPPORTED: AppLanguage[] = ['fr', 'en'];

  private readonly translate = inject(TranslateService);
  private readonly currentLanguageSubject = new BehaviorSubject<AppLanguage>(
    this.readInitialLanguage(),
  );

  readonly currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor() {
    this.translate.addLangs(LanguageService.SUPPORTED);
    this.translate.use(this.currentLanguageSubject.value);
  }

  getCurrentLanguage(): AppLanguage {
    return this.currentLanguageSubject.value;
  }

  setLanguage(language: AppLanguage): void {
    if (!LanguageService.SUPPORTED.includes(language)) {
      return;
    }

    this.currentLanguageSubject.next(language);
    this.translate.use(language);
    try {
      localStorage.setItem(LanguageService.STORAGE_KEY, language);
    } catch {
      // ignore storage errors
    }
  }

  toggleLanguage(): void {
    this.setLanguage(this.getCurrentLanguage() === 'fr' ? 'en' : 'fr');
  }

  private readInitialLanguage(): AppLanguage {
    try {
      const storedValue = localStorage.getItem(LanguageService.STORAGE_KEY);
      if (storedValue === 'fr' || storedValue === 'en') {
        return storedValue;
      }
    } catch {
      // ignore storage errors
    }
    return 'fr';
  }
}
