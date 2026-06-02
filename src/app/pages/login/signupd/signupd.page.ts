import { AuthService } from './../../../services/auth/auth.service';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-signupd',
  templateUrl: './signupd.page.html',
  styleUrls: ['./signupd.page.scss'],
  
  standalone: false,
})
export class SignupdPage implements OnInit {

  signupForm: FormGroup;
  isTypePassword: boolean = true;
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private translate: TranslateService
  ) {
    this.initForm();
  }

  ngOnInit() {
  }

  initForm() {
    this.signupForm = new FormGroup({
      username: new FormControl('', 
        {validators: [Validators.required]}
      ),
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
    if(!this.signupForm.valid) return;
    console.log(this.signupForm.value);
    this.register(this.signupForm);
  }

  register(form) {
    // this.global.showLoader();
    this.isLoading = true;
    console.log(form.value);
    this.authService.register(form.value).then((data: any) => {
      console.log(data);
      this.router.navigateByUrl('/tabs', {replaceUrl: true});
      // this.global.hideLoader();
      this.isLoading = false;
      form.reset();
    })
    .catch(e => {
      console.log(e);
      // this.global.hideLoader();
      this.isLoading = false;
      let msg: string = this.translate.instant('SIGNUPD.ERROR_GENERIC');
      if(e.code == 'auth/email-already-in-use') {
        msg = this.translate.instant('SIGNUPD.ERROR_EMAIL_IN_USE');
      }
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
