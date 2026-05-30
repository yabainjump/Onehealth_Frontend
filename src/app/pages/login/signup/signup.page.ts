import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { AuthService } from './../../../services/auth/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false,
})
export class SignupPage implements OnInit {
  signupForm: FormGroup;
  isTypePassword = true;
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
  ) {
    this.initForm();
  }

  ngOnInit() {}

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
        let msg = 'Could not sign you up, please try again.';
        if (e?.error?.message) {
          msg = Array.isArray(e.error.message) ? e.error.message[0] : e.error.message;
        } else if (e?.code === 'auth/email-already-in-use') {
          msg = 'Email already in use';
        }
        this.showAlert(msg);
      });
  }

  async showAlert(msg: string) {
    const alert = await this.alertController.create({
      header: 'Alert',
      message: msg,
      buttons: ['OK'],
    });

    await alert.present();
  }
}
