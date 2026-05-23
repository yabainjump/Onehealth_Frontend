import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { ToastController } from '@ionic/angular';

import { UploadService } from '../../core/services/upload.service';
import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  
  standalone: false,
})
export class EditProfilePage implements OnInit {
  user: any = {};
  userId = '';
  photoURL = 'assets/default-profile.png';
  loadingProfile = true;
  savingProfile = false;
  readonly bioMaxLength = 280;

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
    private readonly router: Router,
    private readonly toastController: ToastController,
  ) {}

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
      country: data?.country || '',
      city: data?.city || '',
      phone: data?.phone || '',
      bio: data?.bio || '',
    };
    this.photoURL =
      data?.photoURL || data?.photo || 'assets/default-profile.png';
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
      this.photoURL = uploaded.url;
      this.user.photoURL = uploaded.url;
    };
    input.click();
  }

  async updateProfile() {
    if (this.savingProfile || !this.userId) return;
    this.savingProfile = true;

    const payload = {
      username: (this.user.username || '').trim(),
      firstName: (this.user.firstName || '').trim(),
      lastName: (this.user.lastName || '').trim(),
      institution: (this.user.institution || '').trim(),
      country: (this.user.country || '').trim(),
      city: (this.user.city || '').trim(),
      phone: (this.user.phone || '').trim(),
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
