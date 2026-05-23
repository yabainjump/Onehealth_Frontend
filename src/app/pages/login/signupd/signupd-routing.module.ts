import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SignupdPage } from './signupd.page';

const routes: Routes = [
  {
    path: '',
    component: SignupdPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignupdPageRoutingModule {}
