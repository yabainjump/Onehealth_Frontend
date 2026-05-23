import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'fr' | 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private static readonly STORAGE_KEY = 'onehealth_app_lang';
  private readonly currentLanguageSubject = new BehaviorSubject<AppLanguage>(
    this.readInitialLanguage(),
  );

  readonly currentLanguage$ = this.currentLanguageSubject.asObservable();

  getCurrentLanguage(): AppLanguage {
    return this.currentLanguageSubject.value;
  }

  setLanguage(language: AppLanguage): void {
    if (language !== 'fr' && language !== 'en') {
      return;
    }

    this.currentLanguageSubject.next(language);
    try {
      localStorage.setItem(LanguageService.STORAGE_KEY, language);
    } catch {
      // ignore storage errors
    }
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
