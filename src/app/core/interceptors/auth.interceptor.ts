import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { TokenStorageService } from '../services/token-storage.service';
import { environment } from '../../../environments/environment';

export function isBackendApiRequest(
  requestUrl: string,
  apiBaseUrl = environment.apiBaseUrl,
): boolean {
  const base = `${apiBaseUrl || ''}`.replace(/\/+$/, '');
  if (!base) {
    return false;
  }

  const urlWithoutQuery = `${requestUrl || ''}`.split(/[?#]/, 1)[0];
  return urlWithoutQuery === base || urlWithoutQuery.startsWith(`${base}/`);
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly tokenStorage = inject(TokenStorageService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return from(this.tokenStorage.getToken()).pipe(
      switchMap((token) => {
        // Ne jamais transmettre le JWT à une API tierce (visualiseur de
        // documents, ancien bot, futur fournisseur IA, etc.).
        if (!token || !isBackendApiRequest(req.url)) {
          return next.handle(req);
        }

        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });

        return next.handle(authReq);
      }),
    );
  }
}
