import { Injectable } from '@angular/core';
import { CanLoad, Router, CanActivate } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanLoad {

  constructor(
    private authService: AuthService, 
    private router: Router) {}

  async canLoad(): Promise<boolean> {
      try {
        const user = await this.authService.checkAuth();
        // const uid = this.authService.getId();
        console.log(user);
        if(user) {
          return true;
        } else {
          this.navigate('/login');
          return false;
        }
      } catch(e) {
        console.log(e);
        this.navigate('/login');
        return false;
      }
  }

  navigate(url: any) {
    this.router.navigateByUrl(url, {replaceUrl: true});
  }

  async canActivate(): Promise<boolean> {
    const user = await firstValueFrom(this.authService.getAuthState());
    if (user) return true;
    this.router.navigateByUrl('/login', { replaceUrl: true });
    return false;
  }

}
