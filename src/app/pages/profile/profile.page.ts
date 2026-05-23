import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { PublicUser } from '../../core/models/user.models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage {
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  user: PublicUser | null = null;
  loading = false;
  saving = false;
  isSigningOut = false;
  errorMessage = '';

  readonly profileForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    institution: ['', [Validators.required, Validators.minLength(2)]],
    typeMedecin: [''],
    country: [''],
    city: [''],
    bio: [''],
    photoURL: [''],
  });

  async ionViewWillEnter(): Promise<void> {
    await this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.user = await firstValueFrom(this.usersService.getMe());
      this.profileForm.patchValue({
        username: this.user.username,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        institution: this.user.institution,
        typeMedecin: this.user.typeMedecin,
        country: this.user.country,
        city: this.user.city,
        bio: this.user.bio,
        photoURL: this.user.photoURL,
      });
    } catch {
      this.errorMessage = 'Unable to load your profile.';
    } finally {
      this.loading = false;
    }
  }

  async save(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    try {
      this.user = await firstValueFrom(
        this.usersService.updateMe(this.profileForm.getRawValue()),
      );
    } catch {
      this.errorMessage = 'Unable to save profile changes.';
    } finally {
      this.saving = false;
    }
  }

  async logout(): Promise<void> {
    this.isSigningOut = true;

    try {
      await this.authService.logout();
      await this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.isSigningOut = false;
    }
  }
}
