import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { AUTH_TOKEN_STORAGE_KEY } from '../constants/storage.constants';

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  async setToken(token: string): Promise<void> {
    await Preferences.set({
      key: AUTH_TOKEN_STORAGE_KEY,
      value: token,
    });
  }

  async getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: AUTH_TOKEN_STORAGE_KEY });
    return value;
  }

  async clearToken(): Promise<void> {
    await Preferences.remove({ key: AUTH_TOKEN_STORAGE_KEY });
  }
}
