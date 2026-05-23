import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { AuthService } from './../../../services/auth/auth.service';
import {
  LocationCity,
  LocationCountry,
  LocationService,
} from 'src/app/services/location/location.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false,
})
export class SignupPage implements OnInit {
  private readonly phonePattern = /^[0-9][0-9\s().-]{5,18}$/;

  signupForm: FormGroup;
  isTypePassword = true;
  isLoading = false;
  countries: LocationCountry[] = [];
  cities: LocationCity[] = [];
  selectedCountry: LocationCountry | undefined;

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private locationService: LocationService,
  ) {
    this.initForm();
    this.countries = this.locationService.country();

    if (this.countries.length > 0) {
      this.selectedCountry = this.countries[0];
      this.applyCountrySelection(this.selectedCountry);
    }
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
      institution: new FormControl('', {
        validators: [Validators.required, Validators.minLength(2)],
      }),
      username: new FormControl('', { validators: [Validators.required] }),
      email: new FormControl('', {
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        validators: [Validators.required, Validators.minLength(8)],
      }),
      typeMedecin: new FormControl('', { validators: [Validators.required] }),
      country: new FormControl('', { validators: [Validators.required] }),
      city: new FormControl({ value: '', disabled: true }, { validators: [Validators.required] }),
      phoneCountryId: new FormControl('', { validators: [Validators.required] }),
      phone: new FormControl('', {
        validators: [Validators.required, Validators.pattern(this.phonePattern)],
      }),
    });
  }

  onCountryChange(countryName: string) {
    const selectedCountry = this.countries.find(
      (country) => country.name === countryName,
    );

    if (!selectedCountry) {
      this.selectedCountry = undefined;
      this.cities = [];
      this.signupForm.patchValue({ country: '', city: '', phoneCountryId: '' });
      this.signupForm.get('city')?.reset('');
      this.signupForm.get('city')?.disable({ emitEvent: false });
      return;
    }

    this.applyCountrySelection(selectedCountry);
  }

  onPhoneCountryChange(countryId: string) {
    const selectedCountry = this.countries.find(
      (country) => country.id === countryId,
    );
    if (!selectedCountry) {
      return;
    }
    this.signupForm.patchValue({ phoneCountryId: selectedCountry.id });
  }

  onChange() {
    this.isTypePassword = !this.isTypePassword;
  }

  onSubmit() {
    if (!this.signupForm.valid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const formValue = this.signupForm.getRawValue();
    this.register({
      ...formValue,
      phone: this.composePhoneNumber(formValue.phoneCountryId, formValue.phone),
    });
  }

  register(formValue: any) {
    this.isLoading = true;
    this.authService
      .register(formValue)
      .then(() => {
        this.router.navigateByUrl('/tabs', { replaceUrl: true });
        this.isLoading = false;
        this.signupForm.reset();
      })
      .catch((e) => {
        console.log(e);
        this.isLoading = false;
        let msg = 'Could not sign you up, please try again.';
        if (e.code == 'auth/email-already-in-use') {
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

  private applyCountrySelection(selectedCountry: LocationCountry) {
    const cityControl = this.signupForm.get('city');

    this.selectedCountry = selectedCountry;
    this.cities = this.locationService.city(selectedCountry.id);

    if (this.cities.length > 0) {
      cityControl?.enable({ emitEvent: false });
    } else {
      cityControl?.reset('');
      cityControl?.disable({ emitEvent: false });
    }

    this.signupForm.patchValue({
      country: selectedCountry.name,
      city: this.cities[0]?.name || '',
      phoneCountryId: selectedCountry.id,
    });
  }

  private composePhoneNumber(phoneCountryId: string, localPhone: string): string {
    const selectedCountry = this.countries.find(
      (country) => country.id === phoneCountryId,
    );
    const normalizedPrefix = (selectedCountry?.dialCode || '').trim();
    const numberPart = (localPhone || '')
      .toString()
      .replace(/[^\d]/g, '')
      .trim();

    if (!normalizedPrefix) {
      return numberPart;
    }

    return numberPart ? `${normalizedPrefix} ${numberPart}` : normalizedPrefix;
  }

  trackByCountryId(index: number, country: LocationCountry): string {
    return country.id;
  }

  trackByCityName(index: number, city: LocationCity): string {
    return city.name;
  }
}
