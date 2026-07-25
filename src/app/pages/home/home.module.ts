import { ComponentsModule } from './../../components/components.module';
import { UserListComponent } from './../../components/user-list/user-list.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { HomePageRoutingModule } from './home-routing.module';

import { HomePage } from './home.page';
import { RudolfChatComponent } from './rudolf-chat/rudolf-chat.component';
import { ImageFallbackDirective } from '../../shared/directives/image-fallback.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    ComponentsModule,
    ReactiveFormsModule,
    TranslateModule,
    ImageFallbackDirective,
  ],
  declarations: [HomePage, RudolfChatComponent, UserListComponent],
})
export class HomePageModule {}
