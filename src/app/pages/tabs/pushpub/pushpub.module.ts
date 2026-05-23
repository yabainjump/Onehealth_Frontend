import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PushpubPageRoutingModule } from './pushpub-routing.module';

import { PushpubPage } from './pushpub.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PushpubPageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [PushpubPage]
})
export class PushpubPageModule {}
