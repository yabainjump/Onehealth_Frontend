import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashbord',
        loadChildren: () =>
          import('./dashbord/dashbord.module').then((m) => m.DashbordPageModule),
      },
      {
        path: 'home',
        loadChildren: () =>
          import('../home/home.module').then((m) => m.HomePageModule),
      },
      {
        path: 'items/:id',
        loadChildren: () => import('./items/items.module').then((m) => m.ItemsPageModule),
      },
      {
        path: 'post-detail/:id',
        loadChildren: () =>
          import('../../post-detail/post-detail.module').then((m) => m.PostDetailPageModule),
      },
      {
        path: 'post/:id',
        loadChildren: () =>
          import('../../post-detail/post-detail.module').then((m) => m.PostDetailPageModule),
      },
      {
        path: 'profils',
        loadChildren: () =>
          import('../../profils/profils.module').then((m) => m.ProfilsPageModule),
      },
      {
        path: 'pushpub',
        loadChildren: () =>
          import('./pushpub/pushpub.module').then((m) => m.PushpubPageModule),
      },
      {
        path: 'edit-post/:id',
        loadComponent: () =>
          import('../edit-post/edit-post.page').then((m) => m.EditPostPage),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('../notifications/notifications.page').then(
            (m) => m.NotificationsPage,
          ),
      },
      {
        path: 'alerts/:id',
        loadComponent: () =>
          import('../alert-detail/alert-detail.page').then(
            (m) => m.AlertDetailPage,
          ),
      },
      {
        path: 'alerts',
        pathMatch: 'full',
        loadComponent: () =>
          import('../alerts/alerts.page').then((m) => m.AlertsPage),
      },
      {
        path: '',
        redirectTo: 'dashbord',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: '/not-found',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
