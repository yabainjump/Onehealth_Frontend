import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PushpubPage } from './pushpub.page';

const routes: Routes = [
  {
    path: '',
    component: PushpubPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PushpubPageRoutingModule {}
