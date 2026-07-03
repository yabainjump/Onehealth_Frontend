import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { firstValueFrom, take } from 'rxjs';
import { AuthService } from 'src/app/services/auth/auth.service';
import { GoogleAuthService } from 'src/app/core/services/google-auth.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],

  standalone: false,
})
export class LoginPage implements OnInit, AfterViewInit {

  form: FormGroup;
  isTypePassword: boolean = true;
  isLogin = false;
  isGoogleLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private readonly googleAuth: GoogleAuthService,
    private alertController: AlertController,
    private translate: TranslateService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    void this.redirectIfAlreadyAuthenticated();

  }

  ngAfterViewInit(): void {
    if (this.googleAuth.isConfigured) {
      this.googleAuth.renderButton('google-signin-btn');
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
      this.router.navigateByUrl('/tabs');
    } catch {
      this.showAlert(this.translate.instant('LOGIN.GOOGLE_ERROR'));
    } finally {
      this.isGoogleLoading = false;
      void this.waitForGoogleCredential();
    }
  }

  private async redirectIfAlreadyAuthenticated(): Promise<void> {
    try {
      const user = await firstValueFrom(this.authService.getAuthState().pipe(take(1)));
      if (user) {
        await this.router.navigateByUrl('/tabs/dashbord', { replaceUrl: true });
      }
    } catch {
      // noop: la page login reste affichée si l'état auth n'est pas disponible.
    }
  }

  navigateToSignup() {
  const active = document.activeElement as HTMLElement;
  if (active) {
    active.blur(); // enlève le focus de l'ion-button
  }
  this.router.navigateByUrl('/register');
}

  initForm() {
    this.form = new FormGroup({
      email: new FormControl('', 
        {validators: [Validators.required, Validators.email]}
      ),
      password: new FormControl('', 
        {validators: [Validators.required, Validators.minLength(8)]}
      ),
    });
  }

  onChange() {
    this.isTypePassword = !this.isTypePassword;
  }

  onSubmit() {
    if(!this.form.valid) return;
    console.log(this.form.value);
    this.login(this.form);
  }

  login(form) {
    // this.global.showLoader();
    this.isLogin = true;
    this.authService.login(form.value.email, form.value.password).then(data => {
      console.log(data);
      this.isLogin = false;
      this.router.navigateByUrl('/tabs');
      // this.global.hideLoader();
      form.reset();
    })
    .catch(e => {
      this.isLogin = false;
      console.log(e);
      // this.global.hideLoader();
      let msg: string = this.translate.instant('LOGIN.ERROR_GENERIC');
      if(e.code == 'auth/user-not-found') msg = this.translate.instant('LOGIN.ERROR_USER_NOT_FOUND');
      else if(e.code == 'auth/wrong-password') msg = this.translate.instant('LOGIN.ERROR_WRONG_PASSWORD');
      this.showAlert(msg);
    });
  }
  
  async showAlert(msg) {
    const alert = await this.alertController.create({
      header: this.translate.instant('COMMON.ALERT'),
      // subHeader: 'Important message',
      message: msg,
      buttons: ['OK'],
    });

    await alert.present();
  }

}
