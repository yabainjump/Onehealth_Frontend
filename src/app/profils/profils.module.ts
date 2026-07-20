import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { ProfilsPageRoutingModule } from './profils-routing.module';

import { ProfilsPage } from './profils.page';
import { ImageFallbackDirective } from '../shared/directives/image-fallback.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfilsPageRoutingModule,
    TranslateModule,
    ImageFallbackDirective,
  ],
  declarations: [ProfilsPage],
})
export class ProfilsPageModule {}
