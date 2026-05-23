import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashbordPage } from './dashbord.page';

const routes: Routes = [
  {
    path: '',
    component: DashbordPage,
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashbordPageRoutingModule {}
