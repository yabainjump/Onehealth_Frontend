import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth/auth.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false,
})
export class ForgotPasswordPage {
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isSubmitting = false;
  emailSent = false;
  submittedEmail = '';
  message = '';
  devResetToken = '';
  devResetUrl = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly toastController: ToastController,
    private readonly router: Router,
    private readonly translate: TranslateService,
  ) {}

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.message = '';
    this.devResetToken = '';
    this.devResetUrl = '';

    try {
      const email = this.form.getRawValue().email;
      const response = await this.authService.requestPasswordReset(email);

      this.message = response.message;
      this.devResetToken = response.resetToken ?? '';
      this.devResetUrl = response.resetUrl ?? '';
      this.submittedEmail = email;
      this.emailSent = true;
    } catch {
      const toast = await this.toastController.create({
        message: this.translate.instant('FORGOT.SEND_ERROR'),
        duration: 3500,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }

  resend(): void {
    this.emailSent = false;
    this.message = '';
    this.devResetToken = '';
    this.devResetUrl = '';
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  goToReset(): void {
    const token = this.devResetToken.trim();
    void this.router.navigate(['/reset-password'], {
      queryParams: token ? { token } : undefined,
    });
  }

  async copyToken(): Promise<void> {
    if (!this.devResetToken.trim() || !navigator?.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(this.devResetToken.trim());
    const toast = await this.toastController.create({
      message: this.translate.instant('FORGOT.TOKEN_COPIED'),
      duration: 1800,
      color: 'success',
    });
    await toast.present();
  }
}
