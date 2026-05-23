import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProfilsPage } from './profils.page';

const routes: Routes = [
  {
    path: '',
    component: ProfilsPage,
  },
  { path: ':uid', component: ProfilsPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfilsPageRoutingModule {}
