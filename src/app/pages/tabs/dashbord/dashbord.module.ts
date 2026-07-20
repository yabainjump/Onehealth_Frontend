import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormatPostPipe } from 'src/app/shared/pipes/format-post.pipe';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { DashbordPageRoutingModule } from './dashbord-routing.module';

import { DashbordPage } from './dashbord.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PauseOffscreenDirective } from 'src/app/shared/directives/pause-offscreen.directive';
import { ImageFallbackDirective } from 'src/app/shared/directives/image-fallback.directive';

@NgModule({
  exports: [FormatPostPipe],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DashbordPageRoutingModule,
    TranslateModule,
    ComponentsModule,
    PauseOffscreenDirective,
    ImageFallbackDirective,
  ],
  declarations: [DashbordPage, FormatPostPipe],
})
export class DashbordPageModule {}
