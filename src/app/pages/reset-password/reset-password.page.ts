import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth/auth.service';

const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value ?? '';
  const confirmPassword = control.get('confirmPassword')?.value ?? '';

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false,
})
export class ResetPasswordPage {
  readonly form = this.formBuilder.nonNullable.group(
    {
      token: ['', [Validators.required, Validators.minLength(20)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    },
    { validators: passwordMatchValidator },
  );

  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastController: ToastController,
  ) {
    const initialToken = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (initialToken.trim()) {
      this.form.patchValue({ token: initialToken.trim() });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    try {
      const payload = this.form.getRawValue();
      await this.authService.resetPassword(payload.token, payload.password);

      const toast = await this.toastController.create({
        message: 'Mot de passe modifié. Tu peux maintenant te connecter.',
        duration: 3000,
        color: 'success',
      });
      await toast.present();

      void this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch {
      const toast = await this.toastController.create({
        message:
          'Lien/token invalide ou expiré. Recommence la procédure mot de passe oublié.',
        duration: 3800,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }
}
