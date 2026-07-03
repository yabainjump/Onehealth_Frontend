import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from './../../../services/auth/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false,
})
export class SignupPage implements OnInit, AfterViewInit {
  signupForm: FormGroup;
  isTypePassword = true;
  isLoading = false;
  isGoogleLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private readonly googleAuth: GoogleAuthService,
    private alertController: AlertController,
    private translate: TranslateService,
  ) {
    this.initForm();
  }

  ngOnInit() {}

  ngAfterViewInit(): void {
    if (this.googleAuth.isConfigured) {
      this.googleAuth.renderButton('google-signup-btn');
      void this.waitForGoogleCredential();
    }
  }

  get showGoogleButton(): boolean {
    return this.googleAuth.isConfigured;
  }

  private async waitForGoogleCredential(): Promise<void> {
    const idToken = await this.googleAuth.waitForCredential();
    this.isGoogleLoading = true;
    try {
      await this.authService.loginWithGoogle(idToken);
      this.router.navigateByUrl('/tabs', { replaceUrl: true });
    } catch {
      this.showAlert(this.translate.instant('SIGNUP.GOOGLE_ERROR'));
    } finally {
      this.isGoogleLoading = false;
      void this.waitForGoogleCredential();
    }
  }

  navigateToLogin() {
    const active = document.activeElement as HTMLElement;
    if (active) {
      active.blur();
    }
    this.router.navigateByUrl('/login');
  }

  initForm() {
    this.signupForm = new FormGroup({
      firstName: new FormControl('', {
        validators: [Validators.required, Validators.minLength(2)],
      }),
      lastName: new FormControl('', {
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: new FormControl('', {
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        validators: [Validators.required, Validators.minLength(8)],
      }),
    });
  }

  onChange() {
    this.isTypePassword = !this.isTypePassword;
  }

  onSubmit() {
    if (!this.signupForm.valid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.register(this.signupForm.getRawValue());
  }

  register(formValue: any) {
    this.isLoading = true;
    this.authService
      .register(formValue)
      .then(() => {
        this.isLoading = false;
        this.signupForm.reset();
        // Nouveau compte : on invite a completer le profil.
        this.router.navigateByUrl('/tabs', { replaceUrl: true });
      })
      .catch((e) => {
        console.log(e);
        this.isLoading = false;
        let msg = this.translate.instant('SIGNUP.ERROR_GENERIC');
        if (e?.error?.message) {
          msg = Array.isArray(e.error.message) ? e.error.message[0] : e.error.message;
        } else if (e?.code === 'auth/email-already-in-use') {
          msg = this.translate.instant('SIGNUP.ERROR_EMAIL_IN_USE');
        }
        this.showAlert(msg);
      });
  }

  async showAlert(msg: string) {
    const alert = await this.alertController.create({
      header: this.translate.instant('COMMON.ALERT'),
      message: msg,
      buttons: ['OK'],
    });

    await alert.present();
  }
}
