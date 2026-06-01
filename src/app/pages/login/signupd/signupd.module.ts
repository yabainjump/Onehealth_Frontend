import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { SignupdPageRoutingModule } from './signupd-routing.module';

import { SignupdPage } from './signupd.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignupdPageRoutingModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  declarations: [SignupdPage]
})
export class SignupdPageModule {}
