import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

/**
 * Restreint une route aux administrateurs. Attend la résolution de
 * l'identité (checkAuth) et refuse par défaut si elle est inconnue.
 */
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      const user = await this.authService.checkAuth();
      if (user && user['role'] === 'admin') {
        return true;
      }
    } catch {
      // Identité non confirmée : accès refusé.
    }
    void this.router.navigateByUrl('/tabs/dashbord', { replaceUrl: true });
    return false;
  }
}
