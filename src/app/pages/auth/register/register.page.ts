import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { LocationService } from '../../../core/services/location.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);
  private readonly phonePattern = /^[0-9][0-9\s().-]{5,18}$/;

  isTypePassword = true;
  isLoading = false;
  errorMessage = '';
  countries = this.locationService.country();
  cities = this.locationService.city(this.countries[0]?.id);

  readonly signupForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    institution: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    typeMedecin: ['', [Validators.required]],
    country: [this.countries[0]?.name ?? '', [Validators.required]],
    city: [{ value: '', disabled: true }, [Validators.required]],
    phoneCountryId: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    const firstCountry = this.countries[0];
    if (firstCountry) {
      this.applyCountrySelection(firstCountry);
    }
  }

  onCountryChange(countryName: string) {
    const selectedCountry = this.countries.find(
      (country) => country.name === countryName,
    );
    if (!selectedCountry) {
      this.cities = [];
      this.signupForm.get('city')?.reset('');
      this.signupForm.get('city')?.disable({ emitEvent: false });
      this.signupForm.patchValue({ country: '', city: '', phoneCountryId: '' });
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

  navigateToLogin() {
    const active = document.activeElement as HTMLElement | null;
    active?.blur();
    void this.router.navigateByUrl('/login');
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const formValue = this.signupForm.getRawValue();
      const payload = {
        ...formValue,
        phone: this.composePhoneNumber(formValue.phoneCountryId, formValue.phone),
      };
      delete (payload as { phoneCountryId?: string }).phoneCountryId;
      await firstValueFrom(this.authService.register(payload));
      await this.router.navigateByUrl('/tabs/dashbord', { replaceUrl: true });
      this.signupForm.reset();
    } catch {
      this.errorMessage = 'Unable to register right now. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private applyCountrySelection(selectedCountry: { id: string; name: string }) {
    const cityControl = this.signupForm.get('city');
    this.cities = this.locationService.city(selectedCountry.id);

    if (this.cities.length > 0) {
      cityControl?.enable({ emitEvent: false });
    } else {
      cityControl?.reset('');
      cityControl?.disable({ emitEvent: false });
    }

    this.signupForm.patchValue({
      country: selectedCountry.name,
      city: this.cities[0]?.name ?? '',
      phoneCountryId: selectedCountry.id,
    });
  }

  private composePhoneNumber(phoneCountryId: string, localPhone: string): string {
    const selectedCountry = this.countries.find(
      (country) => country.id === phoneCountryId,
    );
    const prefix = (selectedCountry?.dialCode || '').trim();
    const numberPart = (localPhone || '')
      .toString()
      .replace(/[^\d]/g, '')
      .trim();

    if (!prefix) {
      return numberPart;
    }

    return numberPart ? `${prefix} ${numberPart}` : prefix;
  }

  trackByCountryId(index: number, country: { id: string }): string {
    return country.id;
  }

  trackByCityName(index: number, city: { name: string }): string {
    return city.name;
  }
}
