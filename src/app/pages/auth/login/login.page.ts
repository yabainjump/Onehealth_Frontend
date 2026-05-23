import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isTypePassword = true;
  isLogin = false;
  errorMessage = '';

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onChange() {
    this.isTypePassword = !this.isTypePassword;
  }

  navigateToSignup() {
    const active = document.activeElement as HTMLElement | null;
    active?.blur();
    void this.router.navigateByUrl('/register');
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLogin = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(this.authService.login(this.form.getRawValue()));
      await this.router.navigateByUrl('/tabs/dashbord', { replaceUrl: true });
      this.form.reset();
    } catch {
      this.errorMessage = 'Unable to login. Check your credentials and try again.';
    } finally {
      this.isLogin = false;
    }
  }
}
