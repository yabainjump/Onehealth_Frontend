import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { ToastController } from '@ionic/angular';

import { UploadService } from '../../core/services/upload.service';
import { UsersService } from '../../core/services/users.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';
import { AuthService } from '../../services/auth/auth.service';
import {
  LocationCity,
  LocationCountry,
  LocationService,
} from 'src/app/services/location/location.service';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  
  standalone: false,
})
export class EditProfilePage implements OnInit {
  private readonly phonePattern = /^[0-9][0-9\s().-]{5,18}$/;

  user: any = {};
  userId = '';
  photoURL = 'assets/default-profile.png';
  loadingProfile = true;
  savingProfile = false;
  readonly bioMaxLength = 280;
  countries: LocationCountry[] = [];
  cities: LocationCity[] = [];
  phoneCountryId = '';
  localPhone = '';
  readonly typeMedecinOptions = [
    'Generaliste',
    'Dentiste',
    'Ophtamologue',
    'Cardiologue',
    'Dermatologue',
    'ORL',
    'Gynecologue',
    'Vet',
    'Ing',
    'Bio',
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
    private readonly locationService: LocationService,
    private readonly router: Router,
    private readonly toastController: ToastController,
  ) {
    this.countries = this.locationService.country();
  }

  ngOnInit() {
    void this.resolveCurrentUserAndLoadProfile();
  }

  private async resolveCurrentUserAndLoadProfile() {
    const user = await firstValueFrom(this.authService.getAuthState().pipe(take(1)));
    if (user?.uid) {
      this.userId = user.uid;
      await this.loadUserProfile();
      return;
    }
    this.loadingProfile = false;
  }

  async loadUserProfile() {
    if (!this.userId) {
      this.loadingProfile = false;
      return;
    }
    this.loadingProfile = true;
    try {
      const user = await this.authService.getUserData(this.userId);
      this.setUserProfile(user);
    } finally {
      this.loadingProfile = false;
    }
  }

  private setUserProfile(data: any) {
    this.user = {
      username: data?.username || '',
      firstName: data?.firstName || '',
      lastName: data?.lastName || '',
      institution: data?.institution || '',
      typeMedecin: data?.typeMedecin || '',
      country: data?.country || '',
      city: data?.city || '',
      phone: data?.phone || '',
      bio: data?.bio || '',
    };
    this.photoURL =
      resolveMediaUrl(data?.photoURL || data?.photo) || 'assets/default-profile.png';

    this.initializeCountryAndCity();
    this.initializePhoneParts();
  }

  changeProfilePicture() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event: any) => {
      const file = event?.target?.files?.[0] as File | undefined;
      if (!file) {
        return;
      }
      if (!file.type?.startsWith('image/')) {
        await this.presentToast('Veuillez choisir une image valide.', 'warning');
        return;
      }

      const uploaded = await firstValueFrom(this.uploadService.uploadProfile(file));
      this.photoURL = resolveMediaUrl(uploaded.url);
      this.user.photoURL = uploaded.url;
    };
    input.click();
  }

  async updateProfile() {
    if (this.savingProfile || !this.userId) return;
    this.savingProfile = true;

    if (
      this.localPhone &&
      !this.phonePattern.test(this.localPhone)
    ) {
      await this.presentToast('Veuillez entrer un numero valide.', 'warning');
      this.savingProfile = false;
      return;
    }

    const payload = {
      username: (this.user.username || '').trim(),
      firstName: (this.user.firstName || '').trim(),
      lastName: (this.user.lastName || '').trim(),
      institution: (this.user.institution || '').trim(),
      typeMedecin: (this.user.typeMedecin || '').trim(),
      country: (this.user.country || '').trim(),
      city: (this.user.city || '').trim(),
      phone: this.composePhoneNumber(this.phoneCountryId, this.localPhone),
      photoURL: this.user.photoURL || this.photoURL,
      bio: (this.user.bio || '').trim().slice(0, this.bioMaxLength),
    };

    try {
      await firstValueFrom(this.usersService.updateMe(payload));
      await this.presentToast('Profil mis a jour avec succes.', 'success');
      await this.router.navigate(['/tabs/profils']);
    } catch (error) {
      console.error(error);
      await this.presentToast('Impossible de mettre a jour le profil.', 'danger');
    } finally {
      this.savingProfile = false;
    }
  }

  async cancel() {
    await this.router.navigate(['/tabs/profils']);
  }

  get bioLength(): number {
    return (this.user?.bio || '').length;
  }

  onCountryChange(countryName: string) {
    const selectedCountry = this.countries.find(
      (country) => country.name === countryName,
    );

    if (!selectedCountry) {
      this.user.country = '';
      this.user.city = '';
      this.cities = [];
      return;
    }

    this.user.country = selectedCountry.name;
    this.cities = this.locationService.city(selectedCountry.id);
    this.user.city = this.cities.find((city) => city.name === this.user.city)?.name
      || this.cities[0]?.name
      || '';

    if (!this.phoneCountryId) {
      this.phoneCountryId = selectedCountry.id;
    }
  }

  onPhoneCountryChange(countryId: string) {
    const selectedCountry = this.countries.find((country) => country.id === countryId);
    if (!selectedCountry) {
      return;
    }
    this.phoneCountryId = selectedCountry.id;
  }

  trackByCountryId(index: number, country: LocationCountry): string {
    return country.id;
  }

  trackByCityName(index: number, city: LocationCity): string {
    return city.name;
  }

  private initializeCountryAndCity() {
    const currentCountryName = `${this.user.country || ''}`.trim();
    const selectedCountry =
      this.countries.find((country) => country.name === currentCountryName) ||
      this.countries[0];

    if (!selectedCountry) {
      this.cities = [];
      this.user.country = '';
      this.user.city = '';
      return;
    }

    this.user.country = selectedCountry.name;
    this.cities = this.locationService.city(selectedCountry.id);
    this.user.city = this.cities.find((city) => city.name === this.user.city)?.name
      || this.user.city
      || this.cities[0]?.name
      || '';

    if (!this.phoneCountryId) {
      this.phoneCountryId = selectedCountry.id;
    }
  }

  private initializePhoneParts() {
    const rawPhone = `${this.user.phone || ''}`.trim();
    if (!rawPhone) {
      this.localPhone = '';
      if (!this.phoneCountryId && this.countries.length > 0) {
        this.phoneCountryId = this.countries[0].id;
      }
      return;
    }

    const normalized = rawPhone.replace(/\s+/g, ' ').trim();
    const countriesByPrefixLength = [...this.countries].sort(
      (a, b) => (b.dialCode || '').length - (a.dialCode || '').length,
    );

    for (const country of countriesByPrefixLength) {
      const dialCode = (country.dialCode || '').trim();
      if (!dialCode) {
        continue;
      }
      if (normalized.startsWith(`${dialCode} `) || normalized === dialCode) {
        this.phoneCountryId = country.id;
        this.localPhone = normalized.slice(dialCode.length).trim();
        return;
      }
    }

    this.localPhone = normalized.replace(/[^\d\s().-]/g, '').trim();
    if (!this.phoneCountryId && this.countries.length > 0) {
      this.phoneCountryId = this.countries[0].id;
    }
  }

  private composePhoneNumber(phoneCountryId: string, localPhone: string): string {
    const selectedCountry = this.countries.find(
      (country) => country.id === phoneCountryId,
    );
    const prefix = `${selectedCountry?.dialCode || ''}`.trim();
    const numberPart = `${localPhone || ''}`
      .replace(/[^\d]/g, '')
      .trim();

    if (!prefix) {
      return numberPart;
    }

    return numberPart ? `${prefix} ${numberPart}` : prefix;
  }

  private async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ) {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 1700,
      position: 'top',
    });
    await toast.present();
  }
}
